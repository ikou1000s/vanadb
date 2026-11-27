// お店で買える物（LandSandBoat scripts/zones/*/npcs/*.lua の stock・GPLv3）→ data/shops.json
// 店のNPCのファイルの一覧は src/shop_npcs.json（GitHub のコード検索「xi.shop」で集めた物。2026-11-28）
// 1行は { アイテム（番号か xi.item.名前）, 値段, 国の店なら順位 }。国の店（xi.shop.nation）は3つ目が「国の順位が◯位以内の時に買える」
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const RAW = 'https://raw.githubusercontent.com/LandSandBoat/server/base/';
// 通信が一時的に切れる（ECONNRESET）ことがあるので、3回まで待って取り直す
const get = async f => { for (let i = 0; ; i++) { try { const r = await fetch(RAW + f); return r.ok ? await r.text() : ''; } catch (e) { if (i >= 3) throw e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); } } };

const files = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'shop_npcs.json'), 'utf8'));
// xi.item.名前 → アイテム番号
const idByName = new Map();
for (const m of (await get('scripts/enum/item.lua')).matchAll(/^\s*([A-Z0-9_]+)\s*=\s*(\d+)\s*,/gm)) idByName.set(m[1], Number(m[2]));
// エリアのフォルダ名 → エリア番号
const zoneIdByDir = new Map();
for (const m of (await get('sql/zone_settings.sql')).matchAll(/^INSERT INTO `zone_settings` VALUES \((\d+),'[^']*',\d+,'([^']+)'\)/gm)) zoneIdByDir.set(m[2].toLowerCase().replace(/[^a-z0-9]/g, ''), Number(m[1]));

const shops = [];
const queue = [...files];
const work = async () => {
  while (queue.length) {
    const f = queue.shift();
    const m = /^scripts\/zones\/([^/]+)\/npcs\/([^/]+)\.lua$/.exec(f); if (!m) continue;
    const z = zoneIdByDir.get(m[1].toLowerCase().replace(/[^a-z0-9]/g, '')); if (z == null) continue;
    const src = await get(f); if (!/xi\.shop\./.test(src)) continue;
    const nation = /xi\.shop\.nation\s*\(/.test(src);
    const items = [], seen = new Set();
    for (const r of src.matchAll(/\{\s*(xi\.item\.([A-Z0-9_]+)|\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+)\s*)?,?\s*\}/g)) {
      const id = r[2] ? idByName.get(r[2]) : Number(r[1]); const price = Number(r[3]);
      if (!id || !price || seen.has(id)) continue; seen.add(id);
      items.push(nation && r[4] ? [id, price, Number(r[4])] : [id, price]);
    }
    if (items.length) shops.push({ z, npc: m[2].replace(/_/g, ' '), nation, items });
  }
};
await Promise.all(Array.from({ length: 8 }, work));
shops.sort((a, b) => a.z - b.z || a.npc.localeCompare(b.npc));
if (shops.length > 50) fs.writeFileSync(path.join(DATA, 'shops.json'), JSON.stringify({ shops }));
console.log('お店', shops.length, '店', shops.reduce((s, x) => s + x.items.length, 0), '品');
