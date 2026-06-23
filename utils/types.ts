// utils/types.ts

// --- Enums & Basic Types ---
export type Role = 'listener' | 'artist' | 'gold' | 'admin';
export type Status = 'active' | 'pending' | 'suspended';

// --- Interfaces ---

export interface User {
  id: string;
  email: string;
  password?: string;
  role: Role;
  status?: Status;
  stageName?: string;
  portfolio?: string;
  bio?: string;
  followers?: number;
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
// utils/types.ts
export interface RevenueData {
  month: string;
  amount: number;
}