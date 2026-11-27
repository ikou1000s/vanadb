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
<p class="lead">ゲーム内の地図を、地方ごとに分けています。階や区画が分かれているエリアは、全部の地図が並びます。世界地図から地方をたどるなら <a href="${BASE}maps/regions.html">リージョンの地図</a>。マウント・ペットが使えるかなどは <a href="${BASE}zones.html">エリアの一覧</a> で。</p>
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
  // つながり地図：出入り口の座標から並べた、エリアの地図のつながり（src/world.json・tools/world で作る）
  const worldF = path.join(ROOT, 'src', 'world.json');
  let worldN = 0;
  if (fs.existsSync(worldF)) {
    const W = JSON.parse(fs.readFileSync(worldF, 'utf8'));
    const firstMap = new Map(); for (const [n, z] of list) if (!firstMap.has(z)) firstMap.set(z, n);
    const nameOfComp = c => { const ns = c.map(z => zname(z.id)); if (ns.some(n => /ジュノ港/.test(n))) return '中の国（三国・ジュノのまわり）'; if (ns.some(n => /〔Ｓ〕|〔S〕/.test(n))) return 'アルタナ（過去の中の国）'; if (ns.some(n => /アトルガン白門/.test(n))) return 'アトルガン'; if (ns.some(n => /西アドゥリン/.test(n))) return 'アドゥリン'; return ns.slice(0, 2).join('・') + 'のあたり'; };
    const svg = c => {
      const S = 0.2, pad = 70, sz = z => Math.min(150, Math.max(56, z.w * S * 0.55));
      const minx = Math.min(...c.map(z => z.x)), maxx = Math.max(...c.map(z => z.x)), minz = Math.min(...c.map(z => z.z)), maxz = Math.max(...c.map(z => z.z));
      const X = x => (x - minx) * S + pad, Y = z => (maxz - z) * S + pad;
      const w = Math.round((maxx - minx) * S + pad * 2), h = Math.round((maxz - minz) * S + pad * 2 + 20);
      const ids = new Set(c.map(z => z.id)), by = new Map(c.map(z => [z.id, z])), seen = new Set();
      const ls = W.links.filter(([a, b]) => a !== b && ids.has(a) && ids.has(b)).filter(([a, b]) => { const k = Math.min(a, b) + '-' + Math.max(a, b); if (seen.has(k)) return false; seen.add(k); return true; });
      return `<svg class="wmap" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${ls.map(([a, b]) => `<line x1="${X(by.get(a).x).toFixed(0)}" y1="${Y(by.get(a).z).toFixed(0)}" x2="${X(by.get(b).x).toFixed(0)}" y2="${Y(by.get(b).z).toFixed(0)}" class="wl"/>`).join('')}${c.map(z => { const q = sz(z); return `<a href="${BASE}maps/${z.id}.html"><title>${esc(zname(z.id))}</title><image href="${BASE}maps/img/${firstMap.get(z.id)}.webp" x="${(X(z.x) - q / 2).toFixed(0)}" y="${(Y(z.z) - q / 2).toFixed(0)}" width="${q.toFixed(0)}" height="${q.toFixed(0)}"/><text x="${X(z.x).toFixed(0)}" y="${(Y(z.z) + q / 2 + 13).toFixed(0)}" class="wt${z.c ? ' wc' : ''}">${esc(zname(z.id))}</text></a>`; }).join('')}</svg>`;
    };
    const comps = W.comps.map(c => c.filter(z => firstMap.has(z.id) && zones.includes(z.id))).filter(c => c.length >= 2);
    { const used = new Map(); const base = nameOfComp; const names = comps.map(c => { const n = base(c); const k = (used.get(n) || 0) + 1; used.set(n, k); return k > 1 ? n + '（その' + k + '）' : n; }); const nm = new Map(comps.map((c, k) => [c, names[k]])); var nameOf2 = c => nm.get(c); }
    worldN = comps.reduce((a, c) => a + c.length, 0);
    fs.writeFileSync(path.join(SITE, 'maps', 'world.html'), head(`つながり地図｜エリアの地図を出入り口のつながりで並べた物｜${SITE_SHORT}`, 'FF11のエリアの地図を、出入り口の位置からおおよその場所に並べ、隣り合うエリアを線で結んだ「つながり地図」。', `${ORIGIN}/maps/world.html`)
      + `<main class="wide">${crumb(`<a href="${BASE}maps/index.html">地図</a>`, 'つながり地図')}<h1>つながり地図 <span class="cnt">${worldN}エリア</span></h1>
<p class="lead">屋外と街のエリアの地図を、出入り口の座標からおおよその場所に置き、行き来できるエリアを線で結びました。大きさや細かい位置は目安です（洞窟やダンジョンを通るつながりは入れていないので、塊が分かれている所があります）。絵を押すとそのエリアの地図へ。</p>
<nav class="catnav"><div><span class="lbl">塊</span>${comps.map((c, k) => `<a href="#w${k}">${esc(nameOf2(c))}<span class="cnt">${c.length}</span></a>`).join('')}</div></nav>
${comps.map((c, k) => `<h2 id="w${k}">${esc(nameOf2(c))} <span class="cnt">${c.length}エリア</span></h2><div class="wbox">${svg(c)}</div>`).join('\n')}
<p class="note">© SQUARE ENIX CO., LTD.</p></main>` + foot);
    urls.push(`${ORIGIN}/maps/world.html`);
  }
  // リージョンの地図：ゲームのメニューにある世界地図（中の国・アトルガン・ウルブカ）と国の全体図（src/regions/*.webp・tools/maps/README.md の「リージョンの地図」）
  const RG = [
    ['rg_middle', '中の国（クォン大陸・ミンダルシア大陸）', 'ゲームのリージョンマップ（コンクエストの地図）。三国・ジュノ、プロマシア、アルタナ（過去）のエリアもこの地図の上にあります。', ['三国・ジュノ', '中の国', 'プロマシア', 'アルタナ（過去）']],
    ['rg_east', 'アトルガン（東の大陸）', 'アトルガン皇国のあたりのリージョンマップ。', ['アトルガン']],
    ['rg_west', 'ウルブカ（西の大陸）', 'アドゥリンとウルブカのリージョンマップ。', ['アドゥリン']],
  ];
  // 世界地図同士の並び（西のウルブカ・中の国・東のアトルガン）。行き方は書かず、方角だけ
  const NB = { rg_middle: [['W', 'rg_west'], ['E', 'rg_east']], rg_east: [['W', 'rg_middle']], rg_west: [['E', 'rg_middle']] };
  const NATION = [['rg_san', 'Sandoria'], ['rg_bas', 'Bastok'], ['rg_win', 'Windurst'], ['rg_jun', 'Jeuno']];
  let rgN = 0;
  if (fs.existsSync(path.join(ROOT, 'src', 'regions'))) {
    const have = RG.concat(NATION.map(([n]) => [n])).filter(([n]) => fs.existsSync(path.join(ROOT, 'src', 'regions', n + '.webp')));
    for (const [n] of have) fs.copyFileSync(path.join(ROOT, 'src', 'regions', n + '.webp'), path.join(SITE, 'maps', 'img', n + '.webp'));
    const hv = new Set(have.map(([n]) => n));
    const chips = k => { const g = groups.get(k); return g ? `<div class="rgz"><b><a href="${BASE}maps/index.html#mg-${k}">${g[1]}</a></b><span class="chips">${g[2].map(z => `<a class="chip" href="${BASE}maps/${z}.html">${esc(zname(z))}</a>`).join('')}</span></div>` : ''; };
    const fig = (n, alt) => `<figure><a href="${BASE}maps/img/${n}.webp" target="_blank" rel="noopener"><img src="${BASE}maps/img/${n}.webp" width="512" height="512" loading="lazy" alt="${esc(alt)}"></a></figure>`;
    const secs = RG.filter(([n]) => hv.has(n)).map(([n, ttl, lead, eras], i) => {
      const ks = REGIONS.filter(([e]) => eras.includes(e)).flatMap(([e, l]) => l.map(([k]) => k)).filter(k => groups.has(k));
      rgN += ks.length;
      const nat = i === 0 ? NATION.filter(([m]) => hv.has(m)) : [];
      const nb = (NB[n] || []).filter(([, m]) => hv.has(m));
      return `<h2 id="${n}">${ttl}</h2><p class="lead">${lead}</p>${nb.length ? `<p class="rgnb">隣の大陸：${nb.map(([d, m]) => `<a href="#${m}">${d === 'W' ? '← 西の' : '東の'}${RG.find(r => r[0] === m)[1].replace(/（.*/, '')}${d === 'E' ? ' →' : ''}</a>`).join('　')}</p>` : ''}<div class="maps rgw">${fig(n, ttl + 'のリージョンマップ')}<div class="rgl">${ks.map(chips).join('')}</div></div>${nat.length ? `<h3>国の全体図</h3><div class="maps">${nat.map(([m, k]) => `<figure>${fig(m, (groups.get(k) || [, k])[1] + 'の全体図').replace(/^<figure>|<\/figure>$/g, '')}<figcaption><a href="${BASE}maps/index.html#mg-${k}">${(groups.get(k) || [, k])[1]}</a>の全体図</figcaption></figure>`).join('')}</div>` : ''}`;
    });
    if (secs.length) {
      fs.writeFileSync(path.join(SITE, 'maps', 'regions.html'), head(`リージョンの地図｜中の国・アトルガン・ウルブカの世界地図｜${SITE_SHORT}`, 'FF11のゲーム内のリージョンマップ（中の国・アトルガン・ウルブカ）と三国・ジュノの全体図。地方ごとに、そのエリアの地図へ行けます。', `${ORIGIN}/maps/regions.html`)
        + `<main class="wide">${crumb(`<a href="${BASE}maps/index.html">地図</a>`, 'リージョンの地図')}<h1>リージョンの地図 <span class="cnt">${rgN}地方</span></h1>
<p class="lead">ゲームのメニューにあるリージョンマップ（世界地図）を、手を加えずに載せています。地図の横の地方の名前・エリアの名前を押すと、そのエリアの地図へ。エリア同士の出入り口のつながりは <a href="${BASE}maps/world.html">つながり地図</a> で。</p>
<nav class="catnav"><div><span class="lbl">地図</span>${RG.filter(([n]) => hv.has(n)).map(([n, t]) => `<a href="#${n}">${t.replace(/（.*/, '')}</a>`).join('')}</div></nav>
${secs.join('\n')}
<p class="note">© SQUARE ENIX CO., LTD.</p></main>` + foot);
      urls.push(`${ORIGIN}/maps/regions.html`);
    }
  }
  // トップの節：地図の一覧・つながり地図・時代や地方の括り
  const eraTiles = REGIONS.map(([era, l]) => { const ks = l.map(([k]) => k).filter(k => groups.has(k)); if (!ks.length) return ''; const n = ks.reduce((a, k) => a + groups.get(k)[2].length, 0); return tile(`${BASE}maps/index.html#mg-${ks[0]}`, era, n, era[0], 'ex'); }).join('');
  const home = `<section class="box" id="map"><h2>地図（${zones.length}エリア・${list.length}枚）<a class="all" href="${BASE}maps/index.html">一覧へ</a></h2><div class="tiles">${tile(`${BASE}maps/index.html`, '地図の一覧', zones.length, '地', 'ex hot')}${rgN ? tile(`${BASE}maps/regions.html`, 'リージョンの地図', rgN, '世', 'ex hot') : ''}${worldN ? tile(`${BASE}maps/world.html`, 'つながり地図', worldN, '繋', 'ex hot') : ''}${eraTiles}</div></section>`;
  return { home, urls, count: list.length, zones: new Set(zones), zname };
}
