// Windower Resources から最新のデータを取ってくる（週1で実行）
// 使い方: node src/fetch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// GitHub の API は鍵なしだと1時間60回まで。Actions では GITHUB_TOKEN を付けて回数制限に当たらないように
const GH = { 'User-Agent': 'ff11-db', ...(process.env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {}) };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const FILES = ['items', 'item_descriptions', 'jobs', 'slots', 'skills', 'key_items', 'spells', 'weapon_skills', 'job_abilities', 'zones', 'titles', 'mounts', 'merit_points', 'job_points', 'job_traits', 'monster_abilities', 'buffs', 'monstrosity', 'monster_skills'];
const RAW = 'https://raw.githubusercontent.com/Windower/Resources/master/resources_data/';

fs.mkdirSync(DATA, { recursive: true });
for (const f of FILES) {
  const r = await fetch(RAW + f + '.lua');
  if (!r.ok) throw new Error(`${f}.lua を取れない: ${r.status}`);
  const t = await r.text();
  if (t.length < 500) throw new Error(`${f}.lua が短すぎる`);
  fs.writeFileSync(path.join(DATA, f + '.lua'), t);
}
// いつのバージョンアップまで入っているか（最後の更新の日付と内容）
const c = await fetch('https://api.github.com/repos/Windower/Resources/commits?per_page=100', { headers: GH }).then(r => r.json());
const last = c[0].commit;
// 「November 10, 2026 FFXI Update」の形の物＝バージョンアップの取り込み
const vu = c.map(x => x.commit.message.split('\n')[0]).map(m => /^([A-Z][a-z]+) (\d{1,2}), (\d{4}) FFXI Update/.exec(m)).find(Boolean);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const jst = d => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
const asof = {
  date: jst(new Date(last.author.date)),
  note: vu ? `${vu[3]}/${MONTHS.indexOf(vu[1]) + 1}/${vu[2]} のバージョンアップまで` : '最新のバージョンアップ',
  fetched: jst(new Date()),
};
// 直近12回（約1年）のバージョンアップで増えたアイテム：取り込みの前後の items.lua を比べる（最新の回は今の items.lua と比べる）
const idsOf = t => new Set([...t.matchAll(/^\s*\[(\d+)\] = /gm)].map(m => Number(m[1])));
const itemsAt = sha => fetch(`https://raw.githubusercontent.com/Windower/Resources/${sha}/resources_data/items.lua`).then(r => (r.ok ? r.text() : ''));
const updates = [];
const vus = c.filter(x => /^[A-Z][a-z]+ \d{1,2}, \d{4} FFXI Update/.test(x.commit.message)).slice(0, 12);
let after = idsOf(fs.readFileSync(path.join(DATA, 'items.lua'), 'utf8'));
for (const v of vus) {
  const m = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})/.exec(v.commit.message);
  const before = idsOf(await itemsAt(v.parents[0].sha));
  if (before.size < 1000) break;
  updates.push({ label: `${m[3]}/${MONTHS.indexOf(m[1]) + 1}/${m[2]}`, ids: [...after].filter(id => !before.has(id)) });
  after = before;
}
fs.writeFileSync(path.join(DATA, 'updates.json'), JSON.stringify(updates));
asof.updates = updates.map(u => `${u.label}:${u.ids.length}`).join(' ');
// 合成のレシピ（LandSandBoat・GPLv3 の synth_recipes。入手方法の参考）
const SKILL_JA = ['木工', '鍛冶', '彫金', '裁縫', '革細工', '骨細工', '錬金術', '調理'];
const sql = await fetch('https://raw.githubusercontent.com/LandSandBoat/server/base/sql/synth_recipes.sql').then(r => (r.ok ? r.text() : ''));
const synth = [];
for (const m of sql.matchAll(/INSERT INTO `synth_recipes` VALUES \((.*)\);/g)) {
  const v = m[1].split(',');
  if (Number(v[1])) continue; // 分解は除く
  const sk = {}; SKILL_JA.forEach((ja, i) => { const n = Number(v[3 + i]); if (n) sk[ja] = n; });
  const ings = new Map(); for (let i = 13; i <= 20; i++) { const id = Number(v[i]); if (id) ings.set(id, (ings.get(id) || 0) + 1); }
  synth.push({ skills: sk, crystal: Number(v[11]), ings: [...ings], result: Number(v[21]), hq: [Number(v[22]), Number(v[23]), Number(v[24])] });
}
if (synth.length > 1000) fs.writeFileSync(path.join(DATA, 'synth.json'), JSON.stringify(synth));
asof.synth = synth.length;
fs.writeFileSync(path.join(DATA, 'asof.json'), JSON.stringify(asof, null, 1));
console.log('取り込み完了', asof);

// クエスト・ミッションの一覧（Journal-FFXI-JP・GPL-3.0）
await import('./fetch_quests.mjs');

// 売値・Rare/Ex・釣り（LandSandBoat・GPLv3）
await import('./fetch_lsb.mjs');
await import('./fetch_aug.mjs');

// ドロップ・ぬすむ（LandSandBoat・GPLv3）
await import('./fetch_mobs.mjs');
