#!/bin/bash
echo "Starting Eden Garden Backend with Docker..."
docker compose up --build -d
echo "Backend is starting in the background!"
echo "You can now launch the Electron app."
