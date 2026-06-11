#!/bin/bash
trap "" SIGHUP
trap "" SIGPIPE
cd /home/z/my-project
while true; do
  npx next start -p 3000 -H 0.0.0.0 2>&1
  echo "[$(date)] Server exited, restarting in 3s..." 
  sleep 3
done
