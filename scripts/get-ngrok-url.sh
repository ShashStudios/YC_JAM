#!/bin/bash

# Wait for ngrok to start
sleep 3

# Try to get URL from ngrok API
URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[a-z0-9\-]*\.ngrok-free\.app' | head -1)

if [ -z "$URL" ]; then
    echo "❌ Could not get ngrok URL automatically"
    echo "📋 Please visit http://localhost:4040 in your browser"
    echo "📋 Copy the 'Forwarding' URL (the https one)"
    echo ""
    echo "Or run: curl -s http://localhost:4040/api/tunnels"
else
    echo "✅ ngrok URL: $URL"
    echo ""
    echo "Your local app (http://localhost:3002) is now accessible at:"
    echo "🌐 $URL"
fi

