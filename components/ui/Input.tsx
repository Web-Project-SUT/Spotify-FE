// components/ui/Input.tsx
'use client';
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-bold mb-1 text-white">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full bg-surface-2 border border-border rounded px-3 py-2 text-white placeholder-muted focus:outline-none focus:border-white transition-colors ${error ? 'border-danger' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  );
}
