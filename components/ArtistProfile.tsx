// components/ArtistProfile.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { getItem, updateRecord } from '../utils/localStorage';
import { User, Song, Album } from '../utils/types';

interface ArtistProfileProps {
  artistId: string;
}

export default function ArtistProfile({ artistId }: ArtistProfileProps) {
  const [artist, setArtist] = useState<User | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isGoldUser, setIsGoldUser] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    // Fetch data from local storage
    const users: User[] = getItem('users') || [];
    const allSongs: Song[] = getItem('songs') || [];
    const allAlbums: Album[] = getItem('albums') || [];
    const currentUser: User | null = getItem('currentUser');

    // Verify if the active user has a gold subscription
    if (currentUser && currentUser.role === 'gold') {
      setIsGoldUser(true);
    }

    // Locate the artist profile
    const foundArtist = users.find(u => u.id === artistId && u.role === 'artist');
    if (foundArtist) {
      setArtist(foundArtist);
    }

    // Retrieve artist's specific tracks and albums
    setSongs(allSongs.filter(s => s.artistId === artistId));
    setAlbums(allAlbums.filter(a => a.artistId === artistId));
  }, [artistId]);

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
    if (artist) {
      // Adjust the follower count based on the action
      const newFollowers = isFollowing 
        ? Math.max(0, (artist.followers || 0) - 1) 
        : (artist.followers || 0) + 1;
        
      // Update the UI state instantly
      const updatedArtist = { ...artist, followers: newFollowers };
      setArtist(updatedArtist);
      
      // Persist the new follower count to the mock database
      updateRecord('users', artist.id, { followers: newFollowers });
    }
  };

  if (!artist) {
    return <div className="p-10 text-white font-bold text-center">Loading Artist Profile...</div>;
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white pb-10">
      {/* Header Section with Verified Badge */}
      <div className="bg-gradient-to-b from-indigo-900 to-gray-900 p-10 flex items-end gap-6 h-72">
        <div className="w-40 h-40 bg-indigo-500 rounded-full flex items-center justify-center text-7xl shadow-2xl border-4 border-gray-900">
          {artist.cover || '👤'}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400 text-xl" title="Verified">☑️</span>
            <span className="text-sm uppercase font-bold tracking-widest text-gray-300">Verified Artist</span>
          </div>
          <h1 className="text-6xl font-extrabold my-2 tracking-tight">{artist.stageName || 'Unknown'}</h1>
          <p className="text-gray-300 font-medium text-lg mt-4">
            {artist.followers ? artist.followers.toLocaleString() : '0'} monthly listeners
          </p>
        </div>
      </div>

      {/* Follow / Unfollow Action */}
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
          
          {/* Singles List */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Popular Singles</h2>
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

          {/* Albums List */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Albums</h2>
            {albums.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {albums.map(album => (
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

        {/* Sidebar: Bio & Gold Statistics */}
        <div className="space-y-6">
          <section className="bg-gray-800/50 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-4 text-white">About</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              {artist.bio || 'Biography not available.'}
            </p>
          </section>

          {/* Exclusive Gold Stats visible only to gold subscribers */}
          {isGoldUser && (
            <section className="bg-gradient-to-br from-yellow-900/40 to-black border border-yellow-600/50 p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-yellow-500 text-xl">🌟</span>
                <h2 className="text-xl font-bold text-yellow-500">Gold Insights</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-yellow-800/30 pb-2">
                  <span className="text-gray-400 text-sm">Profile Views</span>
                  <span className="font-bold text-white tracking-wide">84,200</span>
                </div>
                <div className="flex justify-between border-b border-yellow-800/30 pb-2">
                  <span className="text-gray-400 text-sm">Save Rate</span>
                  <span className="font-bold text-white tracking-wide">12.4%</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-gray-400 text-sm">Top Region</span>
                  <span className="font-bold text-white tracking-wide">Europe</span>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}