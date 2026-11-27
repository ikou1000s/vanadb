// out/*.png を配り、POST /save/<名前> で受けた WebP を webp/ に保存する（地図の変換用・手元だけ）
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.argv[2];
http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (q.method === 'POST' && u.startsWith('/save/')) {
    const n = u.slice(6).replace(/[^\w]/g, ''); const ch = [];
    q.on('data', c => ch.push(c)); q.on('end', () => { fs.writeFileSync(path.join(root, 'webp', n + '.webp'), Buffer.concat(ch)); r.writeHead(200, { 'Access-Control-Allow-Origin': '*' }); r.end('ok'); });
    return;
  }
  const f = path.join(root, u === '/' ? 'conv.html' : u);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.png') ? 'image/png' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); });
}).listen(8766);
