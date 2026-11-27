// 錬成のレシピ：FFXIclopedia（CC BY-SA 3.0）の Category:Synergy の各ページにある「Synthesis Recipe（craft = Synergy）」→ data/synergy.json
// 失敗しても毎日の組み立ては止めない（その日は錬成の一覧が少なくなるだけ）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const API = 'https://ffxiclopedia.fandom.com/api.php';
const H = { 'User-Agent': 'vanadb-synergy/1.0 (+https://vanadb.com/)' };
const j = async q => (await fetch(API + '?' + new URLSearchParams({ format: 'json', ...q }), { headers: H })).json();

const titles = []; let cont = {};
do {
  const r = await j({ action: 'query', list: 'categorymembers', cmtitle: 'Category:Synergy', cmlimit: '500', cmnamespace: '0', ...cont });
  titles.push(...r.query.categorymembers.map(m => m.title));
  cont = r.continue ? { cmcontinue: r.continue.cmcontinue } : null;
} while (cont);
const pages = [];
for (let i = 0; i < titles.length; i += 50) {
  const r = await j({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titles.slice(i, i + 50).join('|') });
  for (const p of Object.values(r.query.pages)) if (p.revisions) pages.push([p.title, p.revisions[0].slots.main['*']]);
}
const clean = v => String(v || '').replace(/\{\{[^}]*\}\}/g, '').replace(/<[^>]+>/g, '').replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/'+$/, '').trim();
const num = v => { const m = /\d+/.exec(clean(v)); return m ? Number(m[0]) : 0; };
const EL = [['fire'], ['ice'], ['wind'], ['earth'], ['lightning', 'thunder'], ['water'], ['light'], ['dark', 'darkness']];
const out = [];
for (const [title, src] of pages) {
  for (const m of src.matchAll(/\{\{Synthesis Recipe([\s\S]*?)\n\}\}/g)) {
    const kv = {};
    for (const l of m[1].split('\n')) { const x = /^\s*\|\s*([a-z0-9 ]+?)\s*=\s*(.*)$/i.exec(l); if (x) kv[x[1].toLowerCase().replace(/\s+/g, ' ')] = x[2]; }
    if (!/^synergy$/i.test(clean(kv.craft))) continue;
    const res = clean(kv.result); const result = !res || /^this$/i.test(res) ? title : res;
    const ings = [];
    for (let k = 1; k <= 8; k++) {
      const key = k === 1 ? 'ingredient' : `ingredient ${k}`; const q = kv[`${key} quantity`] || (k === 1 ? kv['ingredient amount'] : '');
      const n = clean(kv[key]); if (n) ings.push([n, num(q) || 1]);
    }
    const subs = [['subcraft', 'subcraft cap'], ['subcraft 2', 'subcraft 2 cap'], ['subcraft 3', 'subcraft 3 cap']].map(([a, b]) => [clean(kv[a]), clean(kv[b])]).filter(([a]) => a);
    out.push({
      result, cap: clean(kv.cap), subs, ings,
      fe: EL.map(ks => ks.reduce((s, k) => s + num(kv[k]), 0)),
      yield: num(kv.yield) || 1,
      hq: [clean(kv['hq result']), clean(kv['hq 2 result']), clean(kv['hq 3 result'])].filter(Boolean),
      hqy: [num(kv['hq yield']), num(kv['hq 2 yield'] || kv['hq 2yield']), num(kv['hq 3 yield'])],
    });
  }
}
fs.writeFileSync(path.join(DATA, 'synergy.json'), JSON.stringify(out));
console.log('錬成', titles.length, 'ページ', out.length, '件');
