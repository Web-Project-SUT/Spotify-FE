// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom', // استفاده از محیط شبیه‌ساز مرورگر برای تست‌های فرانت‌اند
  },
});