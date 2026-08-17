// components/TrackEditForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TrackEditForm from './TrackEditForm';
import { LanguageProvider } from '../context/LanguageContext';
import * as localStorageUtils from '../utils/localStorage';
import { Album, Song } from '../utils/types';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  addRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
}));

const track: Song = {
  id: 'song1',
  title: 'Neon Skyline',
  artistId: 'a1',
  cover: '🎵',
  plays: 10,
  genre: 'Synth-pop',
  year: 2024,
  lyrics: 'City lights',
  collaborators: ['Echo Drift'],
  releaseType: 'single',
};

const albums: Album[] = [
  { id: 'album1', title: 'Skyline Echoes', artistId: 'a1', releaseYear: 2024 },
];

function renderForm(overrides: Partial<React.ComponentProps<typeof TrackEditForm>> = {}) {
  const onSaved = vi.fn();
  const onCancel = vi.fn();
  render(
    <LanguageProvider>
      <TrackEditForm track={track} albums={albums} onSaved={onSaved} onCancel={onCancel} {...overrides} />
    </LanguageProvider>
  );
  return { onSaved, onCancel };
}

describe('TrackEditForm', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("prefills every editable field from the track's current values", () => {
    renderForm();
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Neon Skyline');
    expect((screen.getByLabelText('Genre') as HTMLInputElement).value).toBe('Synth-pop');
    expect((screen.getByLabelText('Year') as HTMLInputElement).value).toBe('2024');
    expect((screen.getByLabelText('Lyrics') as HTMLTextAreaElement).value).toBe('City lights');
    expect((screen.getByLabelText(/Collaborators/i) as HTMLInputElement).value).toBe('Echo Drift');
  });

  it('saves edited metadata and reports the updated track back', async () => {
    const { onSaved } = renderForm();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Neon Skyline (Remix)' } });
    fireEvent.change(screen.getByLabelText(/Collaborators/i), { target: { value: 'Echo Drift, Nova Ray' } });
    fireEvent.click(screen.getByText('Save changes'));

    await waitFor(() => {
      expect(localStorageUtils.updateRecord).toHaveBeenCalledWith(
        'songs',
        'song1',
        expect.objectContaining({
          title: 'Neon Skyline (Remix)',
          collaborators: ['Echo Drift', 'Nova Ray'],
        })
      );
    });
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'song1', title: 'Neon Skyline (Remix)' })
    );
  });

  it('moving a track into an album flips its release type', async () => {
    const { onSaved } = renderForm();

    fireEvent.change(screen.getByLabelText('Album'), { target: { value: 'album1' } });
    fireEvent.click(screen.getByText('Save changes'));

    await waitFor(() => {
      expect(localStorageUtils.updateRecord).toHaveBeenCalledWith(
        'songs',
        'song1',
        expect.objectContaining({ albumId: 'album1', releaseType: 'album_track' })
      );
    });
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ albumId: 'album1', releaseType: 'album_track' })
    );
  });

  it('refuses to save an empty title', () => {
    const { onSaved } = renderForm();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Save changes'));

    expect(screen.getByText(/Title is required/i)).toBeDefined();
    expect(localStorageUtils.updateRecord).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('rejects an unsupported replacement audio file type', () => {
    renderForm();
    const input = screen.getByLabelText(/Replace audio file/i) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'track.ogg', { type: 'audio/ogg' })] },
    });
    expect(screen.getByText(/must be MP3, WAV, or FLAC/i)).toBeDefined();
  });

  it('cancels without touching the store', () => {
    const { onCancel } = renderForm();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
    expect(localStorageUtils.updateRecord).not.toHaveBeenCalled();
  });
});
