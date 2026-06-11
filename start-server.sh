#!/bin/bash
# Start script for OpenWorkflow production server
# Ignores SIGHUP to persist after terminal closes
trap '' SIGHUP
trap '' SIGPIPE
cd /home/z/my-project
exec npx next start -p 3000 -H 0.0.0.0
