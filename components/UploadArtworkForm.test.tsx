// components/UploadArtworkForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import UploadArtworkForm from './UploadArtworkForm';
import { LanguageProvider } from '../context/LanguageContext';
import * as localStorageUtils from '../utils/localStorage';
import * as authUtils from '../utils/auth';

vi.mock('../utils/localStorage', () => ({
  addRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock('../utils/auth', () => ({
  getCurrentUser: vi.fn(),
}));

function makeFile(name: string, type: string) {
  return new File(['dummy content'], name, { type });
}

function renderForm() {
  return render(
    <LanguageProvider>
      <UploadArtworkForm />
    </LanguageProvider>
  );
}

describe('UploadArtworkForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('alert', vi.fn());
    (authUtils.getCurrentUser as any).mockReturnValue({ id: 'a1', role: 'artist', stageName: 'Nova' });
  });

  afterEach(() => {
    cleanup();
  });

  it('submits with the real logged-in artist id and an audio file', async () => {
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'Test Song' } });
    fireEvent.change(screen.getByPlaceholderText('Genre'), { target: { value: 'Jazz' } });
    fireEvent.change(screen.getByPlaceholderText('Year'), { target: { value: '2026' } });

    const audioInput = screen.getByLabelText(/Audio file/i) as HTMLInputElement;
    fireEvent.change(audioInput, { target: { files: [makeFile('track.mp3', 'audio/mpeg')] } });

    fireEvent.click(screen.getByText('Submit artwork'));

    await waitFor(() => {
      expect(localStorageUtils.addRecord).toHaveBeenCalledWith(
        'songs',
        expect.objectContaining({ title: 'Test Song', artistId: 'a1', genre: 'Jazz', year: 2026 })
      );
    });
  });

  it('blocks submission without an audio file', () => {
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'No Audio' } });
    fireEvent.click(screen.getByText('Submit artwork'));

    expect(screen.getByText(/audio file.*is required/i)).toBeDefined();
    expect(localStorageUtils.addRecord).not.toHaveBeenCalled();
  });

  it('rejects an unsupported audio file type', () => {
    renderForm();

    const audioInput = screen.getByLabelText(/Audio file/i) as HTMLInputElement;
    fireEvent.change(audioInput, { target: { files: [makeFile('track.ogg', 'audio/ogg')] } });

    expect(screen.getByText(/must be MP3, WAV, or FLAC/i)).toBeDefined();
  });

  it('blocks submission without a title', () => {
    renderForm();

    const audioInput = screen.getByLabelText(/Audio file/i) as HTMLInputElement;
    fireEvent.change(audioInput, { target: { files: [makeFile('track.mp3', 'audio/mpeg')] } });
    fireEvent.click(screen.getByText('Submit artwork'));

    expect(screen.getByText(/Title is required/i)).toBeDefined();
    expect(localStorageUtils.addRecord).not.toHaveBeenCalled();
  });

  it('blocks submission for a non-artist user', () => {
    (authUtils.getCurrentUser as any).mockReturnValue({ id: 'u1', role: 'listener' });
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'Test' } });
    const audioInput = screen.getByLabelText(/Audio file/i) as HTMLInputElement;
    fireEvent.change(audioInput, { target: { files: [makeFile('track.mp3', 'audio/mpeg')] } });
    fireEvent.click(screen.getByText('Submit artwork'));

    expect(screen.getByText(/Only approved artists can upload/i)).toBeDefined();
    expect(localStorageUtils.addRecord).not.toHaveBeenCalled();
  });

  // The two release-type radios are unlabelled inputs inside their <label>;
  // clicking the label text does not toggle them in this DOM, so reach for
  // the input itself.
  const albumRadio = () =>
    document.querySelectorAll('input[type="radio"]')[1] as HTMLInputElement;

  it("offers only the artist's own albums once the album release type is picked", async () => {
    (localStorageUtils.getItem as any).mockReturnValue([
      { id: 'album1', title: 'Skyline Echoes', artistId: 'a1', releaseYear: 2024 },
      { id: 'album2', title: 'Not Mine', artistId: 'a2', releaseYear: 2023 },
    ]);
    renderForm();

    // The selector is irrelevant to a single, so it stays hidden.
    expect(screen.queryByRole('combobox')).toBeNull();
    fireEvent.click(albumRadio());

    await waitFor(() => expect(screen.getByRole('combobox')).toBeDefined());
    expect(screen.getByRole('option', { name: 'Skyline Echoes' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Not Mine' })).toBeNull();
  });

  it('files a new track into the selected album', async () => {
    (localStorageUtils.getItem as any).mockReturnValue([
      { id: 'album1', title: 'Skyline Echoes', artistId: 'a1', releaseYear: 2024 },
    ]);
    renderForm();

    fireEvent.click(albumRadio());
    await waitFor(() => expect(screen.getByRole('combobox')).toBeDefined());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'album1' } });

    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'Album Cut' } });
    const audioInput = screen.getByLabelText(/Audio file/i) as HTMLInputElement;
    fireEvent.change(audioInput, { target: { files: [makeFile('track.mp3', 'audio/mpeg')] } });
    fireEvent.click(screen.getByText('Submit artwork'));

    await waitFor(() => {
      expect(localStorageUtils.addRecord).toHaveBeenCalledWith(
        'songs',
        expect.objectContaining({ title: 'Album Cut', albumId: 'album1', releaseType: 'album_track' })
      );
    });
  });

  it('parses collaborators into an array', async () => {
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'Collab Song' } });
    fireEvent.change(screen.getByPlaceholderText(/Collaborators/i), { target: { value: 'Echo Drift, Nova Ray' } });
    const audioInput = screen.getByLabelText(/Audio file/i) as HTMLInputElement;
    fireEvent.change(audioInput, { target: { files: [makeFile('track.mp3', 'audio/mpeg')] } });
    fireEvent.click(screen.getByText('Submit artwork'));

    await waitFor(() => {
      expect(localStorageUtils.addRecord).toHaveBeenCalledWith(
        'songs',
        expect.objectContaining({ collaborators: ['Echo Drift', 'Nova Ray'] })
      );
    });
  });
});
