// app/group/page.test.tsx
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import GroupPage from './page';
import { LanguageProvider } from '../../context/LanguageContext';

let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

vi.mock('../../components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/GroupSession', () => ({
  default: ({ inviteId }: { inviteId?: string }) => (
    <div data-testid="group-session">invite:{inviteId ?? 'none'}</div>
  ),
}));

function renderPage() {
  return render(
    <LanguageProvider>
      <GroupPage />
    </LanguageProvider>
  );
}

describe('GroupPage', () => {
  afterEach(() => {
    searchParams = new URLSearchParams();
    cleanup();
  });

  it('passes no inviteId when the URL has none', () => {
    renderPage();
    expect(screen.getByTestId('group-session').textContent).toBe('invite:none');
  });

  it('reads ?invite= and passes it through to GroupSession', () => {
    searchParams = new URLSearchParams('invite=room-xyz');
    renderPage();
    expect(screen.getByTestId('group-session').textContent).toBe('invite:room-xyz');
  });
});
