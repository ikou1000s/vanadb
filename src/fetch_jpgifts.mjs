// ジョブポイントのギフト（そのジョブで使ったJPの合計で貰える効果）
// （LandSandBoat sql/job_point_gifts.sql・GPLv3）→ data/jpgifts.json
// 1行＝ジョブ番号・使ったJPの合計・効果の番号・値・説明（"WAR_Attack Bonus" の形）
// 効果の番号はジョブによって意味が違う物がある（990・991 など）ので、説明の文を見出しに使う
// LSB は届いた段を全部足す（src/map/job_points.cpp の RefreshGiftMods。Lv99の時だけ）が、
// 足すとキャパシティポイント+320%などになり本体と合うか分からないので、ページは段ごとの値だけ出す
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const RAW = 'https://raw.githubusercontent.com/LandSandBoat/server/base/';
const get = async f => { for (let i = 0; ; i++) { try { const r = await fetch(RAW + f); return r.ok ? await r.text() : ''; } catch (e) { if (i >= 3) throw e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); } } };

export const giftKey = d => d.replace(/^[A-Z]{3}_/, '').replace(/^Superior \d+$/, 'Superior').replace(/"/g, '').replace(/\.$/, '').trim().toLowerCase();

const src = await get('sql/job_point_gifts.sql');
const list = []; let bad = 0;
for (const m of src.matchAll(/^INSERT INTO `job_point_gifts` VALUES \((\d+),(\d+),(\d+),(-?\d+),'((?:[^']|'')*)'\);/gm)) {
  const job = Number(m[1]), jp = Number(m[2]), v = Number(m[4]);
  if (job < 1 || job > 22 || jp < 1 || jp > 2100) { bad++; continue; }
  list.push([job, jp, giftKey(m[5].replace(/''/g, "'")), v]);
}
list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const jobs = new Set(list.map(x => x[0]));
// 確かめ：戦士は5JPで防御+10、2100JPでスペリオル5段目
const ok = list.some(x => x[0] === 1 && x[1] === 5 && x[2] === 'physical defense bonus' && x[3] === 10)
  && list.filter(x => x[0] === 1 && x[2] === 'superior').length === 5;
if (ok && jobs.size === 22 && list.length > 1000 && !bad) fs.writeFileSync(path.join(DATA, 'jpgifts.json'), JSON.stringify({ source: 'https://github.com/LandSandBoat/server (sql/job_point_gifts.sql, src/map/job_points.cpp)', license: 'GPL-3.0', cols: ['job', 'jp', 'key', 'value'], list }));
console.log('ジョブポイントのギフト', list.length, '件', jobs.size, 'ジョブ', '読めない行', bad, '確かめ', ok ? 'OK' : 'NG');
