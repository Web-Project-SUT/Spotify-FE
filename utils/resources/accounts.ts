// utils/resources/accounts.ts
//
// Account self-service that isn't part of the auth context: password reset.
// Both endpoints exist on the backend (auth/password-reset/ and .../confirm/).
// With the backend off, these resolve to a simulated success so the mock demo
// keeps its existing "check your email" UX.
import { apiEnabled, apiFetch, API_BASE_URL } from '../api';

// Always resolves (the backend returns 204 whether or not the email exists,
// which is the correct anti-enumeration behaviour — we mirror it).
export async function requestPasswordReset(email: string): Promise<void> {
  if (apiEnabled) {
    await apiFetch('/auth/password-reset/', { method: 'POST', auth: false, body: { email } });
    return;
  }
  // Mock: pretend to send.
  await new Promise((r) => setTimeout(r, 400));
}

export interface ResetConfirmResult {
  ok: boolean;
  error?: string;
}

export async function confirmPasswordReset(
  uid: string,
  token: string,
  newPassword: string
): Promise<ResetConfirmResult> {
  if (!apiEnabled) {
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true };
  }
  try {
    // apiFetch collapses 204 and error responses both to null, so use a raw
    // fetch here to tell a successful reset (2xx) from a bad/expired token.
    const res = await fetch(`${API_BASE_URL}/auth/password-reset/confirm/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, token, newPassword }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: 'This reset link is invalid or has expired.' };
  } catch {
    return { ok: false, error: 'Could not reach the server. Please try again.' };
  }
}
