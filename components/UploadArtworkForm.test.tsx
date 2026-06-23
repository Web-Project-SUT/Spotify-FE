import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UploadArtworkForm from './UploadArtworkForm';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  addRecord: vi.fn(),
}));
describe('UploadArtworkForm', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn()); // این خط ارور alert را حل می‌کند
  });

  it('submits form with user input and calls addRecord', () => {
    render(<UploadArtworkForm />);
    
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'Test Song' } });
    fireEvent.change(screen.getByPlaceholderText('Genre'), { target: { value: 'Jazz' } });
    fireEvent.change(screen.getByPlaceholderText('Year'), { target: { value: '2026' } });
    
    fireEvent.click(screen.getByText('Submit Artwork'));
    
    expect(localStorageUtils.addRecord).toHaveBeenCalled();
  });
});