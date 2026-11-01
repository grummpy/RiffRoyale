#!/bin/bash
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  exec python3 server.py
fi
echo "Python 3 is required to launch Riff Royale."
echo "Install Python 3 (for example, the python3 package from your distro), then run this script again."
exit 1
