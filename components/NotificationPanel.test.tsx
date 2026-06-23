// components/NotificationPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NotificationPanel from './NotificationPanel';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

describe('NotificationPanel', () => {
  it('renders notifications and handles mark as read', () => {
    (localStorageUtils.getItem as any).mockReturnValue([
      { id: '1', title: 'Test Notif', isRead: false }
    ]);
    render(<NotificationPanel />);
    expect(screen.getByText('Test Notif')).toBeDefined();
    
    const readBtn = screen.getByText('Read');
    fireEvent.click(readBtn);
    expect(localStorageUtils.setItem).toHaveBeenCalled();
  });
});