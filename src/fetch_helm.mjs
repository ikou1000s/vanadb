// HELM（収穫・発掘・伐採・採掘）で取れる物（LandSandBoat scripts/globals/hobbies/helm/data.lua・GPLv3）→ data/helm.json
// 元のデータには取れる重み（出やすさ）もあるが、遊んで確かめる物なので載せない。エリアと種類と品だけ
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const RAW = 'https://raw.githubusercontent.com/LandSandBoat/server/base/';
// 通信が一時的に切れることがあるので、3回まで待って取り直す
const get = async f => { for (let i = 0; ; i++) { try { const r = await fetch(RAW + f); return r.ok ? await r.text() : ''; } catch (e) { if (i >= 3) throw e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); } } };

const idByName = new Map();
for (const m of (await get('scripts/enum/item.lua')).matchAll(/^\s*([A-Z0-9_]+)\s*=\s*(\d+)\s*,/gm)) idByName.set(m[1], Number(m[2]));
// xi.zone.名前 → エリア番号（zone_settings.sql のフォルダ名を英数字だけにして突き合わせる）
const zoneIdByKey = new Map();
for (const m of (await get('sql/zone_settings.sql')).matchAll(/^INSERT INTO `zone_settings` VALUES \((\d+),'[^']*',\d+,'([^']+)'\)/gm)) zoneIdByKey.set(m[2].toLowerCase().replace(/[^a-z0-9]/g, ''), Number(m[1]));
const zoneByName = { get: n => zoneIdByKey.get(n.toLowerCase().replace(/[^a-z0-9]/g, '')) };

const src = await get('scripts/globals/hobbies/helm/data.lua');
// { ... } の中身（括弧の深さで閉じを探す）
const block = (t, from) => { const s = t.indexOf('{', from); let d = 0; for (let k = s; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return [t.slice(s + 1, k), k]; } return ['', t.length]; };
const TYPES = ['HARVESTING', 'EXCAVATION', 'LOGGING', 'MINING'];
const helm = [];
for (const type of TYPES) {
  const i = src.indexOf('[xi.helmType.' + type + ']'); if (i < 0) continue;
  const [body] = block(src, i);
  const zi = body.indexOf('zone'); if (zi < 0) continue;
  const [zones] = block(body, zi);
  for (const m of zones.matchAll(/\[\s*xi\.zone\.([A-Z0-9_]+)\s*\]\s*=/g)) {
    const z = zoneByName.get(m[1]); if (z == null) continue;
    const [zb] = block(zones, m.index + m[0].length);
    const di = zb.indexOf('drops'); if (di < 0) continue;
    const [drops] = block(zb, di);
    const l = [];
    for (const r of drops.matchAll(/\{\s*(\d+)\s*,\s*xi\.item\.([A-Z0-9_]+)\s*\}/g)) { const id = idByName.get(r[2]); if (id && !l.includes(id)) l.push(id); }
    if (l.length) helm.push({ type, z, items: l });
  }
}
helm.sort((a, b) => a.z - b.z || TYPES.indexOf(a.type) - TYPES.indexOf(b.type));
if (helm.length > 20) fs.writeFileSync(path.join(DATA, 'helm.json'), JSON.stringify({ source: 'https://github.com/LandSandBoat/server (scripts/globals/hobbies/helm/data.lua)', license: 'GPL-3.0', helm }));
console.log('HELM', helm.length, 'か所', helm.reduce((s, x) => s + x.items.length, 0), '品');
