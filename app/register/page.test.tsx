// app/register/page.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RegisterPage from './page';
import { AuthProvider } from '../../context/AuthContext';
import { LanguageProvider } from '../../context/LanguageContext';
import { User } from '../../utils/types';

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

// In-memory fake of utils/localStorage so registerListener's writes and the
// page's duplicate-email lookup share state, mirroring the real collection
// shape without touching actual browser localStorage.
const store = vi.hoisted(() => ({} as Record<string, unknown>));

vi.mock('../../utils/localStorage', () => ({
  getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
  setItem: vi.fn((key: string, value: unknown) => {
    store[key] = value;
  }),
  addRecord: vi.fn((key: string, record: { id: string }) => {
    const arr = (store[key] as { id: string }[] | undefined)?.slice() ?? [];
    arr.push(record);
    store[key] = arr;
  }),
  deleteRecord: vi.fn((key: string, id: string) => {
    store[key] = ((store[key] as { id: string }[] | undefined) || []).filter((r) => r.id !== id);
  }),
  initializeMockDatabase: vi.fn(() => {
    if (!store['users']) {
      store['users'] = [{ id: 'u1', email: 'listener@demo.com', role: 'listener', tier: 'basic' }];
    }
  }),
}));

function renderRegisterPage() {
  return render(
    <LanguageProvider>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </LanguageProvider>
  );
}

function fillListenerForm(
  container: HTMLElement,
  overrides: Partial<Record<string, string>> = {}
) {
  const values = {
    displayName: 'Nova Ray',
    email: 'nova.ray@example.com',
    password: 'secret123',
    confirm: 'secret123',
    birthDate: '2000-01-01',
    gender: 'female',
    ...overrides,
  };
  fireEvent.change(screen.getByLabelText('Display name'), { target: { value: values.displayName } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: values.email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: values.password } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: values.confirm } });
  fireEvent.change(screen.getByLabelText('Birth date'), { target: { value: values.birthDate } });
  if (values.gender) {
    fireEvent.change(screen.getByRole('combobox'), { target: { value: values.gender } });
  }
  const policyCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
  fireEvent.click(policyCheckbox);
}

describe('RegisterPage (listener)', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it('shows required-field errors on empty submit and creates no user', async () => {
    renderRegisterPage();
    await waitFor(() => screen.getByRole('button', { name: 'Create account' }));

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Display name is required.')).toBeDefined();
    expect(screen.getByText('Email is required.')).toBeDefined();
    expect(screen.getByText('Password is required.')).toBeDefined();
    expect(screen.getByText('Please confirm your password.')).toBeDefined();
    expect(screen.getByText('Birth date is required.')).toBeDefined();
    expect(screen.getByText('Please select a gender.')).toBeDefined();
    expect(screen.getByText('You must accept the privacy policy.')).toBeDefined();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('shows an email format error for an invalid email', async () => {
    const { container } = renderRegisterPage();
    await waitFor(() => screen.getByRole('button', { name: 'Create account' }));

    fillListenerForm(container, { email: 'not-an-email' });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Enter a valid email address.')).toBeDefined();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('shows a mismatch error when passwords differ', async () => {
    const { container } = renderRegisterPage();
    await waitFor(() => screen.getByRole('button', { name: 'Create account' }));

    fillListenerForm(container, { confirm: 'different' });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Passwords do not match.')).toBeDefined();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('blocks submit when the privacy policy is not accepted', async () => {
    renderRegisterPage();
    await waitFor(() => screen.getByRole('button', { name: 'Create account' }));

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Nova Ray' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nova.ray@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText('Birth date'), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'female' } });
    // deliberately not checking the privacy policy checkbox

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('You must accept the privacy policy.')).toBeDefined();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('opens the privacy policy modal and closes it', async () => {
    renderRegisterPage();
    await waitFor(() => screen.getByRole('button', { name: 'Create account' }));

    fireEvent.click(screen.getByText('privacy policy'));
    expect(screen.getByText('Privacy policy')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Privacy policy')).toBeNull();
  });

  it('rejects a duplicate email and creates no extra record', async () => {
    const { container } = renderRegisterPage();
    await waitFor(() => screen.getByRole('button', { name: 'Create account' }));

    const usersBefore = (store['users'] as User[] | undefined) || [];
    const countBefore = usersBefore.length;

    fillListenerForm(container, { email: 'listener@demo.com' });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('An account with this email already exists.')).toBeDefined();
    expect(pushMock).not.toHaveBeenCalled();
    const usersAfter = (store['users'] as User[] | undefined) || [];
    expect(usersAfter.length).toBe(countBefore);
  });

  it('registers a new listener with a system-assigned username and redirects home', async () => {
    const { container } = renderRegisterPage();
    await waitFor(() => screen.getByRole('button', { name: 'Create account' }));

    fillListenerForm(container);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/home'));

    const users = (store['users'] as User[] | undefined) || [];
    const created = users.find((u) => u.email === 'nova.ray@example.com');
    expect(created).toBeDefined();
    expect(created?.displayName).toBe('Nova Ray');
    expect(created?.username).toBeTruthy();
    expect(created?.username).not.toBe(created?.displayName);
    expect(created?.birthDate).toBe('2000-01-01');
    expect(created?.gender).toBe('female');
    expect(created?.role).toBe('listener');
    expect(created?.tier).toBe('basic');

    const current = store['currentUser'] as User | undefined;
    expect(current?.email).toBe('nova.ray@example.com');
  });
});
