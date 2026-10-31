import { spawn } from 'node:child_process';
import path from 'node:path';
const children=[
  spawn(process.execPath,['apps/api/src/server.js'],{stdio:'inherit',shell:false}),
  spawn(process.execPath,[path.resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1'],{stdio:'inherit',shell:false,cwd:path.resolve('apps/web')})
];
const stop=()=>children.forEach(child=>child.kill());
process.on('SIGINT',stop);process.on('SIGTERM',stop);
await Promise.all(children.map(child=>new Promise(resolve=>child.on('exit',resolve))));
