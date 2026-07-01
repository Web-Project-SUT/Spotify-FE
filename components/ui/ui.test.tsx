// components/ui/ui.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Button, Input, Badge, Avatar, EmptyState, Spinner } from './index';

afterEach(cleanup);

describe('UI primitives', () => {
  it('Button renders and handles clicks', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalled();
  });

  it('Button respects disabled', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Nope</Button>);
    fireEvent.click(screen.getByText('Nope'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('Input shows a label and an error', () => {
    render(<Input label="Email" name="email" error="Required" />);
    expect(screen.getByText('Email')).toBeDefined();
    expect(screen.getByText('Required')).toBeDefined();
  });

  it('Badge renders its tone content', () => {
    render(<Badge tone="gold">Gold</Badge>);
    expect(screen.getByText('Gold')).toBeDefined();
  });

  it('Avatar falls back to initials when no image is given', () => {
    render(<Avatar name="Nova Ray" />);
    expect(screen.getByText('NR')).toBeDefined();
  });

  it('Avatar renders an emoji avatar', () => {
    render(<Avatar src="🎤" name="Nova" />);
    expect(screen.getByText('🎤')).toBeDefined();
  });

  it('EmptyState renders title, description, and action', () => {
    render(<EmptyState title="Nothing here" description="Add something" action={<button>Add</button>} />);
    expect(screen.getByText('Nothing here')).toBeDefined();
    expect(screen.getByText('Add something')).toBeDefined();
    expect(screen.getByText('Add')).toBeDefined();
  });

  it('Spinner exposes a status role and accessible label', () => {
    render(<Spinner label="Loading tracks…" />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Loading tracks…')).toBeDefined();
  });

  it('Spinner applies a custom size', () => {
    const { container } = render(<Spinner size={48} />);
    const ring = container.querySelector('span.animate-spin') as HTMLElement;
    expect(ring).not.toBeNull();
    expect(ring.style.width).toBe('48px');
    expect(ring.style.height).toBe('48px');
  });
});
