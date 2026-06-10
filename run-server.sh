#!/bin/bash
trap "" SIGHUP
trap "" SIGPIPE
cd /home/z/my-project
while true; do
  npx next dev -p 3000 -H 0.0.0.0 2>&1 | tee -a /tmp/ow-server.log
  echo "[$(date)] Server exited, restarting in 3s..." >> /tmp/ow-server.log
  sleep 3
done
