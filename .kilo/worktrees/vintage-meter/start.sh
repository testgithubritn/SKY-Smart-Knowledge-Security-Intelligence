#!/bin/bash
# SKY dev server startup script — uses npm (no bun required)
cd /home/z/my-project

# Kill any existing next process
pkill -9 -f "next dev" 2>/dev/null || true
sleep 2

# Start the dev server with npx
export NODE_ENV=development
exec npx next dev -p 3000
