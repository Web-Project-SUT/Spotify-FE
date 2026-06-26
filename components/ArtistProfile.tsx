// components/ArtistProfile.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { getItem, updateRecord } from '../utils/localStorage';
import { User, Song, Album } from '../utils/types';
import { isGoldUser, getCurrentUser } from '../utils/auth';

interface ArtistProfileProps {
  artistId: string;
}

export default function ArtistProfile({ artistId }: ArtistProfileProps) {
  const [artist, setArtist] = useState<User | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isGold, setIsGold] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const users: User[] = getItem('users') || [];
    const allSongs: Song[] = getItem('songs') || [];
    const allAlbums: Album[] = getItem('albums') || [];
    const user = getCurrentUser();

    setCurrentUser(user);
    setIsGold(isGoldUser(user));
    setIsFollowing(!!user?.following?.includes(artistId));

    const foundArtist = users.find((u) => u.id === artistId && u.role === 'artist');
    if (foundArtist) setArtist(foundArtist);

    setSongs(allSongs.filter((s) => s.artistId === artistId));
    setAlbums(allAlbums.filter((a) => a.artistId === artistId));
  }, [artistId]);

  const handleFollowToggle = () => {
    if (!artist || !currentUser) return;

    const willFollow = !isFollowing;
    setIsFollowing(willFollow);

    const newFollowers = willFollow
      ? (artist.followers || 0) + 1
      : Math.max(0, (artist.followers || 0) - 1);
    const updatedArtist = { ...artist, followers: newFollowers };
    setArtist(updatedArtist);
    updateRecord('users', artist.id, { followers: newFollowers });

    // Track the relationship on the follower's record too, so it
    // persists correctly per-user instead of just a global counter.
    const existingFollowing = currentUser.following || [];
    const updatedFollowing = willFollow
      ? [...existingFollowing, artistId]
      : existingFollowing.filter((id) => id !== artistId);
    const updatedCurrentUser = { ...currentUser, following: updatedFollowing };
    setCurrentUser(updatedCurrentUser);
    updateRecord('users', currentUser.id, { following: updatedFollowing });
  };

  if (!artist) {
    return <div className="p-10 text-white font-bold text-center">Loading artist profile...</div>;
  }

  // Gold insights are derived from this artist's real song data rather
  // than hardcoded placeholder numbers.
  const totalStreams = songs.reduce((sum, s) => sum + (s.streamCount || 0), 0);
  const totalListeners = songs.reduce((sum, s) => sum + (s.listenerCount || 0), 0);
  const topSong = [...songs].sort((a, b) => (b.streamCount || 0) - (a.streamCount || 0))[0];

  return (
    <div className="bg-gray-900 min-h-screen text-white pb-10">
      <div className="bg-gradient-to-b from-indigo-900 to-gray-900 p-10 flex items-end gap-6 h-72">
        <div className="w-40 h-40 bg-indigo-500 rounded-full flex items-center justify-center text-7xl shadow-2xl border-4 border-gray-900">
          {artist.cover || '👤'}
        </div>
        <div>
          {artist.status === 'active' && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400 text-xl" title="Verified">☑️</span>
              <span className="text-sm uppercase font-bold tracking-widest text-gray-300">Verified artist</span>
            </div>
          )}
          <h1 className="text-6xl font-extrabold my-2 tracking-tight">{artist.stageName || 'Unknown'}</h1>
          <p className="text-gray-300 font-medium text-lg mt-4">
            {artist.followers ? artist.followers.toLocaleString() : '0'} monthly listeners
          </p>
        </div>
      </div>

      <div className="px-10 mt-6 flex items-center gap-4">
        <button
          onClick={handleFollowToggle}
          className={`px-8 py-2 rounded-full font-bold text-sm tracking-wide transition-all ${isFollowing ? 'border border-gray-500 text-white hover:border-white' : 'bg-white text-black hover:scale-105'}`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>

      <div className="px-10 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-2xl font-bold mb-6">Popular singles</h2>
            {songs.length > 0 ? (
              <div className="space-y-2">
                {songs.map((song, index) => (
                  <div key={song.id} className="flex items-center justify-between p-3 hover:bg-gray-800 rounded-lg group transition cursor-pointer">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 w-6 text-right font-medium">{index + 1}</span>
                      <span className="font-semibold text-white group-hover:text-blue-400 transition">{song.title}</span>
                    </div>
                    <span className="text-gray-400 text-sm">
                      {song.plays ? song.plays.toLocaleString() : '0'} plays
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No singles released yet.</p>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6">Albums</h2>
            {albums.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {albums.map((album) => (
                  <div key={album.id} className="bg-gray-800/50 p-4 rounded-xl hover:bg-gray-800 transition cursor-pointer">
                    <div className="w-full aspect-square bg-gray-700 rounded-lg mb-4 flex items-center justify-center text-5xl shadow-md">
                      {album.cover || '💿'}
                    </div>
                    <h3 className="font-bold text-white truncate text-lg">{album.title}</h3>
                    <p className="text-gray-400 text-sm mt-1">{album.releaseYear}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No albums released yet.</p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-gray-800/50 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-4 text-white">About</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              {artist.bio || 'Biography not available.'}
            </p>
          </section>

          {isGold && (
            <section className="bg-gradient-to-br from-yellow-900/40 to-black border border-yellow-600/50 p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-yellow-500 text-xl">🌟</span>
                <h2 className="text-xl font-bold text-yellow-500">Gold insights</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-yellow-800/30 pb-2">
                  <span className="text-gray-400 text-sm">Total streams</span>
                  <span className="font-bold text-white tracking-wide">{totalStreams.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-yellow-800/30 pb-2">
                  <span className="text-gray-400 text-sm">Total listeners</span>
                  <span className="font-bold text-white tracking-wide">{totalListeners.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-gray-400 text-sm">Top track</span>
                  <span className="font-bold text-white tracking-wide">{topSong ? topSong.title : 'N/A'}</span>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
