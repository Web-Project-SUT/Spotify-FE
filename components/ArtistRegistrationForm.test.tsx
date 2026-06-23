// components/ArtistRegistrationForm.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ArtistRegistrationForm from './ArtistRegistrationForm';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  addRecord: vi.fn(),
}));

describe('Artist Registration Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should switch between listener and artist tabs', () => {
    render(<ArtistRegistrationForm />);
    
    expect(screen.queryByLabelText(/Stage Name/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Artist/i }));
    expect(screen.getByLabelText(/Stage Name/i)).toBeDefined();
    expect(screen.getByLabelText(/Upload Sample Work/i)).toBeDefined();
  });

  it('should submit artist form and show pending state screen', () => {
    render(<ArtistRegistrationForm />);
    
    fireEvent.click(screen.getByRole('button', { name: /Artist/i }));

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'art@test.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pass123' } });
    fireEvent.change(screen.getByLabelText(/Stage Name/i), { target: { value: 'DJ Cool' } });
    fireEvent.change(screen.getByLabelText(/Portfolio URL/i), { target: { value: 'https://dj.com' } });
    
    const file = new File(['audio'], 'track.mp3', { type: 'audio/mp3' });
    const fileInput = screen.getByLabelText(/Upload Sample Work/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // 🚀 این بخش تغییر کرد: فرم را مستقیماً سابمیت می‌کنیم
    const form = screen.getByRole('button', { name: /Submit Artist Application/i }).closest('form');
    fireEvent.submit(form!);

    expect(localStorageUtils.addRecord).toHaveBeenCalledWith('users', expect.objectContaining({
      email: 'art@test.com',
      role: 'artist',
      status: 'pending',
      stageName: 'DJ Cool'
    }));

    expect(screen.getByText(/Application Submitted!/i)).toBeDefined();
    expect(screen.getByText(/Pending Review/i)).toBeDefined();
  });
});