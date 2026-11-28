// ギルドポイント（ギルドに納品すると貰える点数）（LandSandBoat sql/guild_item_points.sql・GPLv3）→ data/guildpoints.json
// 1行＝ギルド・品・位・1個の点数・その日の上限・日替わりの組（0〜7。ギルドが求める品は日ごとにこの組で替わる）
// ギルドの番号（0釣り〜8調理）は元のファイルの見出し「-- Fishing / Amateur」から読んで確かめる
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const RAW = 'https://raw.githubusercontent.com/LandSandBoat/server/base/';
// 通信が一時的に切れることがあるので、3回まで待って取り直す
const get = async f => { for (let i = 0; ; i++) { try { const r = await fetch(RAW + f); return r.ok ? await r.text() : ''; } catch (e) { if (i >= 3) throw e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); } } };

const EN = ['Fishing', 'Woodworking', 'Blacksmithing', 'Goldsmithing', 'Clothcraft', 'Leathercraft', 'Bonecraft', 'Alchemy', 'Cooking'];
const src = await get('sql/guild_item_points.sql');
let head = null; const bad = [];
const rows = [];
for (const line of src.split('\n')) {
  const h = line.match(/^-- (\w+) \/ \w+/); if (h) { head = EN.indexOf(h[1]); continue; }
  const m = line.match(/^INSERT INTO `guild_item_points` VALUES \((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/); if (!m) continue;
  const [g, item, rank, pts, max, pat] = m.slice(1).map(Number);
  if (head !== g) bad.push(line.slice(0, 80));
  if (pts > 0) rows.push([g, item, rank, pts, max, pat]);
}
if (bad.length) console.log('ギルドの見出しと番号が合わない行', bad.length, bad[0]);
// 品ごと・ギルドごと・位ごとにまとめる（点数と上限は同じ組なら同じ。日替わりの組の数を数える）
const by = new Map();
for (const [g, item, rank, pts, max, pat] of rows) {
  const k = g + '|' + item + '|' + rank;
  if (!by.has(k)) by.set(k, { g, item, rank, pts, max, pats: [] });
  const x = by.get(k); x.pts = Math.max(x.pts, pts); x.max = Math.max(x.max, max); if (!x.pats.includes(pat)) x.pats.push(pat);
}
const list = [...by.values()].map(x => [x.g, x.item, x.rank, x.pts, x.max, x.pats.length]).sort((a, b) => a[0] - b[0] || a[2] - b[2] || a[1] - b[1]);
if (list.length > 100 && !bad.length) fs.writeFileSync(path.join(DATA, 'guildpoints.json'), JSON.stringify({ source: 'https://github.com/LandSandBoat/server (sql/guild_item_points.sql)', license: 'GPL-3.0', cols: ['guild', 'item', 'rank', 'points', 'max', 'days'], list }));
console.log('ギルドポイント', list.length, '件', new Set(list.map(x => x[1])).size, '品');
