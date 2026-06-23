// components/GroupSession.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GroupSession from './GroupSession';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

describe('GroupSession', () => {
  it('creates a group and displays session info', () => {
    render(<GroupSession />);
    const createBtn = screen.getByText('Create Group');
    fireEvent.click(createBtn);
    expect(screen.getByText(/Session ID:/i)).toBeDefined();
  });
});