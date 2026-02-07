#!/usr/bin/env bash
# Start the UnClutter backend on port 5001.
# Usage: ./run.sh   or   bash run.sh
cd "$(dirname "$0")"
echo "Starting backend at http://localhost:5001 ..."
flask --app app run -p 5001
