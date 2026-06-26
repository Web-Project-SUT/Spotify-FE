#!/usr/bin/env bash
set -e
BRANCHES="feat/types-and-auth feat/gold-early-access fix/top-songs-row feat/notifications feat/playlist-manager feat/artist-profile feat/advanced-player-features feat/artist-management feat/admin-dashboard feat/recommendation-engine feat/group-session feat/page-integration"
for b in $BRANCHES; do
  echo "Pushing $b ..."
  git push -u origin "$b"
done
echo "Done. Open PRs starting with feat/types-and-auth."
