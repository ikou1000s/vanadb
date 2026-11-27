// 地図：ゲーム内の地図をそのまま（手を加えず）エリアごとに見せる → maps/index.html・maps/<エリア番号>.html
// 絵は家PCのFF11の地図ファイルから書き出した物（src/maps/*.webp・src/maps.json＝[名前, エリア番号, 階]）。毎日の組み立てでは作り直さない。
import fs from 'node:fs';
import path from 'node:path';
import { readLua } from './lua.mjs';

export function writeMaps(ctx) {
  const { ROOT, SITE, DATA, head, foot, esc, BASE, ORIGIN, SITE_SHORT, VER, tile } = ctx;
  const listF = path.join(ROOT, 'src', 'maps.json');
  if (!fs.existsSync(listF)) return { home: '', urls: [], count: 0, zones: new Set() };
  const list = JSON.parse(fs.readFileSync(listF, 'utf8'));
  const Z = fs.existsSync(path.join(DATA, 'zones.lua')) ? readLua(path.join(DATA, 'zones.lua')) : new Map();
  const byZone = new Map();
  for (const [n, z, f] of list) { if (!byZone.has(z)) byZone.set(z, []); byZone.get(z).push([n, f]); }
  const zname = z => (Z.get(z) || {}).ja || `エリア${z}`;
  const zen = z => (Z.get(z) || {}).en || '';
  const zones = [...byZone.keys()].filter(z => (Z.get(z) || {}).ja && (Z.get(z) || {}).ja !== 'unknown').sort((a, b) => zname(a).localeCompare(zname(b), 'ja'));
  fs.mkdirSync(path.join(SITE, 'maps', 'img'), { recursive: true });
  for (const [n] of list) fs.copyFileSync(path.join(ROOT, 'src', 'maps', n + '.webp'), path.join(SITE, 'maps', 'img', n + '.webp'));
  const urls = [];
  const note = '<p class="note">地図は、ゲーム内の地図をそのまま載せています（手は加えていません）。© SQUARE ENIX CO., LTD.</p>';
  const crumb = (...p) => `<p class="crumb"><a href="${BASE}">トップ</a> › ${p.join(' › ')}</p>`;
  // 一覧（あいうえお順・名前で絞る）
  const kana = z => { const c = zname(z).normalize('NFKC')[0] || ''; const h = c.charCodeAt(0); return h >= 0x30a1 && h <= 0x30f6 ? String.fromCharCode(h - 0x60) : c; };
  const ROW = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
  const gyou = z => { const c = kana(z).normalize('NFD')[0]; const i = ROW.indexOf(c); return i < 0 ? 'そのほか' : ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'][[0, 5, 10, 15, 20, 25, 30, 35, 38, 43].filter(x => x <= i).length - 1] + '行'; };
  const groups = new Map(); for (const z of zones) { const g = gyou(z); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(z); }
  const rel = 'maps/index.html';
  fs.writeFileSync(path.join(SITE, rel), head(`地図の一覧（${zones.length}エリア・${list.length}枚）｜${SITE_SHORT}`, `FF11のゲーム内の地図を、エリアごとに${list.length}枚。手を加えていない元の地図です。`, `${ORIGIN}/${rel}`)
    + `<main class="wide">${crumb('地図')}<h1>地図 <span class="cnt">${zones.length}エリア・${list.length}枚</span></h1>
<p class="lead">ゲーム内の地図を、エリアごとに見られます。階や区画が分かれているエリアは、全部の地図が並びます。</p>
<div class="row"><label>名前</label><input type="search" class="tfilter" data-for="mz" placeholder="エリアの名前の一部で絞る（日本語・英語）"></div>
<nav class="bands">${[...groups].map(([g, l]) => `<a href="#mg-${g}" data-band="${g}">${g}<span>${l.length}</span></a>`).join('')}</nav>
<div class="tbl simple mz" id="mz"><div class="r h"><div class="c-n">エリア</div><div class="c-fx">英語名</div><div class="c-x">地図</div></div>${[...groups].map(([g, l]) => `<div class="band" id="mg-${g}" data-band="${g}">${g} <span>${l.length}件</span></div>${l.map(z => `<div class="r"><div class="c-n"><a href="${BASE}maps/${z}.html">${esc(zname(z))}</a></div><div class="c-fx">${esc(zen(z))}</div><div class="c-x">${byZone.get(z).length}枚</div></div>`).join('')}`).join('')}</div>
${note}</main><script src="${BASE}list.js?v=${VER}"></script>` + foot);
  urls.push(`${ORIGIN}/${rel}`);
  // エリアごと
  for (const z of zones) {
    const l = byZone.get(z).sort((a, b) => a[1] - b[1]);
    const r2 = `maps/${z}.html`;
    fs.writeFileSync(path.join(SITE, r2), head(`${zname(z)}の地図｜${SITE_SHORT}`, `FF11 ${zname(z)}（${zen(z)}）のゲーム内の地図${l.length > 1 ? `${l.length}枚` : ''}。`, `${ORIGIN}/${r2}`)
      + `<main class="wide">${crumb(`<a href="${BASE}maps/index.html">地図</a>`, esc(zname(z)))}<h1>${esc(zname(z))} <span class="cnt">${esc(zen(z))}</span></h1>
<div class="maps">${l.map(([n], i) => `<figure><a href="${BASE}maps/img/${n}.webp" target="_blank" rel="noopener"><img src="${BASE}maps/img/${n}.webp" width="512" height="512" loading="${i < 2 ? 'eager' : 'lazy'}" alt="${esc(zname(z))}の地図${l.length > 1 ? ' ' + (i + 1) : ''}"></a>${l.length > 1 ? `<figcaption>地図 ${i + 1} / ${l.length}</figcaption>` : ''}</figure>`).join('')}</div>
${note}</main>` + foot);
    urls.push(`${ORIGIN}/${r2}`);
  }
  const home = `<section class="box" id="map"><h2>地図（${zones.length}エリア・${list.length}枚）<a class="all" href="${BASE}maps/index.html">一覧へ</a></h2><p class="note" style="margin:0 0 10px">ゲーム内の地図を、手を加えずにエリアごとに。</p><div class="tiles">${tile(`${BASE}maps/index.html`, '地図の一覧', zones.length, '地', 'ex hot')}${['バストゥーク港', '南サンドリア', '西アドゥリン', 'アトルガン白門', 'ジュノ上層'].map(ja => zones.find(z => zname(z) === ja)).filter(Boolean).map(z => tile(`${BASE}maps/${z}.html`, zname(z), byZone.get(z).length, '地', 'ex')).join('')}</div></section>`;
  return { home, urls, count: list.length, zones: new Set(zones), zname };
}
