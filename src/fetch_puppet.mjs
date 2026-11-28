// オートマトンのヘッド・フレーム・アタッチメントの属性の容量
// （LandSandBoat sql/item_puppet.sql・GPLv3）→ data/puppet.json
// 1行＝品番・名前・部位（1ヘッド 2フレーム 3アタッチメント）・属性（4ビットずつ、下から火 氷 風 土 雷 水 光 闇）
// 属性の並びはサーバーのコード（src/map/utils/puppetutils.cpp の (getElementSlots() >> (element * 4)) & 0xF と
// FireManeuver からの番号）で確かめた
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const RAW = 'https://raw.githubusercontent.com/LandSandBoat/server/base/';
const get = async f => { for (let i = 0; ; i++) { try { const r = await fetch(RAW + f); return r.ok ? await r.text() : ''; } catch (e) { if (i >= 3) throw e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); } } };

const src = await get('sql/item_puppet.sql');
const list = []; let bad = 0;
for (const m of src.matchAll(/^INSERT INTO `item_puppet` VALUES \((\d+),'[^']*',(\d+),(\d+)\);/gm)) {
  const slot = Number(m[2]), e = Number(m[3]);
  if (slot < 1 || slot > 3) { bad++; continue; }
  list.push([Number(m[1]), slot, ...Array.from({ length: 8 }, (_, i) => Math.floor(e / 16 ** i) % 16)]);
}
list.sort((a, b) => a[0] - b[0]);
// 確かめ：ストロボ（8449）は火1、マナブースター（8481）は氷2
const chk = id => (list.find(x => x[0] === id) || []).slice(2).join('');
const ok = chk(8449) === '10000000' && chk(8481) === '02000000';
if (ok && list.length > 80 && !bad) fs.writeFileSync(path.join(DATA, 'puppet.json'), JSON.stringify({ source: 'https://github.com/LandSandBoat/server (sql/item_puppet.sql, src/map/utils/puppetutils.cpp)', license: 'GPL-3.0', cols: ['item', 'slot', 'fire', 'ice', 'wind', 'earth', 'thunder', 'water', 'light', 'dark'], list }));
console.log('オートマトンの部品', list.length, '品', '読めない行', bad, '属性の確かめ', ok ? 'OK' : 'NG');
