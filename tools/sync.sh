#!/bin/sh
# Copy this checkout's engine/ into a game repo's engine/ folder and record the version.
# Usage: tools/sync.sh path/to/game-repo
set -e
here=$(cd "$(dirname "$0")/.." && pwd)
game=${1:?usage: tools/sync.sh path/to/game-repo}
[ -f "$game/index.html" ] || { echo "no index.html in $game" >&2; exit 1; }
rm -rf "$game/engine"
cp -R "$here/engine" "$game/engine"
cp "$here/VERSION" "$game/engine/VERSION"
echo "Kombat Engine $(cat "$here/VERSION") copied into $game/engine"
echo "Bump the ?v= cache stamps in $game/index.html, test, then commit."
