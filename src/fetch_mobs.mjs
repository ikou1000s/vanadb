// ドロップ・ぬすむ（LandSandBoat data/zones/*/mobs.yaml・GPLv3）→ data/mobs.json
// アイテムは item_basic の名前（例 handful_of_pugil_scales）で結ぶ
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// GitHub の API は鍵なしだと1時間60回まで。Actions では GITHUB_TOKEN を付けて回数制限に当たらないように
const GH = { 'User-Agent': 'ff11-db', ...(process.env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {}) };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const RAW = 'https://raw.githubusercontent.com/LandSandBoat/server/base/';
// 通信が一時的に切れる（ECONNRESET）ことがあるので、3回まで待って取り直す（2026-11-28 の自動作成がこれで落ちた）
const get = async f => { for (let i = 0; ; i++) { try { const r = await fetch(RAW + f); return r.ok ? await r.text() : ''; } catch (e) { if (i >= 3) throw e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); } } };

// item_basic の名前 → アイテムID
const basic = await get('sql/item_basic.sql');
const idByKey = new Map();
for (const m of basic.matchAll(/^INSERT INTO `item_basic` VALUES \((\d+),\d+,'((?:[^'\\]|\\.)*)'/gm)) idByKey.set(m[2].toLowerCase(), Number(m[1]));

// エリアのフォルダ名 → エリア番号（zone_settings の名前と同じ）
const zoneIdByDir = new Map();
for (const m of (await get('sql/zone_settings.sql')).matchAll(/^INSERT INTO `zone_settings` VALUES \((\d+),'[^']*',\d+,'([^']+)'\)/gm)) zoneIdByDir.set(m[2].toLowerCase().replace(/[^a-z0-9]/g, ''), Number(m[1]));
const list = await fetch('https://api.github.com/repos/LandSandBoat/server/contents/data/zones', { headers: GH }).then(r => r.json());
const zonesDirs = Array.isArray(list) ? list.filter(x => x.type === 'dir').map(x => x.name) : [];
const out = { drops: {}, steal: {}, zones: 0, mobs: 0 };
const push = (map, id, v) => { (map[id] = map[id] || []).push(v); };

async function doZone(z) {
  const my = await get(`data/zones/${z}/mobs.yaml`);
  const zid = zoneIdByDir.get(z.toLowerCase().replace(/[^a-z0-9]/g, ''));
  if (!my || zid == null) return;
  out.zones++;
  let mob = null, nm = false, inDrops = false, chance = '';
  for (const line of my.split('\n')) {
    let m;
    if ((m = /^  ([A-Za-z0-9_'\-]+):\s*$/.exec(line))) { mob = m[1].replace(/_/g, ' '); nm = false; inDrops = false; out.mobs++; continue; }
    if (!mob) continue;
    if ((m = /^    display_name:\s*(.+)$/.exec(line))) { mob = m[1].trim().replace(/_/g, ' '); continue; }
    if (/^    type:.*notorious/.test(line)) { nm = true; continue; }
    if (/^      drops:\s*$/.test(line)) { inDrops = true; continue; }
    if ((m = /^        - chance:\s*(\w+)/.exec(line))) { chance = m[1]; continue; }
    if (inDrops && (m = /^          item:\s*(\S+)/.exec(line))) { const id = idByKey.get(m[1].toLowerCase()); if (id) push(out.drops, id, [mob, zid, chance, nm ? 1 : 0]); continue; }
    if ((m = /^      steal:\s*(\S+)/.exec(line))) { inDrops = false; const id = idByKey.get(m[1].toLowerCase()); if (id) push(out.steal, id, [mob, zid]); continue; }
    if (/^      \w/.test(line) && !/^      drops:/.test(line)) inDrops = false;
  }
}
for (let i = 0; i < zonesDirs.length; i += 12) await Promise.all(zonesDirs.slice(i, i + 12).map(doZone));
// 同じ（モンスター・エリア）の重複をまとめる
for (const k of Object.keys(out.drops)) { const seen = new Set(); out.drops[k] = out.drops[k].filter(v => { const s = v[0] + '|' + v[1]; if (seen.has(s)) return false; seen.add(s); return true; }); }
fs.writeFileSync(path.join(DATA, 'mobs.json'), JSON.stringify(out));
console.log('エリア', out.zones, 'モンスター', out.mobs, 'ドロップのあるアイテム', Object.keys(out.drops).length, 'ぬすむ', Object.keys(out.steal).length);
