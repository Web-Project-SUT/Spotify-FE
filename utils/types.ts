// utils/types.ts

export type Role = 'listener' | 'artist' | 'gold' | 'admin';
export type Status = 'active' | 'pending' | 'suspended';

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
  albumId?: string;
  cover?: string;
  plays?: number;
  url?: string;
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
  title: string;
  userId: string;
  songIds: string[];
  isPublic?: boolean;
}