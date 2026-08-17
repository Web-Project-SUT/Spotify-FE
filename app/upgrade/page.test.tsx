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
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', role: 'listener', tier: 'basic' },
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
