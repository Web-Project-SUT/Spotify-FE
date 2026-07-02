// utils/types.ts

// --- Enums & Basic Types ---
// Role and subscription Tier are separate axes per the project spec:
// a listener, artist, support agent, or admin each have their own role,
// and listeners additionally carry a subscription tier independent of role.
export type Role = 'listener' | 'artist' | 'support' | 'admin';
export type Tier = 'basic' | 'silver' | 'gold';
export type Status = 'active' | 'pending' | 'suspended';
export type Gender = 'male' | 'female' | 'other';

// --- Interfaces ---

export interface User {
  id: string;
  email: string;
  password?: string;
  role: Role;
  tier?: Tier; // only meaningful for role === 'listener'
  status?: Status;
  stageName?: string; // artist-only display name
  displayName?: string; // listener's chosen name; distinct from system-assigned username
  username?: string; // system-assigned handle, e.g. 'nova_ray_8f3k'
  birthDate?: string; // ISO yyyy-mm-dd from the <input type="date">
  gender?: Gender; // omitted when "prefer not to say"
  portfolio?: string;
  bio?: string;
  followers?: number;
  following?: string[]; // ids of artists/users this user follows
  cover?: string;
}

export interface Song {
  id: string;
  title: string;
  artistId: string;
  cover: string;
  plays: number;
  lyrics?: string;
  streamCount?: number;
  listenerCount?: number;
  earnings?: number;
  genre?: string;
  year?: number;
  collaborators?: string[];
  releaseType?: 'single' | 'album';
  audioFileName?: string; // mock-only; phase 2 replaces this with a real uploaded asset path
  audioUrlHigh?: string; // Optional
  audioUrlLow?: string;  // Optional
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  cover?: string;
  releaseYear?: number;
}

export interface Playlist {
  id: string;
  userId: string;
  title: string;
  songIds: string[];
  isPublic?: boolean;
  lastPlayedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'subscription' | 'release' | 'approval' | 'support';
  isRead: boolean;
  createdAt: string;
}
export interface Payout {
  id: string;
  artistId: string;
  artistName: string;
  listeners: number;
  streams: number;
  amount: number;
  status: 'paid' | 'pending';
}

export interface RevenueData {
  month: string;
  amount: number;
}


export interface GroupSessionData {
  id: string;
  hostId: string;
  members: string[];
  isPlaying: boolean;
  progress: number;
  currentSongId?: string;
}

// Dynamic pricing set by admins; never hardcoded in components.
export interface SubscriptionPrices {
  silver: number;
  gold: number;
}