// Windower Resources から最新のデータを取ってくる（週1で実行）
// 使い方: node src/fetch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const FILES = ['items', 'item_descriptions', 'jobs', 'slots', 'skills'];
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
const c = await fetch('https://api.github.com/repos/Windower/Resources/commits?per_page=30', { headers: { 'User-Agent': 'ff11-db' } }).then(r => r.json());
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
// 直近3回のバージョンアップで増えたアイテム：取り込みの前後の items.lua を比べる（最新の回は今の items.lua と比べる）
const idsOf = t => new Set([...t.matchAll(/^\s*\[(\d+)\] = /gm)].map(m => Number(m[1])));
const itemsAt = sha => fetch(`https://raw.githubusercontent.com/Windower/Resources/${sha}/resources_data/items.lua`).then(r => (r.ok ? r.text() : ''));
const updates = [];
const vus = c.filter(x => /^[A-Z][a-z]+ \d{1,2}, \d{4} FFXI Update/.test(x.commit.message)).slice(0, 3);
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
fs.writeFileSync(path.join(DATA, 'asof.json'), JSON.stringify(asof, null, 1));
console.log('取り込み完了', asof);
