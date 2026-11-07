#!/bin/zsh
cd "$(dirname "$0")" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! command -v npm >/dev/null 2>&1; then
  echo 'Install Node.js 24 from https://nodejs.org, then open this launcher again.'
  read '?Press Return to close.'
  exit 1
fi
if [[ ! -d node_modules ]]; then
  npm ci || exit 1
fi
echo ''
echo '🪔 Diwali Party Royale — keep this window open'
echo 'Open http://localhost:3000/host on your laptop.'
echo 'Keep all phones on the same Wi-Fi and scan the host QR.'
echo 'Press Control-C here when the party is over.'
echo ''
export WATCHPACK_POLLING=true
npm run dev
