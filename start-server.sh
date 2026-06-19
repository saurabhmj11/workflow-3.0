#!/bin/bash
trap '' SIGHUP
trap '' SIGPIPE
trap '' SIGTERM
cd /home/z/my-project
exec npx next start -p 3000 -H 0.0.0.0
