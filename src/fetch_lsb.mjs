// LandSandBoat（GPLv3）の表から：NPCへの売値・Rare/Ex/競売の印、釣り（魚・場所・エサ・竿）→ data/lsb.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const RAW = 'https://raw.githubusercontent.com/LandSandBoat/server/base/sql/';
const get = async f => { const r = await fetch(RAW + f + '.sql'); if (!r.ok) throw new Error(`${f}: ${r.status}`); return r.text(); };
// INSERT INTO `t` VALUES (...); の行を配列に（'…' と数値と @記号の式）
const rows = t => [...t.matchAll(/^INSERT INTO `\w+` VALUES \((.*)\);/gm)].map(m => {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < m[1].length; i++) {
    const c = m[1][i];
    if (q) { if (c === '\\') { cur += m[1][++i]; } else if (c === "'") q = false; else cur += c; }
    else if (c === "'") q = true;
    else if (c === ',') { out.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
});

const out = { sell: {}, flags: {}, fish: [], rods: [] };
for (const r of rows(await get('item_basic'))) {
  const id = Number(r[0]); const fl = r[7] || ''; const sell = Number(r[9]);
  if (sell > 0) out.sell[id] = sell;
  const f = (fl.includes('FLAG_RARE') ? 'R' : '') + (fl.includes('FLAG_EX') ? 'E' : '') + (fl.includes('FLAG_NOAUCTION') ? 'N' : '');
  if (f) out.flags[id] = f;
}
// 釣り
const fishRows = rows(await get('fishing_fish'));
const groups = new Map(); for (const [g, fish, rar] of rows(await get('fishing_group'))) { if (!groups.has(g)) groups.set(g, []); groups.get(g).push([Number(fish), Number(rar)]); }
const areaName = new Map(); for (const r of rows(await get('fishing_area'))) areaName.set(`${r[0]}:${r[1]}`, (r[2] || '').replace(/_/g, ' '));
const where = new Map();
for (const [z, a, g] of rows(await get('fishing_catch'))) for (const [fish] of groups.get(g) || []) {
  if (!where.has(fish)) where.set(fish, []);
  where.get(fish).push([Number(z), areaName.get(`${z}:${a}`) || '']);
}
const baits = new Map(); for (const [b, fish, p] of rows(await get('fishing_bait_affinity'))) { if (!baits.has(Number(fish))) baits.set(Number(fish), []); baits.get(Number(fish)).push([Number(b), Number(p)]); }
for (const r of fishRows) {
  const id = Number(r[0]);
  out.fish.push({ id, skill: Number(r[2]), size: Number(r[9]), water: Number(r[10]), where: where.get(id) || [], baits: (baits.get(id) || []).sort((a, b) => b[1] - a[1]) });
}
for (const r of rows(await get('fishing_rod'))) out.rods.push({ id: Number(r[0]), min: Number(r[5]), max: Number(r[6]) });
// 青魔法：セットポイント・特性の種類・連携属性（番号：1貫通 2収縮 3溶解 4切断 5振動 6炸裂 7硬化 8衝撃 9重力 10湾曲 11核熱 12分解 13光 14闇）
out.blue = {};
for (const r of rows(await get('blue_spell_list'))) out.blue[Number(r[0])] = { sp: Number(r[2]), cat: Number(r[3]), sc: [Number(r[5]), Number(r[6]), Number(r[7])].filter(Boolean) };
out.blueTraits = {}; // 特性の種類 → [必要ポイント, 特性ID]
for (const r of rows(await get('blue_traits'))) { const c = Number(r[0]); if (!out.blueTraits[c]) out.blueTraits[c] = []; out.blueTraits[c].push([Number(r[1]), Number(r[2])]); }
// ギルドの納品（ギルド・アイテム・ランク・ポイント・上限・日替わりの型）
out.guild = rows(await get('guild_item_points')).map(r => r.slice(0, 6).map(Number));
// 装備の見た目（モデル番号）：[MId, 部位, ほかに覆う部位]
out.look = {};
for (const r of rows(await get('item_equipment'))) { const mid = Number(r[5]); if (mid > 0) out.look[Number(r[0])] = [mid, Number(r[8]), Number(r[9])]; }
fs.writeFileSync(path.join(DATA, 'lsb.json'), JSON.stringify(out));
console.log('見た目', Object.keys(out.look).length);
console.log('青魔法', Object.keys(out.blue).length, 'ギルド納品', out.guild.length);
console.log('売値', Object.keys(out.sell).length, '印', Object.keys(out.flags).length, '魚', out.fish.length, '竿', out.rods.length);
