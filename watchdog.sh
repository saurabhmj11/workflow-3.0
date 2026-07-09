#!/bin/bash
while true; do
  cd /home/z/my-project
  PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js >> /tmp/openworkflow-server.log 2>&1
  echo "[$(date)] Server exited, restarting in 3s..." >> /tmp/openworkflow-server.log
  sleep 3
done
