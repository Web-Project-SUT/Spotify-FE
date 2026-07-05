// components/LatestAlbumsRow.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import LatestAlbumsRow from './LatestAlbumsRow';
import { LanguageProvider } from '../context/LanguageContext';
import * as ls from '../utils/localStorage';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock('../utils/localStorage', () => ({ getItem: vi.fn(), setItem: vi.fn() }));

function renderRow() {
  return render(
    <LanguageProvider>
      <LatestAlbumsRow />
    </LanguageProvider>
  );
}

const ALBUMS = [
  { id: 'a1', title: 'Skyline Echoes', artistId: 'u1', releaseYear: 2024, cover: '' },
  { id: 'a2', title: 'Drift', artistId: 'u2', releaseYear: 2023, cover: '' },
];
const USERS = [
  { id: 'u1', role: 'artist', stageName: 'Nova Ray' },
  { id: 'u2', role: 'artist', stageName: 'Echo Drift' },
];

function mockData(albums = ALBUMS, users = USERS) {
  (ls.getItem as any).mockImplementation((key: string) => {
    if (key === 'albums') return albums;
    if (key === 'users') return users;
    return null;
  });
}

describe('LatestAlbumsRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it('renders album cards with title and resolved artist name', async () => {
    mockData();
    renderRow();
    await waitFor(() => expect(screen.getByText('Skyline Echoes')).toBeDefined());
    expect(screen.getByText('Nova Ray')).toBeDefined();
    expect(screen.getByText('Drift')).toBeDefined();
    expect(screen.getByText('Echo Drift')).toBeDefined();
  });

  it('orders albums latest-first by releaseYear', async () => {
    mockData();
    renderRow();
    await waitFor(() => expect(screen.getByText('Skyline Echoes')).toBeDefined());
    const titles = screen.getAllByText(/Skyline Echoes|Drift/).map((el) => el.textContent);
    expect(titles[0]).toBe('Skyline Echoes');
    expect(titles[1]).toBe('Drift');
  });

  it('clicking a card navigates to /album/<id>', async () => {
    mockData();
    renderRow();
    await waitFor(() => expect(screen.getByText('Skyline Echoes')).toBeDefined());
    fireEvent.click(screen.getByText('Skyline Echoes'));
    expect(pushMock).toHaveBeenCalledWith('/album/a1');
  });

  it('clicking the artist name navigates to /artist/<id> and does not navigate to the album', async () => {
    mockData();
    renderRow();
    await waitFor(() => expect(screen.getByText('Nova Ray')).toBeDefined());
    pushMock.mockClear();
    fireEvent.click(screen.getByText('Nova Ray'));
    expect(pushMock).toHaveBeenCalledWith('/artist/u1');
    expect(pushMock).not.toHaveBeenCalledWith('/album/a1');
  });

  it('renders an empty state when there are no albums', async () => {
    mockData([], USERS);
    renderRow();
    await waitFor(() => expect(screen.getByText('No albums yet')).toBeDefined());
  });
});
