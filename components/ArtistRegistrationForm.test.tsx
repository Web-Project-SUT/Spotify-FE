// components/ArtistRegistrationForm.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArtistRegistrationForm from './ArtistRegistrationForm';
import * as localStorageUtils from '../utils/localStorage';

// Mock the localStorage utility functions so we can monitor them
vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

describe('Artist Registration Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should submit the form and save the artist with pending status', () => {
    // Mock getItem to simulate an empty existing users array
    (localStorageUtils.getItem as any).mockReturnValue([]);

    render(<ArtistRegistrationForm />);

    // Fill out the input fields
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'artist@test.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'securePass123' } });
    fireEvent.change(screen.getByLabelText(/Stage Name/i), { target: { value: 'DJ Phantom' } });
    fireEvent.change(screen.getByLabelText(/Portfolio Link/i), { target: { value: 'https://phantom.com' } });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    // Assert 1: The success message should be displayed
    expect(screen.getByText(/Registration successful/i)).toBeDefined();

    // Assert 2: setItem should be called with the correct user role and status
    expect(localStorageUtils.setItem).toHaveBeenCalledWith(
      'users',
      expect.arrayContaining([
        expect.objectContaining({
          email: 'artist@test.com',
          stageName: 'DJ Phantom',
          role: 'artist', // Must be artist
          status: 'pending', // Must be pending approval
        }),
      ])
    );
  });
});