// 出入り口の座標から、屋外・街のエリアの位置を計算し、つながっている塊（大陸）ごとにまとめる
import fs from 'node:fs'; import { readLua } from './lua.mjs';
const ZL = JSON.parse(fs.readFileSync('zl.json'));
const idOf = {}; for (const m of fs.readFileSync('zone.yaml', 'utf8').matchAll(/^\s+([a-z0-9_]+):\s+(\d+)/gm)) idOf[m[1]] = Number(m[2]);
const maps = JSON.parse(fs.readFileSync(process.argv[2]));
const mapZ = new Set(maps.map(x => x[1]));
const Z = readLua(process.argv[3]);
const ok = n => { const z = ZL[n]; return z && /outdoors|city/.test(z.type) && mapZ.has(idOf[n]); };
// 辺：A→B（A の from と B の at の差＝ B の原点の位置のずれ）
const edges = [];
for (const [a, z] of Object.entries(ZL)) if (ok(a)) for (const l of z.lines) if (ok(l.to)) edges.push([a, l.to, l.from[0] - l.at[0], l.from[2] - l.at[2], l.from]);
const adj = new Map(); for (const [a, b, dx, dz] of edges) { (adj.get(a) || adj.set(a, []).get(a)).push([b, dx, dz]); (adj.get(b) || adj.set(b, []).get(b)).push([a, -dx, -dz]); }
const pos = new Map(), comps = [];
for (const s of adj.keys()) {
  if (pos.has(s)) continue; const comp = [s]; pos.set(s, [0, 0]); const q = [s];
  while (q.length) { const a = q.shift(); const [ax, az] = pos.get(a); for (const [b, dx, dz] of adj.get(a)) if (!pos.has(b)) { pos.set(b, [ax + dx, az + dz]); comp.push(b); q.push(b); } }
  comps.push(comp);
}
// 各エリアの広さ：出入り口の座標の範囲
const ext = n => { const p = []; for (const l of ZL[n].lines) p.push(l.from); for (const [a, z] of Object.entries(ZL)) for (const l of z.lines) if (l.to === n) p.push(l.at); const xs = p.map(v => v[0]), zs = p.map(v => v[2]); return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]; };
const res = comps.sort((a, b) => b.length - a.length).map(c => c.map(n => { const [ox, oz] = pos.get(n); const [x0, x1, z0, z1] = ext(n); return { n, id: idOf[n], ja: (Z.get(idOf[n]) || {}).ja, x: ox + (x0 + x1) / 2, z: oz + (z0 + z1) / 2, w: Math.max(x1 - x0, z1 - z0, 300), city: /city/.test(ZL[n].type) }; }));
const links = edges.map(([a, b]) => [idOf[a], idOf[b]]);
fs.writeFileSync('world.json', JSON.stringify({ comps: res, links }));
console.log(res.map(c => c.length + ':' + c.slice(0, 4).map(z => z.ja).join('・')).join('\n'));
