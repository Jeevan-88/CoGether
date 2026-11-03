/**
 * WSL TCP Bridge
 * Transparently forwards local Windows ports to WSL2 services (PostgreSQL 16 & Redis 7)
 * over inter-process pipes, completely bypassing Hyper-V virtual switch firewall restrictions.
 */

const net = require('net');
const { spawn } = require('child_process');

let pgBridge = null;
let redisBridge = null;

function ensureWslBridge() {
  if (process.platform !== 'win32') {
    return { pgPort: 5432, redisPort: 6379 };
  }

  if (!pgBridge) {
    try {
      pgBridge = net.createServer((clientSocket) => {
        const proc = spawn('wsl', ['-e', 'nc', '127.0.0.1', '5432']);
        clientSocket.pipe(proc.stdin);
        proc.stdout.pipe(clientSocket);
        proc.on('error', () => clientSocket.destroy());
        clientSocket.on('error', () => proc.kill());
        clientSocket.on('close', () => proc.kill());
      });
      pgBridge.on('error', (err) => {
        // Port already in use by another local process running the bridge - ignore
      });
      pgBridge.unref();
      pgBridge.listen(5433, '127.0.0.1');
    } catch (_e) {}
  }

  if (!redisBridge) {
    try {
      redisBridge = net.createServer((clientSocket) => {
        const proc = spawn('wsl', ['-e', 'nc', '127.0.0.1', '6379']);
        clientSocket.pipe(proc.stdin);
        proc.stdout.pipe(clientSocket);
        proc.on('error', () => clientSocket.destroy());
        clientSocket.on('error', () => proc.kill());
        clientSocket.on('close', () => proc.kill());
      });
      redisBridge.on('error', (err) => {
        // Port already in use by another local process running the bridge - ignore
      });
      redisBridge.unref();
      redisBridge.listen(6381, '127.0.0.1');
    } catch (_e) {}
  }

  return { pgPort: 5433, redisPort: 6381 };
}

module.exports = { ensureWslBridge };
