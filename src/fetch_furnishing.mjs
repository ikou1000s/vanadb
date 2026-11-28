// 調度品（モグハウスに置く家具）の属性・属性値・ストレージの増え方・モグハンス・置き方・大きさ
// （LandSandBoat sql/item_furnishing.sql・GPLv3）→ data/furnishing.json
// 1行＝品番・名前・ストレージ＋・モグハンス番号・属性（1火〜8闇）・属性値・置き方（0床 1台 2壁 3台の上）・横・奥・高さ
// 属性は元のファイルの @ELEM_◯◯ を読み、番号の意味は同じファイルの SET 行で確かめる
// モグハンスの番号の意味は src/map/items/item_furnishing.h の MOGHANCEMENT_TYPE（512〜542）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const RAW = 'https://raw.githubusercontent.com/LandSandBoat/server/base/';
const get = async f => { for (let i = 0; ; i++) { try { const r = await fetch(RAW + f); return r.ok ? await r.text() : ''; } catch (e) { if (i >= 3) throw e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); } } };

const src = await get('sql/item_furnishing.sql');
const vars = {};
for (const m of src.matchAll(/^SET @(\w+)\s*=\s*(\d+);/gm)) vars[m[1]] = Number(m[2]);
const ok = vars.ELEM_FIRE === 1 && vars.ELEM_DARK === 8 && vars.FURN_PLACE_FLOOR === 0 && vars.FURN_PLACE_WALL === 2;
const val = s => /^@/.test(s) ? vars[s.slice(1)] : Number(s);
const by = new Map(); let bad = 0;
for (const m of src.matchAll(/^INSERT INTO `item_furnishing` VALUES \((\d+),'[^']*',([^)]*)\);/gm)) {
  const v = m[2].split(',').map(s => val(s.trim()));
  if (v.length !== 8 || v.some(x => !Number.isFinite(x))) { bad++; continue; }
  by.set(Number(m[1]), v); // [storage, moghancement, element, aura, placement, x, y, height]
}
// モグハンスの番号の意味（ヘッダーから読む。読めた番号だけ使う）
const h = await get('src/map/items/item_furnishing.h');
const mog = {};
for (const m of h.matchAll(/\b((?:MEGA_)?MOG(?:HANCEMENT|LIFICATION)_\w+)\s*=\s*(\d+)/g)) mog[m[2]] = m[1];
const list = [...by.entries()].sort((a, b) => a[0] - b[0]).map(([id, v]) => [id, ...v]);
if (ok && list.length > 200 && !bad) fs.writeFileSync(path.join(DATA, 'furnishing.json'), JSON.stringify({ source: 'https://github.com/LandSandBoat/server (sql/item_furnishing.sql, src/map/items/item_furnishing.h)', license: 'GPL-3.0', cols: ['item', 'storage', 'moghancement', 'element', 'aura', 'placement', 'x', 'y', 'height'], mog, list }));
console.log('調度品', list.length, '品', '読めない行', bad, '番号の確かめ', ok ? 'OK' : 'NG', 'モグハンス', Object.keys(mog).length, '種');
