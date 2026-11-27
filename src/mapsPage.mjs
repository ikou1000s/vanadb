// 地図：ゲーム内の地図をそのまま（手を加えず）エリアごとに見せる → maps/index.html・maps/<エリア番号>.html
// 絵は家PCのFF11の地図ファイルから書き出した物（src/maps/*.webp・src/maps.json＝[名前, エリア番号, 階]）。毎日の組み立てでは作り直さない。
import fs from 'node:fs';
import path from 'node:path';
import { readLua } from './lua.mjs';

const REGIONS = [
  ['三国・ジュノ', [['Sandoria', 'サンドリア'], ['Bastok', 'バストゥーク'], ['Windurst', 'ウィンダス'], ['Jeuno', 'ジュノ']]],
  ['中の国', [['Ronfaure', 'ロンフォール'], ['Zulkheim', 'ザルクヘイム'], ['Norvallen', 'ノルバレン'], ['Gustaberg', 'グスタベルグ'], ['Derfland', 'デルフラント'], ['Sarutabaruta', 'サルタバルタ'], ['Kolshushu', 'コルシュシュ'], ['Aragoneu', 'アラゴーニュ'], ['Fauregandi', 'フォルガンディ'], ['Valdeaunia', 'ヴァルドニア'], ['QufimIsland', 'クフィム'], ['Litelor', 'リ・テロア'], ['Kuzotz', 'クゾッツ'], ['Vollbow', 'ヴォルボー'], ['ElshimoLowlands', 'エルシモ低地'], ['ElshimoUplands', 'エルシモ高地'], ['Tulia', 'トゥー・リア'], ['Movalpolos', 'ムバルポロス'], ['TavnazianArchipelago', 'タブナジア群島']]],
  ['プロマシア', [['TavnazianMarquisate', 'タブナジア侯国'], ['Lumoria', 'ルモリア'], ['Riverne', 'リヴェーヌ岩塊群'], ['Promyvion', 'プロミヴォン']]],
  ['アトルガン', [['WestAhtUrhgan', '西アトルガン'], ['MamoolJaSavage', 'マムージャ蕃国'], ['Halvung', 'ハルブーン'], ['Arrapago', 'アラパゴ'], ['Alzadaal', 'アルザダール']]],
  ['アルタナ（過去）', [['RonfaureFront', 'ロンフォール〔S〕'], ['NorvallenFront', 'ノルバレン〔S〕'], ['GustabergFront', 'グスタベルグ〔S〕'], ['DerflandFront', 'デルフラント〔S〕'], ['SarutabarutaFront', 'サルタバルタ〔S〕'], ['AragoneuFront', 'アラゴーニュ〔S〕'], ['FauregandiFront', 'フォルガンディ〔S〕'], ['ValdeauniaFront', 'ヴァルドニア〔S〕']]],
  ['アドゥリン', [['AdoulinIslands', 'アドゥリン諸島'], ['EastUlbuka', '東ウルブカ'], ['Ulbuka', 'ウルブカ']]],
  ['そのほかのエリア', [['Abyssea', 'アビセア'], ['Dynamis', 'デュナミス'], ['Escha', 'エスカ・醴泉島'], ['Abdhaljs', 'アブダルス'], ['Ships', '船・飛空艇'], ['Other', 'そのほか']]],
];
// 地方の対応表に無いエリア（船・アドゥリンの一部・エスカなど）
const EXTRA = { 29: 'Riverne', 30: 'Riverne', 46: 'Ships', 47: 'Ships', 58: 'Ships', 59: 'Ships', 220: 'Ships', 221: 'Ships', 223: 'Ships', 224: 'Ships', 225: 'Ships', 226: 'Ships', 263: 'Ulbuka', 264: 'Ulbuka', 266: 'Ulbuka', 267: 'Ulbuka', 272: 'Ulbuka', 273: 'Ulbuka', 274: 'Ulbuka', 275: 'Ulbuka', 276: 'Ulbuka', 288: 'Escha', 289: 'Escha', 291: 'Escha' };

