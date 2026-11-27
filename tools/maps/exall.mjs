import fs from 'node:fs'; import { maps } from './idx.mjs';
process.env.FLIP = '1';
const G = 'C:/Program Files (x86)/PlayOnline/SquareEnix/FINAL FANTASY XI/';
const f = JSON.parse(fs.readFileSync('found.json')); const by = {};
for (const [p, n, s, c] of f) { if (n === 'm_000_00') continue; (by[n] = by[n] || []).push([p, c]); }
const meta = [];
for (const [n, l] of Object.entries(by)) {
  const ex = l.filter(x => x[1] !== 'menumap'); const pick = (ex.length ? ex : l).sort((a, b) => b[0].localeCompare(a[0]))[0];
  const m = maps(fs.readFileSync(G + pick[0]))[0]; if (!m) { console.log('読めない', n, pick[0]); continue; }
  fs.writeFileSync(`out/${n}.png`, m.png); meta.push([n, pick[0], pick[1], ex.length ? 1 : 0]);
}
fs.writeFileSync('meta.json', JSON.stringify(meta)); console.log(meta.length);
