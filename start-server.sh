#!/bin/bash
# Start script for OpenWorkflow dev server
# Ignores SIGHUP to persist after terminal closes
trap '' SIGHUP
cd /home/z/my-project
exec npx next dev -p 3000 -H 0.0.0.0 --webpack
