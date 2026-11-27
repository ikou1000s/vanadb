// 錬成（シナジー）→ synergy.html
// レシピ：FFXIclopedia（CC BY-SA 3.0）の各アイテムのページ（data/synergy.json・src/fetch_synergy.mjs）。
// 取れなかった日は、もう一つの公開データ（lsb.synergy）の分だけを出す。
import fs from 'node:fs';
import path from 'node:path';

const FE = ['火', '氷', '風', '土', '雷', '水', '光', '闇'];
const CRAFT = { woodworking: '木工', smithing: '鍛冶', goldsmithing: '彫金', clothcraft: '裁縫', leathercraft: '革細工', bonecraft: '骨細工', alchemy: '錬金術', cooking: '調理', fishing: '釣り' };
// 英語のランク名 → [その段の始めのスキル値, 日本語]
const RANK = { amateur: [0, '素人'], recruit: [11, '見習'], initiate: [21, '徒弟'], novice: [31, '下級職人'], apprentice: [41, '名取'], journeyman: [51, '目録'], craftsman: [61, '印可'], artisan: [71, '高弟'], adept: [81, '皆伝'], veteran: [91, '師範'] };
const capNum = t => { const r = RANK[String(t).trim().toLowerCase()]; if (r) return r[0]; const m = /\d+/.exec(t); return m ? Number(m[0]) : 0; };
const capJa = t => { const r = RANK[String(t).trim().toLowerCase()]; return r ? r[1] : String(t || ''); };
const BANDS = [[10, '素人（〜10）'], [20, '見習（11〜20）'], [30, '徒弟（21〜30）'], [40, '下級職人（31〜40）'], [50, '名取（41〜50）'], [60, '目録（51〜60）'], [70, '印可（61〜70）'], [80, '高弟（71〜80）'], [90, '皆伝（81〜90）'], [100, '師範（91〜100）'], [999, '高級（101〜）']];

