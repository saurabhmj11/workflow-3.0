const { spawn } = require('child_process');
const fs = require('fs');

const log = fs.createWriteStream('/tmp/openworkflow-dev.log', { flags: 'w' });

function startServer() {
  log.write('Starting Next.js dev server...\n');
  const child = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '0.0.0.0'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
    log.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
    log.write(data);
  });

  child.on('exit', (code, signal) => {
    log.write(`Server exited with code ${code}, signal ${signal}. Restarting in 5s...\n`);
    setTimeout(startServer, 5000);
  });
}

process.on('SIGTERM', () => { log.write('Received SIGTERM\n'); process.exit(0); });
process.on('SIGHUP', () => { log.write('Received SIGHUP - ignoring\n'); });
process.on('SIGINT', () => { log.write('Received SIGINT\n'); process.exit(0); });

startServer();
