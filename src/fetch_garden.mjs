// 栽培（植木鉢）で取れる物（LandSandBoat sql/gardening_results.sql・GPLv3）→ data/garden.json
// 種の種類と、与えたクリスタル（属性）の組み合わせごとの取れる品。元のデータの重み（出やすさ）と数は遊んで確かめる物なので載せない
// 組み合わせの決まり（src/map/utils/gardenutils.cpp・items/item_flowerpot.cpp）：
//   果物の種・サボテンの茎・木の挿し木・木の苗は2回与える（1回目＝element2、2回目＝element1）。ほかの種は1回だけ（element1）。0は与えない
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const RAW = 'https://raw.githubusercontent.com/LandSandBoat/server/base/';
// 通信が一時的に切れることがあるので、3回まで待って取り直す
const get = async f => { for (let i = 0; ; i++) { try { const r = await fetch(RAW + f); return r.ok ? await r.text() : ''; } catch (e) { if (i >= 3) throw e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); } } };

// 植木鉢の植物の番号 → 種のアイテム番号（item_flowerpot.cpp getPlantFromSeed）
const SEED = { 1: 574, 2: 572, 3: 575, 4: 573, 5: 1236, 6: 1237, 7: 1238, 8: 2235 };
const TREE = new Set([1, 5, 6, 7]);

const src = await get('sql/gardening_results.sql');
const by = new Map();
for (const m of src.matchAll(/^INSERT INTO `gardening_results` VALUES \(\d+,(\d+),(\d+),(\d+),(\d+),\d+,\d+,\d+\)/gm)) {
  const [p, e1, e2, item] = [1, 2, 3, 4].map(i => Number(m[i]));
  if (!SEED[p]) continue;
  // 与える順に並べる（木は [1回目, 2回目]、ほかは [1回]）
  const feed = TREE.has(p) ? [e2, e1] : [e1];
  const k = p + '|' + feed.join(',');
  if (!by.has(k)) by.set(k, { seed: SEED[p], tree: TREE.has(p), feed, items: [] });
  const g = by.get(k); if (!g.items.includes(item)) g.items.push(item);
}
const garden = [...by.values()].sort((a, b) => a.seed - b.seed || a.feed.join() .localeCompare(b.feed.join()));
if (garden.length > 50) fs.writeFileSync(path.join(DATA, 'garden.json'), JSON.stringify({ source: 'https://github.com/LandSandBoat/server (sql/gardening_results.sql)', license: 'GPL-3.0', garden }));
console.log('栽培', garden.length, '通り', new Set(garden.flatMap(g => g.items)).size, '品');