export function writeSynergy(ctx) {
  const { items, SITE, DATA, head, foot, esc, BASE, ORIGIN, SITE_SHORT, VER, tile, lsb, hasPage } = ctx;
  const f = path.join(DATA, 'synergy.json');
  const wiki = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
  // 英語名 → 品番（短い名前・長い名前・「piece of 〜」などを外した名前）
  const idx = new Map();
  for (const it of items.values()) for (const k of [it.en, it.enl, (it.enl || '').replace(/^[a-z]+(?: [a-z]+)? of /, '')]) if (k && !idx.has(k.toLowerCase())) idx.set(k.toLowerCase(), it.id);
  const idOf = n => idx.get(String(n || '').toLowerCase());
  const nm = (id, en) => (id ? (items.get(id) || {}).ja || en : en);
  const link = (en, id = idOf(en)) => (id && hasPage(id) ? `<a href="${BASE}item/${id}.html">${esc(nm(id, en))}</a>` : esc(nm(id, en)));
  const fewell = fe => fe.map((n, i) => (n ? `<span class="fw fw${i}">${FE[i]}${n}</span>` : '')).join('');
  let rows;
  if (wiki.length) {
    const seen = new Set();
    rows = wiki.filter(r => { const k = JSON.stringify(r); if (seen.has(k)) return false; seen.add(k); return true; }).map(r => ({ cap: capNum(r.cap), capTxt: capJa(r.cap), res: link(r.result) + (r.yield > 1 ? ` ×${r.yield}` : ''), ings: r.ings.map(([n, q]) => link(n) + (q > 1 ? ` ×${q}` : '')).join('、'), fe: fewell(r.fe), subs: r.subs.map(([c, v]) => `${esc(CRAFT[c.toLowerCase()] || c)}${v ? ` ${esc(capJa(v))}` : ''}`).join('、'), hq: r.hq.map((h, i) => (/^this$/i.test(h) ? '' : link(h) + (r.hqy[i] > 1 ? ` ×${r.hqy[i]}` : ''))).filter(Boolean).join('、') }));
  } else {
    rows = ((lsb && lsb.synergy) || []).map(r => ({ cap: 0, capTxt: '', res: link('', r.result), ings: r.ings.map(i => link('', i)).join('、'), fe: fewell(r.fe), subs: '', hq: '' }));
  }
  rows.sort((a, b) => a.cap - b.cap);
  const band = c => BANDS.find(([m]) => c <= m)[1];
  const groups = []; for (const r of rows) { const b = band(r.cap); if (!groups.length || groups[groups.length - 1][0] !== b) groups.push([b, []]); groups[groups.length - 1][1].push(r); }
  const ffo = 'https://wiki.ffo.jp/search.cgi?CCC=%E6%84%9B&amp;Command=Search&amp;qf=' + encodeURIComponent('錬成') + '&amp;order=match&amp;ffotype=title&amp;type=title';
  const rel = 'synergy.html';
  fs.writeFileSync(path.join(SITE, rel), head(`錬成（シナジー）のレシピ一覧（${rows.length}件）｜${SITE_SHORT}`, `FF11の錬成（シナジー）のレシピ${rows.length}件。錬成スキルの順に、できる物・素材・フュエル（属性ごとの量）・ほかに要るスキル・HQ。`, `${ORIGIN}/${rel}`)
    + `<main class="wide"><p class="crumb"><a href="${BASE}">トップ</a> › <a href="${BASE}#synth">合成</a> › 錬成</p><h1>錬成（シナジー） <span class="cnt">${rows.length}件</span></h1>
<p class="lead">錬成炉に素材を入れ、属性のフュエルを使って作る合成です。錬成スキルの順に並べています。できる物・素材の名前を押すと、アイテムのページへ。手順や炉の使い方は <a href="${ffo}" rel="noopener" target="_blank">FF11用語辞典</a> で。</p>
<div class="row"><label>名前</label><input type="search" class="tfilter" data-for="syn" placeholder="できる物・素材の名前で絞る"></div>
<nav class="bands">${groups.map(([b, l]) => `<a href="#sb-${BANDS.findIndex(x => x[1] === b)}" data-band="${b}">${b.replace(/（.*/, '')}<span>${l.length}</span></a>`).join('')}</nav>
<div class="tbl syn" id="syn" data-ck="sy"><div class="r h"><div class="c-lv">錬成</div><div class="c-n">できる物</div><div class="c-fx">素材</div><div class="c-ex">フュエル</div><div class="c-sb">ほかに要るスキル</div><div class="c-hq">HQ</div></div>${groups.map(([b, l]) => `<div class="band" id="sb-${BANDS.findIndex(x => x[1] === b)}" data-band="${b}">${b} <span>${l.length}件</span></div>${l.map((r, k) => `<div class="r" data-id="syn-${esc(String(r.capTxt))}-${k}-${esc(r.res.replace(/<[^>]+>/g, '').slice(0, 20))}"><div class="c-lv">${esc(String(r.capTxt || ''))}</div><div class="c-n">${r.res}</div><div class="c-fx">${r.ings}</div><div class="c-ex">${r.fe}</div><div class="c-sb">${r.subs}</div><div class="c-hq">${r.hq || '<span class="nl">—</span>'}</div></div>`).join('')}`).join('')}</div>
<p class="note">${wiki.length ? 'レシピは FFXIclopedia（<a href="https://ffxiclopedia.fandom.com/wiki/Category:Synergy" rel="noopener" target="_blank">Category:Synergy</a>）の各アイテムのページから集め、名前を日本語にした物です。この一覧は <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.ja" rel="noopener" target="_blank">CC BY-SA 3.0</a> で使えます。数値は参考です。' : '元データ：有志が公開しているデータ。数値は参考です。'}</p></main><script src="${BASE}list.js?v=${VER}"></script>` + foot);
  return { home: tile(`${BASE}${rel}`, '錬成', rows.length, '炉', 'ex'), urls: [`${ORIGIN}/${rel}`], count: rows.length };
}
