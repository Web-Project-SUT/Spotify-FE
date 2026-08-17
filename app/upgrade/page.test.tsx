// app/upgrade/page.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import UpgradePage from './page';
import { LanguageProvider } from '../../context/LanguageContext';

const pushMock = vi.fn();
const replaceMock = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => searchParams,
}));

vi.mock('../../components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const refreshMeMock = vi.fn();
let authUser: Record<string, unknown> = { id: 'u1', role: 'listener', tier: 'basic' };
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: authUser,
    refreshMe: refreshMeMock,
  }),
}));

const startPaymentMock = vi.fn();
const applyMockUpgradeMock = vi.fn();
vi.mock('../../utils/resources/subscriptions', () => ({
  loadPlans: () =>
    Promise.resolve([
      { id: 'silver-1', tier: 'silver', monthlyPrice: 4.99 },
      { id: 'gold-1', tier: 'gold', monthlyPrice: 9.99 },
    ]),
  startPayment: (...args: unknown[]) => startPaymentMock(...args),
  applyMockUpgrade: (...args: unknown[]) => applyMockUpgradeMock(...args),
}));

function renderPage() {
  return render(
    <LanguageProvider>
      <UpgradePage />
    </LanguageProvider>
  );
}

describe('UpgradePage period selector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
    authUser = { id: 'u1', role: 'listener', tier: 'basic' };
  });
  afterEach(() => cleanup());

  it('defaults to a 1-month period with no total line shown', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'gold' })).toBeDefined());
    expect(screen.queryByText(/Total:/)).toBeNull();
  });

  it('selecting a longer period shows the computed total', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'gold' })).toBeDefined());

    fireEvent.click(screen.getByText('12 mo'));

    await waitFor(() => expect(screen.getByText('Total: $119.88')).toBeDefined());
  });

  it('subscribing sends the selected period to startPayment', async () => {
    startPaymentMock.mockResolvedValue('https://sandbox.zarinpal.com/pg/StartPay/A1');
    renderPage();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'gold' })).toBeDefined());

    fireEvent.click(screen.getByText('6 mo'));
    const subscribeButtons = screen.getAllByText('Subscribe');
    fireEvent.click(subscribeButtons[1]); // gold card

    await waitFor(() => expect(startPaymentMock).toHaveBeenCalledWith('gold-1', 6));
  });
});

// doc.tex §3.2 requires renewal: a subscriber must be able to extend the plan
// they already have, so the active plan's card offers "Renew" rather than a
// dead "Current plan" button.
describe('UpgradePage renewal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
    authUser = {
      id: 'u1',
      role: 'listener',
      tier: 'silver',
      subscriptionExpiresAt: '2026-12-31T00:00:00Z',
    };
  });
  afterEach(() => cleanup());

  it('shows when the active subscription expires', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'gold' })).toBeDefined());

    expect(screen.getByText(/Expires on/)).toBeDefined();
  });

  it('offers a renew action on the active plan instead of a disabled button', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'silver' })).toBeDefined());

    const renew = screen.getByRole('button', { name: 'Renew' });
    expect((renew as HTMLButtonElement).disabled).toBe(false);
  });

  it('renewing sends the current plan and the selected period to startPayment', async () => {
    startPaymentMock.mockResolvedValue('https://sandbox.zarinpal.com/pg/StartPay/A2');
    renderPage();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'silver' })).toBeDefined());

    fireEvent.click(screen.getByText('3 mo'));
    fireEvent.click(screen.getByRole('button', { name: 'Renew' }));

    await waitFor(() => expect(startPaymentMock).toHaveBeenCalledWith('silver-1', 3));
  });

  it('hides the expiry line for a user with no subscription', async () => {
    authUser = { id: 'u1', role: 'listener', tier: 'basic' };
    renderPage();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'gold' })).toBeDefined());

    expect(screen.queryByText(/Expires on/)).toBeNull();
  });
});