export function writeMaps(ctx) {
  const { ROOT, SITE, DATA, head, foot, esc, BASE, ORIGIN, SITE_SHORT, VER, tile, lsb } = ctx;
  const ZR = (lsb && lsb.zoneRegion) || {};
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
  const note = '<p class="note">© SQUARE ENIX CO., LTD.</p>';
  const crumb = (...p) => `<p class="crumb"><a href="${BASE}">トップ</a> › ${p.join(' › ')}</p>`;
  // 一覧：地方ごと（三国・中の国・プロマシア・アトルガン・アルタナ・アドゥリン・そのほか）
  const regOf = z => { const k = ZR[z] || EXTRA[z] || 'Other'; return REGIONS.some(([, l]) => l.some(([x]) => x === k)) ? k : 'Other'; };
  const groups = new Map();
  for (const [era, l] of REGIONS) for (const [k, ja] of l) { const zs = zones.filter(z => regOf(z) === k); if (zs.length) groups.set(k, [era, ja, zs]); }
  const ERA_ID = new Map(REGIONS.map(([e], i) => [e, 'me-' + i]));
  const rel = 'maps/index.html';
  fs.writeFileSync(path.join(SITE, rel), head(`地図の一覧（${zones.length}エリア・${list.length}枚）｜${SITE_SHORT}`, `FF11のゲーム内の地図を、エリアごとに${list.length}枚。手を加えていない元の地図です。`, `${ORIGIN}/${rel}`)
    + `<main class="wide">${crumb('地図')}<h1>地図 <span class="cnt">${zones.length}エリア・${list.length}枚</span></h1>
<p class="lead">ゲーム内の地図を、地方ごとに分けています。階や区画が分かれているエリアは、全部の地図が並びます。マウント・ペットが使えるかなどは <a href="${BASE}zones.html">エリアの一覧</a> で。</p>
<div class="row"><label>名前</label><input type="search" class="tfilter" data-for="mz" placeholder="エリアの名前の一部で絞る（日本語・英語）"></div>
<nav class="catnav mreg">${REGIONS.filter(([e]) => [...groups.values()].some(([x]) => x === e)).map(([e]) => `<div><span class="lbl">${e}</span>${[...groups].filter(([, [x]]) => x === e).map(([k, [, ja, zs]]) => `<a href="#mg-${k}">${ja}<span class="cnt">${zs.length}</span></a>`).join('')}</div>`).join('')}</nav>
<div class="tbl simple mz" id="mz"><div class="r h"><div class="c-n">エリア</div><div class="c-fx">英語名</div><div class="c-x">地図</div></div>${[...groups].map(([k, [era, ja, l]]) => `<div class="band" id="mg-${k}" data-band="${ja}">${ja}<small class="era">${era}</small> <span>${l.length}件</span></div>${l.map(z => `<div class="r"><div class="c-n"><a href="${BASE}maps/${z}.html">${esc(zname(z))}</a></div><div class="c-fx">${esc(zen(z))}</div><div class="c-x">${byZone.get(z).length}枚</div></div>`).join('')}`).join('')}</div>
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
  const home = `<section class="box" id="map"><h2>地図（${zones.length}エリア・${list.length}枚）<a class="all" href="${BASE}maps/index.html">一覧へ</a></h2><div class="tiles">${tile(`${BASE}maps/index.html`, '地図の一覧', zones.length, '地', 'ex hot')}${['バストゥーク港', '南サンドリア', '西アドゥリン', 'アトルガン白門', 'ジュノ上層'].map(ja => zones.find(z => zname(z) === ja)).filter(Boolean).map(z => tile(`${BASE}maps/${z}.html`, zname(z), byZone.get(z).length, '地', 'ex')).join('')}</div></section>`;
  return { home, urls, count: list.length, zones: new Set(zones), zname };
}
