const { spawn } = require('node:child_process');
const path = require('node:path');

const root = __dirname;
const server = spawn(process.execPath, [path.join(root, 'server.js')], {
  cwd: root,
  env: { ...process.env, PORT: '3000' },
  stdio: 'inherit',
});
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const vite = spawn(process.execPath, [viteCli, '--host', '0.0.0.0', '--port', '5173', '--strictPort'], {
  cwd: root,
  stdio: 'inherit',
});
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  server.kill();
  vite.kill();
  process.exitCode = code;
}
server.on('exit', code => { if (!stopping && code !== 0) stop(code || 1); });
vite.on('exit', code => { if (!stopping && code !== 0) stop(code || 1); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(0));
console.log('Starting the game API on port 3000 and the React app on port 5173.');
