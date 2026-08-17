// app/register/page.api.test.tsx
//
// The mock-mode suite in page.test.tsx never sets NEXT_PUBLIC_API_URL, so it
// exercises the localStorage path only. These cover the API path, where a
// rejected signup used to silently fall back to the mock and still report
// success ("Application pending" on a 400).
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

const store = vi.hoisted(() => ({}) as Record<string, unknown>);
const addRecord = vi.hoisted(() => vi.fn());

vi.mock('../../utils/localStorage', () => ({
  getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
  setItem: vi.fn((key: string, value: unknown) => {
    store[key] = value;
  }),
  addRecord,
  deleteRecord: vi.fn(),
  initializeMockDatabase: vi.fn(),
}));

function rejection(fields: Record<string, string[]>, detail = 'Invalid input.') {
  return {
    ok: false,
    status: 400,
    statusText: 'Bad Request',
    json: async () => ({ detail, code: 'invalid', fields }),
  };
}

async function renderPage() {
  const { AuthProvider } = await import('../../context/AuthContext');
  const { default: RegisterPage } = await import('./page');
  return render(
    <AuthProvider>
      <RegisterPage />
    </AuthProvider>
  );
}

function fillArtistForm() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nova@demo.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText('Stage name'), { target: { value: 'Nova Ray' } });
}

describe('RegisterPage — API mode', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    Object.keys(store).forEach((k) => delete store[k]);
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not claim "Application pending" when the backend rejects the artist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(rejection({ email: ['A user with this email already exists.'] }))
    );
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Artist' }));

    fillArtistForm();
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => screen.getByText('A user with this email already exists.'));
    expect(screen.queryByText('Application pending')).toBeNull();
    // …and no phantom local artist was written.
    expect(addRecord).not.toHaveBeenCalled();
  });

  it('surfaces a password rejection on the artist form', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          rejection({ password: ['Ensure this field has at least 8 characters.'] })
        )
    );
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Artist' }));

    fillArtistForm();
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => screen.getByText('Ensure this field has at least 8 characters.'));
    expect(screen.queryByText('Application pending')).toBeNull();
  });

  it('falls back to the error detail when the rejection names no field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ detail: 'Service temporarily unavailable.', code: 'unavailable' }),
      })
    );
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Artist' }));

    fillArtistForm();
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => screen.getByText('Service temporarily unavailable.'));
    expect(screen.queryByText('Application pending')).toBeNull();
  });

  it('shows "Application pending" once the backend accepts the application', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          user: {
            id: 'a1',
            email: 'nova@demo.com',
            username: 'nova_ray_1',
            displayName: 'Nova Ray',
            role: 'artist',
            status: 'pending',
            tier: 'basic',
            bio: '',
            avatar: null,
            birthDate: null,
            gender: '',
            preferences: {},
            subscription: null,
          },
        }),
      })
    );
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Artist' }));

    fillArtistForm();
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => screen.getByText('Application pending'));
  });

  it('does not navigate home when the backend rejects a listener signup', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(rejection({ email: ['A user with this email already exists.'] }))
    );
    const { container } = await renderPage();

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Nova' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taken@demo.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Birth date'), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'female' } });
    fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLInputElement);

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => screen.getByText('A user with this email already exists.'));
    expect(pushMock).not.toHaveBeenCalled();
    expect(addRecord).not.toHaveBeenCalled();
  });

  it('lets the backend judge duplicate emails rather than the mock store', async () => {
    // The seeded mock `users` collection is not the real roster: checking it
    // client-side rejected free addresses and missed taken ones.
    store['users'] = [{ id: 'u1', email: 'taken@demo.com', role: 'listener' }];
    const fetchMock = vi
      .fn()
      .mockResolvedValue(rejection({ email: ['A user with this email already exists.'] }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = await renderPage();

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Nova' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taken@demo.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Birth date'), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'female' } });
    fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLInputElement);

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe('http://backend.test/api/auth/register/listener/');
  });
});
