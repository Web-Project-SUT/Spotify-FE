// utils/follow.ts
// Single source of truth for follow/unfollow writes. Both UserProfile and
// ArtistProfile call this so the follower-count + following-list mutation
// rule lives in one place instead of being re-derived per component.

import { updateRecord } from './localStorage';
import { User } from './types';

export interface FollowResult {
  isFollowing: boolean;
  followers: number;
  following: string[];
}

// Toggles whether `viewer` follows `targetId`. Persists both the target's
// follower count and the viewer's following[] to the `users` collection,
// and returns the new values so callers can update local state.
export const toggleFollow = (
  viewer: User,
  targetId: string,
  targetFollowers: number
): FollowResult => {
  const currentlyFollowing = !!viewer.following?.includes(targetId);
  const willFollow = !currentlyFollowing;

  const followers = willFollow
    ? targetFollowers + 1
    : Math.max(0, targetFollowers - 1);

  const existing = viewer.following || [];
  const following = willFollow
    ? [...existing, targetId]
    : existing.filter((id) => id !== targetId);

  updateRecord('users', targetId, { followers });
  updateRecord('users', viewer.id, { following });

  return { isFollowing: willFollow, followers, following };
};
