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
// アビリティ：[ジョブ, 取得Lv, 再使用の秒, 取り方の印]（印：1メリポ 2アストラルフロー中 4メインのみ 8習得 16白のグリモア 32黒のグリモア 64呼び出し 128あやつる 256召喚獣 512オートマトン）
out.abil = {};
for (const r of rows(await get('abilities'))) out.abil[Number(r[0])] = [Number(r[2]), Number(r[3]), Number(r[5]), Number(r[19])];
// ウェポンスキル：[必要スキル値, 使えるジョブ(ビット), メインのみ, 習得が要る]（data/weapon_skills.yaml）
{
  const JOBS = ['', 'war', 'mnk', 'whm', 'blm', 'rdm', 'thf', 'pld', 'drk', 'bst', 'brd', 'rng', 'sam', 'nin', 'drg', 'smn', 'blu', 'cor', 'pup', 'dnc', 'sch', 'geo', 'run'];
  const r = await fetch('https://raw.githubusercontent.com/LandSandBoat/server/base/data/weapon_skills.yaml'); if (!r.ok) throw new Error('weapon_skills.yaml: ' + r.status);
  out.ws = {}; let cur = null, on = false; const wsKeyId = {};
  for (const l of (await r.text()).split(/\r?\n/)) {
    if (/^weapon_skills:/.test(l)) { on = true; continue; }
    if (!on) continue;
    const k = l.match(/^  ([a-z0-9_]+):\s*$/); if (k) { cur = { lv: 0, jobs: 0, main: 0, un: 0, key: k[1] }; continue; }
    const m = cur && l.match(/^    ([a-z_]+):\s*(.*?)\s*(#.*)?$/); if (!m) continue;
    if (m[1] === 'id') { out.ws[Number(m[2])] = cur; wsKeyId[cur.key] = Number(m[2]); }
    else if (m[1] === 'level') cur.lv = Number(m[2]);
    else if (m[1] === 'jobs') cur.jobs = m[2].replace(/[[\]]/g, '').split(',').map(x => JOBS.indexOf(x.trim())).filter(x => x > 0).reduce((a, j) => a | (1 << j), 0);
    else if (m[1] === 'main_job_only') cur.main = m[2] === 'true' ? 1 : 0;
    else if (m[1] === 'unlock') cur.un = 1;
  }
  for (const k of Object.keys(out.ws)) { const w = out.ws[k]; out.ws[k] = [w.lv, w.jobs, w.main, w.un]; }
  // WSの修正項目とTP補正（scripts/actions/weaponskills/<名前>.lua の params。アドゥリン以降の修正の中の値を外の値に重ねる）
  // out.wsStat[id] = { m: [[能力, 下, 上]], f: [fTP×3], c/a/k: [クリティカル/命中/攻撃力×3], d: 効果時間がTPで変わる, h: [回復×3] }
  const num = s => { s = s.trim(); if (/^-?[\d.]+$/.test(s)) return [Number(s), Number(s)];
    let m = s.match(/^(-?[\d.]+)\s*\+\s*\(?\s*player:getMerit\([^)]*\)\s*\*\s*([\d.]+)\s*\)?$/); if (m) return [Number(m[1]) + Number(m[2]), Number(m[1]) + 5 * Number(m[2])];
    m = s.match(/^\(?\s*player:getMerit\([^)]*\)\s*\*\s*([\d.]+)\s*\)?$/); if (m) return [Number(m[1]), 5 * Number(m[1])];
    return null; };
  const tbl = s => { const m = s.match(/^\{([^}]*)\}/); if (!m) return null; const v = m[1].split(',').map(x => Number(x.trim())).filter(x => !Number.isNaN(x)); return v.length === 3 ? v : null; };
  const parse = text => {
    const p = {};
    for (const m of text.matchAll(/params\.(\w+)\s*=\s*(\{[^}]*\}|.*?)(?=\s+params\.|\s*--|\s*$)/gm)) p[m[1]] = m[2];
    return p;
  };
  const files = Object.keys(wsKeyId);
  const texts = {};
  for (let i = 0; i < files.length; i += 20) await Promise.all(files.slice(i, i + 20).map(async f => {
    const r = await fetch(`https://raw.githubusercontent.com/LandSandBoat/server/base/scripts/actions/weaponskills/${f}.lua`);
    if (r.ok) texts[f] = await r.text();
  }));
  out.wsStat = {};
  for (const [f, text] of Object.entries(texts)) {
    const body = text.replace(/^\s*--.*$/gm, '');
    const a = body.search(/if xi\.settings\.main\.USE_ADOULIN_WEAPON_SKILL_CHANGES then/);
    let outer = body, inner = '';
    if (a >= 0) { const e = body.indexOf('\n    end', a); inner = body.slice(a, e < 0 ? undefined : e); outer = body.slice(0, a) + (e < 0 ? '' : body.slice(e)); }
    const p = { ...parse(outer), ...parse(inner) };
    const st = {};
    const mods = [];
    for (const s of ['str', 'dex', 'vit', 'agi', 'int', 'mnd', 'chr']) { const v = p[s + '_wsc'] && num(p[s + '_wsc']); if (v && v[1] > 0) mods.push([s.toUpperCase(), Math.round(v[0] * 100), Math.round(v[1] * 100)]); }
    if (mods.length) st.m = mods;
    if (p.ftpMod && tbl(p.ftpMod)) st.f = tbl(p.ftpMod);
    if (p.critVaries && tbl(p.critVaries)) st.c = tbl(p.critVaries);
    if (p.accVaries && tbl(p.accVaries)) st.a = tbl(p.accVaries);
    if (p.atkVaries && tbl(p.atkVaries)) st.k = tbl(p.atkVaries);
    if (/duration[^\n]*\btp\b/.test(body)) st.d = 1;
    const h = (inner.match(/fTP\(tp,\s*(\{[^}]*\})\)/) || outer.match(/fTP\(tp,\s*(\{[^}]*\})\)/) || [])[1];
    if (h && tbl(h)) st.h = tbl(h);
    if (p.multiHitfTP && /true/.test(p.multiHitfTP)) st.mh = 1;
    if (Object.keys(st).length) out.wsStat[wsKeyId[f]] = st;
  }
  console.log('WSの修正・TP', Object.keys(out.wsStat).length, '/', files.length, '（スクリプト', Object.keys(texts).length, '）');
}
// ジョブごとのスキルの段位（data/skills.yaml の ranks）：ranks[スキル名][ジョブ番号] = 'A+' など
{
  const JOBS = ['', 'war', 'mnk', 'whm', 'blm', 'rdm', 'thf', 'pld', 'drk', 'bst', 'brd', 'rng', 'sam', 'nin', 'drg', 'smn', 'blu', 'cor', 'pup', 'dnc', 'sch', 'geo', 'run'];
  const r = await fetch('https://raw.githubusercontent.com/LandSandBoat/server/base/data/skills.yaml'); if (!r.ok) throw new Error('skills.yaml: ' + r.status);
  out.ranks = {};
  for (const l of (await r.text()).split(/\r?\n/)) {
    const m = l.match(/^    ([a-z_]+):\s*\{(.*)\}\s*$/); if (!m) continue;
    const o = {};
    for (const p of m[2].split(',')) { const [j, v] = p.split(':').map(x => x.trim()); const id = JOBS.indexOf(j); if (id > 0 && v) o[id] = v.replace('_plus', '+').replace('_minus', '-').toUpperCase(); }
    out.ranks[m[1]] = o;
  }
}
// ジョブ特性：[特性ID, ジョブ, Lv, ランク, メリポの番号]（同じ組は1つに）
{
  const seen = new Set(); out.traits = [];
  for (const r of rows(await get('traits'))) { const k = [r[0], r[2], r[3], r[4]].join(':'); if (seen.has(k)) continue; seen.add(k); out.traits.push([Number(r[0]), Number(r[2]), Number(r[3]), Number(r[4]), Number(r[8])]); }
}
// フェイスのジョブ：mob_pools の呼び出し用の型（小文字の名前）→ [メイン, サポート]
// 錬成：素材・フュエル（火氷風土雷水光闇）・できる物
out.synergy = rows(await get('synergy_recipes')).map(r => ({ fe: r.slice(7, 15).map(Number), ings: r.slice(15, 23).map(Number).filter(Boolean), result: Number(r[23]), hq: r.slice(24, 27).map(Number) }));
// エリア → 地方（コンクェストの地方。src/map/utils/zoneutils.cpp の GetCurrentRegion と data/enums/zone.yaml）
{
  const yml = await (await fetch('https://raw.githubusercontent.com/LandSandBoat/server/base/data/enums/zone.yaml')).text();
  const idOf = {}; for (const m of yml.matchAll(/^\s+([a-z0-9_]+):\s+(\d+)/gm)) idOf[m[1]] = Number(m[2]);
  const cpp = await (await fetch('https://raw.githubusercontent.com/LandSandBoat/server/base/src/map/utils/zoneutils.cpp')).text();
  const a = cpp.indexOf('auto GetCurrentRegion('); const body = cpp.slice(a, cpp.indexOf('\n}\n', a));
  const snake = s => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z])([A-Z][a-z])/g, '$1_$2').replace(/([a-zA-Z])(\d)/g, '$1_$2').toLowerCase();
  out.zoneRegion = {}; let pend = [];
  for (const l of body.split('\n')) {
    const c = /case xi::ZoneId::(\w+):/.exec(l); if (c) { pend.push(c[1]); continue; }
    const r = /return xi::Region::(\w+);/.exec(l); if (r) { for (const z of pend) { const id = idOf[snake(z)] ?? idOf[z.toLowerCase()]; if (id != null) out.zoneRegion[id] = r[1]; } pend = []; }
  }
}
out.trustJob = {};
for (const r of rows(await get('mob_pools'))) { const id = Number(r[0]), k = String(r[1]).toLowerCase(); if (id < 5800 || !/^[a-z0-9_-]+$/.test(k)) continue; if (!out.trustJob[k] || r[1] === k) out.trustJob[k] = [Number(r[5]), Number(r[6])]; }
console.log('アビリティ', Object.keys(out.abil).length, 'WS', Object.keys(out.ws).length);
fs.writeFileSync(path.join(DATA, 'lsb.json'), JSON.stringify(out));
console.log('見た目', Object.keys(out.look).length);
console.log('青魔法', Object.keys(out.blue).length, 'ギルド納品', out.guild.length);
console.log('売値', Object.keys(out.sell).length, '印', Object.keys(out.flags).length, '魚', out.fish.length, '竿', out.rods.length);
