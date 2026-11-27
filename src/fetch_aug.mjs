// オーグメントの固定・幅の分：LandSandBoat（GPLv3）の魔法試練（magian_data.lua）とアビセアの箱（sturdypyxis/augmented_item.lua）→ data/aug.json
// 値の出し方：augments.sql の「番号ごとの基本の値」に、付いた値 v を足す（基本が−なら引く。multiplier があればその刻み）。
// 魔法試練の元データにある英語のコメント（例 "Attack +3"）と突き合わせて、出し方が合うかを毎回数える。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const RAW = 'https://raw.githubusercontent.com/LandSandBoat/server/base/';
// 通信が一時的に切れる（ECONNRESET）ことがあるので、3回まで待って取り直す（2026-11-28）
const retry = async g => { for (let i = 0; ; i++) { try { return await g(); } catch (e) { if (i >= 3) throw e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); } } };
const get = async f => { const r = await retry(() => fetch(RAW + f)); if (!r.ok) throw new Error(`${f}: ${r.status}`); return r.text(); };

const [enumTxt, sqlTxt, magTxt, pyxTxt] = await Promise.all([
  get('scripts/enum/item.lua'), get('sql/augments.sql'), get('scripts/globals/magian_data.lua'), get('scripts/globals/abyssea/sturdypyxis/augmented_item.lua'),
]);

// xi.item.NAME → 品番
const itemId = new Map([...enumTxt.matchAll(/^\s*([A-Z0-9_]+)\s*=\s*(\d+),/gm)].map(m => [m[1], Number(m[2])]));
const iid = n => itemId.get(n) || 0;

// 番号 → [{mult, mod, value, pet, text}]
const aug = new Map();
for (const m of sqlTxt.matchAll(/^INSERT INTO `augments` VALUES \((\d+),(-?\d+),(\d+),(-?\d+),(\d+),(\d+)\);\s*(?:--\s*(.*))?$/gm)) {
  const id = Number(m[1]);
  if (!aug.has(id)) aug.set(id, []);
  aug.get(id).push({ mult: Number(m[2]), mod: Number(m[3]), value: Number(m[4]), pet: Number(m[5]), text: (m[7] || '').trim() });
}
// 番号の名前（最初の行のコメントから数字を外した物。"Cont." の行は使わない）
const augName = id => {
  const r = (aug.get(id) || [])[0];
  if (!r || !r.text) return '';
  return r.text;
};
// 付いた値 v → 表示の文字（英語）。例：25（Attack+1）に v=2 → "Attack+3"
// コメントの注記（"(ranged,not melee)"・", Increases …"・"(increases by 5)" など）を外して「名前＋値」だけにする
const clean = s => s.replace(/\(X\+(\d+)\)/g, '$1').replace(/ down (\d+%?)/i, ' down+$1').split(/\s{2,}|,\s|\s\((?!Ranged\))|\s"However/)[0].replace(/^"([^"]+)"/, '$1').trim();
const NUM = /([+-])\s*(\d+)(%?)/g;
const augText = (id, v) => {
  const r = (aug.get(id) || [])[0];
  if (!r || !r.text) return `#${id}(${v})`;
  const step = r.mult > 1 ? r.mult : (id === 353 ? 50 : 1); // TPボーナスは50ずつ（元の基本値も50）
  return clean(r.text).replace(NUM, (all, s, n, pc) => {
    const base = Number(n) * (s === '-' ? -1 : 1);
    const val = base + (base < 0 ? -1 : 1) * v * step;
    return (val < 0 ? '-' : '+') + Math.abs(val) + pc;
  });
};

// 魔法試練：[試練番号] = { previousTrial, requiredItem = {...}, rewardItem = {...} }
const trials = [];
let checked = 0, matched = 0; const mism = [];
const start = magTxt.indexOf('xi.magian.trials');
const body = magTxt.slice(start);
const parts = body.split(/^ {4}\[(\d+)\]\s*=.*$/m);
const readItem = t => {
  const id = iid((/itemId\s*=\s*xi\.item\.(\w+)/.exec(t) || [])[1]);
  const augs = [...t.matchAll(/\{\s*(\d+),\s*(\d+)\s*\},?[ \t]*(?:--[ \t]*([^\n]*))?/g)].map(m => {
    const a = Number(m[1]), v = Number(m[2]);
    let txt = augText(a, v);
    if (txt.startsWith('#') && m[3]) txt = m[3].trim(); // 番号表に中身が無い物（例 912）は試練のコメントを使う
    const norm = s => s.replace(/[\s":]+/g, '').replace(/\(Ranged\)/i, 'R').toLowerCase();
    if (m[3]) { checked++; if (norm(m[3]).replace(/^(.*?)([+-]\d+%?)R$/, '$1R$2') === norm(txt).replace(/^(.*?)R([+-]\d+%?)$/, '$1R$2') || norm(m[3]) === norm(txt)) matched++; else mism.push(`${a}:${v} ${txt} ／ ${m[3]}`); }
    return [a, v, txt];
  });
  return { id, augs };
};
for (let i = 1; i < parts.length; i += 2) {
  const no = Number(parts[i]); const t = parts[i + 1];
  const prev = Number((/previousTrial\s*=\s*(\d+)/.exec(t) || [])[1] || 0);
  const ri = t.indexOf('rewardItem'); if (ri < 0) continue;
  const reqIdx = t.indexOf('requiredItem');
  const req = reqIdx >= 0 ? readItem(t.slice(reqIdx, ri)) : { id: 0, augs: [] };
  const rew = readItem(t.slice(ri));
  const num = Number((/numRequired\s*=\s*(\d+)/.exec(t) || [])[1] || 0);
  if (!rew.id) continue;
  trials.push({ no, prev, req, rew, num });
}

// アビセアの箱：[xi.item.X] = { augments = { { aug = n, min = a, max = b }, ... } }
const pyxis = [];
const zoneOf = new Map();
for (const m of pyxTxt.matchAll(/\[xi\.zone\.(\w+)\]\s*=\s*\{([^}]*)\}/g)) for (const n of m[2].matchAll(/xi\.item\.(\w+)/g)) zoneOf.set(n[1], m[1]);
for (const m of pyxTxt.matchAll(/\[xi\.item\.(\w+)\]\s*=\s*\{\s*augments\s*=\s*\{([\s\S]*?)\n\s{8}\},/g)) {
  const list = [...m[2].matchAll(/aug\s*=\s*(\d+),\s*min\s*=\s*(\d+),\s*max\s*=\s*(\d+)/g)].map(x => {
    const a = Number(x[1]), lo = Number(x[2]), hi = Number(x[3]);
    return [a, lo, hi, augText(a, lo), augText(a, hi)];
  });
  const id = iid(m[1]);
  if (id && list.length) pyxis.push({ id, zone: zoneOf.get(m[1]) || '', augs: list });
}

fs.writeFileSync(path.join(DATA, 'aug.json'), JSON.stringify({ trials, pyxis, names: Object.fromEntries([...aug].map(([k]) => [k, augName(k)])) }));
if (process.env.AUG_DEBUG) { console.log([...new Set(mism)].slice(0, 40).join('\n')); const nm = new Set(); for (const t of trials) for (const x of t.rew.augs) nm.add(x[2].replace(NUM, '')); for (const p of pyxis) for (const x of p.augs) nm.add(x[3].replace(NUM, '')); console.log([...nm].join(' | ')); }
console.log('魔法試練', trials.length, '（オーグメント付きの報酬', trials.filter(t => t.rew.augs.length).length, '）', 'アビセアの箱', pyxis.length, '値の突き合わせ', `${matched}/${checked}`);
