// utils/follow.ts
// Single source of truth for follow/unfollow writes. Both UserProfile and
// ArtistProfile call this so the follower-count + following-list mutation
// rule lives in one place instead of being re-derived per component.
//
// In API mode the edge lives in the backend's Follow table
// (POST|DELETE /users/{id}/follow/) and the returned counts are optimistic —
// the authoritative numbers come back on the next profile read. In mock mode
// this keeps writing both sides into the `users` collection exactly as it
// always has.

import { apiEnabled, apiRequest } from './api';
import { updateRecord } from './localStorage';
import { User } from './types';

export interface FollowResult {
  isFollowing: boolean;
  followers: number;
  following: string[];
}

// Toggles whether `viewer` follows `targetId`. `currentlyFollowing` is passed
// in rather than derived from `viewer.following`, because in API mode the
// viewer's following list is never loaded into the client — the server
// answers that question on the profile payload (`isFollowing`).
export const toggleFollow = async (
  viewer: User,
  targetId: string,
  targetFollowers: number,
  currentlyFollowing: boolean
): Promise<FollowResult> => {
  const willFollow = !currentlyFollowing;

  const followers = willFollow
    ? targetFollowers + 1
    : Math.max(0, targetFollowers - 1);

  const existing = viewer.following || [];
  const following = willFollow
    ? [...existing, targetId]
    : existing.filter((id) => id !== targetId);

  if (apiEnabled) {
    const { error } = await apiRequest(`/users/${targetId}/follow/`, {
      method: willFollow ? 'POST' : 'DELETE',
    });
    // A rejected write must not leave the button showing the other state.
    if (error) return { isFollowing: currentlyFollowing, followers: targetFollowers, following: existing };
    return { isFollowing: willFollow, followers, following };
  }

  updateRecord('users', targetId, { followers });
  updateRecord('users', viewer.id, { following });

  return { isFollowing: willFollow, followers, following };
};
