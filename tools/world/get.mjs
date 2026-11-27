// 各エリアの zone.yaml から、種類（屋外・街・ダンジョン）と出入り口（どこから→どのエリアのどこへ）を集める
import fs from 'node:fs';
const paths = fs.readFileSync('paths.txt', 'utf8').split(/\r?\n/).filter(Boolean);
const out = {};
let i = 0;
async function one(p) {
  const name = p.split('/')[2];
  const t = await (await fetch('https://raw.githubusercontent.com/LandSandBoat/server/base/' + p)).text();
  const type = (/^type:\s*\[(.*)\]/m.exec(t) || [])[1] || '';
  const lines = [];
  const zl = t.indexOf('\nzonelines:'); if (zl >= 0) {
    const sec = t.slice(zl + 1).replace(/\r/g, '').split(/\n(?=[a-z_]+:)/)[0];
    for (const m of sec.matchAll(/from:\s*\[([^\]]*)\]\s*\n\s*to:\s*([a-z0-9_]+)\s*\n\s*at:\s*\[([^\]]*)\]/g)) lines.push({ from: m[1].split(',').map(Number), to: m[2], at: m[3].split(',').map(Number) });
  }
  out[name] = { type, lines };
}
const q = [...paths]; await Promise.all(Array.from({ length: 8 }, async () => { while (q.length) { await one(q.shift()); i++; } }));
fs.writeFileSync('zl.json', JSON.stringify(out)); console.log(Object.keys(out).length, Object.values(out).reduce((a, z) => a + z.lines.length, 0));
