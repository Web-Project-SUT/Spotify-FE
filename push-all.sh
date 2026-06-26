#!/usr/bin/env bash
set -e
BRANCHES="
feat/types-and-auth
feat/gold-early-access
fix/top-songs-row
feat/notifications
feat/playlist-manager
feat/artist-profile
feat/advanced-player-features
feat/artist-management
feat/admin-dashboard
feat/recommendation-engine
feat/group-session
feat/page-integration
feat/design-system
feat/auth-and-routing
feat/home-layout
feat/albums-browse
feat/player-controls
feat/settings-and-profile
feat/support-dashboard
feat/price-control
feat/pwa
feat/full-app
"
for b in $BRANCHES; do
  echo "Pushing $b ..."
  git push -u origin "$b"
done
echo "Done. Start by merging feat/types-and-auth, or just merge feat/full-app for the finished app."
