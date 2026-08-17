// utils/resources/groupSocket.ts
//
// Real-time group-listening sync (bonus). Connects to the backend Channels
// consumer at ws/session/<id>/ and relays {action, progress} events so
// play/pause/seek propagate across devices. Only used when the backend is
// enabled; in mock mode the component falls back to cross-tab localStorage
// sync and never constructs a socket.
import { apiEnabled, getAccessToken } from '../api';

export type SessionAction = 'play' | 'pause' | 'seek';
export interface SessionEvent {
  action: SessionAction;
  progress: number;
  trackId?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Derive the ws(s):// origin from the http(s) API URL, dropping the /api
// path. The consumer requires auth (apps/common/consumers.py), and the
// browser WebSocket API can't set an Authorization header, so the access
// token travels as a query param instead.
function sessionUrl(sessionId: string): string {
  const origin = API_URL.replace(/\/api\/?$/, '').replace(/^http/, 'ws');
  const token = getAccessToken();
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${origin}/ws/session/${sessionId}/${query}`;
}

export interface GroupSocket {
  send: (event: SessionEvent) => void;
  close: () => void;
}

// Opens a socket and invokes onEvent for each broadcast. Returns null when
// the backend is disabled or the environment has no WebSocket (e.g. tests).
export function openGroupSocket(
  sessionId: string,
  onEvent: (event: SessionEvent) => void
): GroupSocket | null {
  if (!apiEnabled || typeof WebSocket === 'undefined') return null;

  let ws: WebSocket | null = null;
  try {
    ws = new WebSocket(sessionUrl(sessionId));
  } catch {
    return null;
  }

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as SessionEvent;
      if (data && data.action) onEvent(data);
    } catch {
      /* ignore malformed frames */
    }
  };

  return {
    send: (event) => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
    },
    close: () => {
      if (ws) ws.close();
    },
  };
}
