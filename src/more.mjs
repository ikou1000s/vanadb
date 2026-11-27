// 装備以外：アイテム（全部）・だいじなもの・魔法・ウェポンスキル・アビリティ
// build.mjs から writeMore(ctx) で呼ぶ。返り値：トップに出す節（home）・サイトマップのURL（urls）
import fs from 'node:fs';
import path from 'node:path';
import { readLua } from './lua.mjs';

const ELEMENT_JA = { 0: '火', 1: '氷', 2: '風', 3: '土', 4: '雷', 5: '水', 6: '光', 7: '闇', 15: '—' };
const SC_JA = { Light: '光', Darkness: '闇', Fusion: '核熱', Fragmentation: '分解', Distortion: '湾曲', Gravitation: '重力', Transfixion: '貫通', Compression: '収縮', Liquefaction: '溶解', Scission: '切断', Reverberation: '振動', Impaction: '衝撃', Detonation: '炸裂', Induration: '硬化', Radiance: '極光', Umbra: '黒闇' };
const KI_JA = { 'Permanent Key Items': '永続的なだいじなもの', 'Temporary Key Items': '一時的なだいじなもの', 'Magical Maps': '地図', Mounts: 'マウント', 'Claim Slips': '預かり証（クレームスリップ）', Abyssea: 'アビセア', Voidwatch: 'ヴォイドウォッチ', 'Mog Garden': 'モグガーデン', 'Geas Fete': 'ギアスフェット', 'Active Effects': '効果中の物' };
const KI_KEY = { 'Permanent Key Items': 'permanent', 'Temporary Key Items': 'temporary', 'Magical Maps': 'maps', Mounts: 'mounts', 'Claim Slips': 'slips', Abyssea: 'abyssea', Voidwatch: 'voidwatch', 'Mog Garden': 'moggarden', 'Geas Fete': 'geasfete', 'Active Effects': 'effects' };
const SPELL_TYPES = [['WhiteMagic', 'white', '白魔法'], ['BlackMagic', 'black', '黒魔法'], ['SummonerPact', 'summon', '召喚魔法'], ['Ninjutsu', 'ninjutsu', '忍術'], ['BardSong', 'song', '歌'], ['BlueMagic', 'blue', '青魔法'], ['Geomancy', 'geo', '風水魔法'], ['Trust', 'trust', 'フェイス']];
const JA_TYPES = [['JobAbility', 'job', 'ジョブアビリティ'], ['PetCommand', 'pet', 'ペットコマンド'], ['CorsairRoll', 'roll', 'ファントムロール'], ['CorsairShot', 'shot', 'クイックドロー'],
  ['Samba', 'samba', 'サンバ'], ['Waltz', 'waltz', 'ワルツ'], ['Jig', 'jig', 'ジグ'], ['Step', 'step', 'ステップ'], ['Flourish1', 'flourish1', 'フラリッシュI'], ['Flourish2', 'flourish2', 'フラリッシュII'], ['Flourish3', 'flourish3', 'フラリッシュIII'],
  ['Scholar', 'stratagem', '戦術魔道書'], ['Rune', 'rune', 'ルーン'], ['Ward', 'ward', 'ワード'], ['Effusion', 'effusion', 'エフューズ'], ['BloodPactRage', 'bp-rage', '契約の履行：神獣'], ['BloodPactWard', 'bp-ward', '契約の履行：験術'], ['Monster', 'monster', 'モンストロス']];

export function writeMore(ctx) {
  const { items, desc, JOB_LIST, skills, head, foot, esc, BASE, ORIGIN, SITE, DATA, SITE_SHORT, equipById, synth, tile, VER, rxBadges, rxTags, lsb, acqHtml } = ctx;
  const urls = [];
  const write = (rel, html) => { const f = path.join(SITE, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); urls.push(`${ORIGIN}/${rel}`); };
  const load = f => (fs.existsSync(path.join(DATA, f)) ? readLua(path.join(DATA, f)) : new Map());
  const keyItems = load('key_items.lua'), spells = load('spells.lua'), wss = load('weapon_skills.lua'), abils = load('job_abilities.lua');
  const crumb = (...parts) => `<p class="crumb"><a href="${BASE}">トップ</a>${parts.map(p => ` › ${p}`).join('')}</p>`;
  const ffo = ja => `https://wiki.ffo.jp/search.cgi?CCC=%E6%84%9B&amp;Command=Search&amp;qf=${encodeURIComponent(ja)}&amp;order=match&amp;ffotype=title&amp;type=title`;
  const iname = id => (items.get(id) || {}).ja || `#${id}`;
  const ilink = id => (items.get(id) && (equipById.has(id) || itemCatOf.has(id)) ? `<a href="${BASE}item/${id}.html">${esc(iname(id))}</a>` : esc(iname(id)));
  const pager = (pages, cur, base) => pages > 1 ? `<nav class="pager">${Array.from({ length: pages }, (_, i) => i === cur ? `<b>${i + 1}</b>` : `<a href="${BASE}${base}${i ? '-' + (i + 1) : ''}.html">${i + 1}</a>`).join('')}</nav>` : '';
  const PAGE = 600;

  // ── 合成：作り方（結果→レシピ）と使い道（素材→結果）
  const madeBy = new Map(), usedIn = new Map();
  for (const r of synth) {
    for (const res of [r.result, ...r.hq]) if (res) { if (!madeBy.has(res)) madeBy.set(res, []); if (!madeBy.get(res).includes(r)) madeBy.get(res).push(r); }
    for (const [ing] of r.ings) { if (!usedIn.has(ing)) usedIn.set(ing, new Set()); usedIn.get(ing).add(r.result); }
  }

  // ── アイテム（装備以外）の分け方
  const scrollSpell = new Map(); // スクロールの英名 → 魔法
  for (const s of spells.values()) if (s.en) scrollSpell.set(s.en.toLowerCase(), s);
  const ITEM_CATS = [
    ['material', '合成素材', '素'], ['food', '食事（効果つき）', '食'], ['medicine', '薬品・使う物', '薬'], ['scroll', '魔法の巻物（スクロール）', '巻'],
    ['furnishing', '調度品', '調'], ['automaton', 'オートマトン', '機'], ['crystal', 'クリスタル', '晶'], ['maze', 'メイズモンガー', '迷'], ['other', 'その他のアイテム', '他'],
  ];
  const itemCatOf = new Map();
  for (const [id, it] of items) {
    if (it.category === 'Armor' || it.category === 'Weapon' || !it.ja || it.ja === '.' || it.category === 'Gil') continue;
    const d = ((desc.get(id) || {}).ja || '');
    let c = 'other';
    if (it.category === 'Automaton') c = 'automaton';
    else if (it.category === 'Maze') c = 'maze';
    else if (it.type === 8) c = 'crystal';
    else if (it.type === 10) c = 'furnishing';
    else if (it.category === 'Usable' && /^scroll of /i.test(it.en || '')) c = 'scroll';
    else if (it.category === 'Usable' && /[+＋]\d/.test(d) && !/秘薬|薬|『|入った/.test(d)) c = 'food';
    else if (it.category === 'Usable') c = 'medicine';
    else if (usedIn.has(id)) c = 'material';
    itemCatOf.set(id, c);
  }
  const itemRow = id => {
    const it = items.get(id), d = ((desc.get(id) || {}).ja || '').trim();
    return `<div class="r" data-id="${id}"><div class="c-n"><a href="${BASE}item/${id}.html">${esc(it.ja)}</a>${rxTags(id)}<small>${esc(it.en)}</small></div><div class="c-st">${it.stack > 1 ? `×${it.stack}` : ''}</div>`
      + `<div class="c-fx">${esc(d.replace(/\n+/g, '　')) || '<span class="nl">（説明なし）</span>'}${madeBy.has(id) ? ' <b class="tag">合成で作れる</b>' : ''}${usedIn.has(id) ? ` <b class="tag">素材（${usedIn.get(id).size}品）</b>` : ''}</div></div>`;
  };
  const itemHead = '<div class="r h"><div class="c-n">名前</div><div class="c-st">スタック</div><div class="c-fx">説明（ゲーム内の表記）</div></div>';
  const itemCount = new Map();
  for (const [key, ja] of ITEM_CATS) {
    const list = [...itemCatOf].filter(([, c]) => c === key).map(([id]) => id).sort((a, b) => iname(a).localeCompare(iname(b), 'ja'));
    itemCount.set(key, list.length);
    const pages = Math.ceil(list.length / PAGE);
    for (let p = 0; p < pages; p++) {
      const part = list.slice(p * PAGE, (p + 1) * PAGE);
      write(`items/${key}${p ? '-' + (p + 1) : ''}.html`, head(`${ja}の一覧（${list.length.toLocaleString()}件${pages > 1 ? `・${p + 1}/${pages}` : ''}）｜${SITE_SHORT}`,
        `FF11の${ja}${list.length.toLocaleString()}件の一覧。名前・説明（ゲーム内の表記）・スタック数と、合成で作れるか・素材として使えるか。`, `${ORIGIN}/items/${key}${p ? '-' + (p + 1) : ''}.html`)
        + `<main class="wide">${crumb('アイテム', esc(ja))}<h1>${esc(ja)} <span class="cnt">${list.length.toLocaleString()}件</span></h1>
${catNavItems(key)}${pager(pages, p, `items/${key}`)}
<div class="tbl items" data-ck="it">${itemHead}${part.map(itemRow).join('')}</div>${pager(pages, p, `items/${key}`)}</main><script src="${BASE}list.js?v=${VER}"></script>` + foot);
    }
  }
  function catNavItems(cur) { return `<nav class="catnav"><div><span class="lbl">アイテム</span>${ITEM_CATS.map(([k, ja]) => k === cur ? `<b>${esc(ja)}</b>` : `<a href="${BASE}items/${k}.html">${esc(ja)}</a>`).join('')}</div></nav>`; }

  // ── 食事の効果で探す（説明文を効果に分ける：「攻+12% (最大75)」→ 割合12・上限75）
  const FOOD_RE = /(ペット[:：])|([^\s\n+\-:：＋"「」（）()\[\]『』×]+?)([+\-＋]\d+)(%?)(?:\s*[（(]最大(\d+)[）)])?/g;
  const parseFood = d => {
    const s = {}, p = {}; let tgt = s;
    for (const m of d.matchAll(FOOD_RE)) {
      if (m[1]) { tgt = p; continue; }
      const k = m[2] + (m[4] ? '%' : ''), v = Number(m[3].replace('＋', '+'));
      if (!(k in tgt)) tgt[k] = m[5] ? [v, Number(m[5])] : [v];
    }
    return { s, p };
  };
  const foods = [...itemCatOf].filter(([, c]) => c === 'food').map(([id]) => {
    const it = items.get(id), d = ((desc.get(id) || {}).ja || '').trim();
    const { s, p } = parseFood(d);
    return { i: id, n: it.ja, e: it.en, d: d.replace(/\n+/g, '　'), s, p };
  }).filter(f => Object.keys(f.s).length || Object.keys(f.p).length);
  const foodStats = new Map(), petStats = new Map();
  for (const f of foods) { for (const k of Object.keys(f.s)) foodStats.set(k, (foodStats.get(k) || 0) + 1); for (const k of Object.keys(f.p)) petStats.set(k, (petStats.get(k) || 0) + 1); }
  const FOOD_GENRES = [
    ['基本', ['HP', 'HP%', 'MP', 'MP%', 'STR', 'DEX', 'VIT', 'AGI', 'INT', 'MND', 'CHR']],
    ['物理', ['命中', '命中%', '攻', '攻%', 'ストアTP', 'ダブルアタック%', 'トリプルアタック%', 'ウェポンスキルのダメージ%']],
    ['遠隔', ['飛命', '飛命%', '飛攻', '飛攻%']],
    ['魔法', ['魔攻', '魔命', '魔命%', '魔防', '魔回避', '魔回避%', 'ファストキャスト%', 'マジックバーストダメージII']],
    ['防御', ['防', '防%', '回避', '回避%', '敵対心', 'モクシャ', 'カウンター']],
    ['回復', ['リジェネ', 'リフレシュ', 'ヒーリングHP', 'ヒーリングMP']],
  ];
  const fUsed = new Set(FOOD_GENRES.flatMap(([, l]) => l));
  const fAuto = (name, test) => { const l = [...foodStats.keys()].filter(k => !fUsed.has(k) && test(k)).sort((a, b) => foodStats.get(b) - foodStats.get(a)); l.forEach(k => fUsed.add(k)); return [name, l]; };
  FOOD_GENRES.push(fAuto('キラー・レジスト・耐性', k => /キラー$|^レジスト|^耐/.test(k)));
  FOOD_GENRES.push(fAuto('合成・釣り', k => /合成|ハイクォリティー|釣り/.test(k)));
  FOOD_GENRES.push(fAuto('そのほか', () => true));
  const foodGenres = FOOD_GENRES.map(([g, l]) => [g, l.filter(k => foodStats.has(k)).map(k => [k, foodStats.get(k)])]).filter(([, l]) => l.length);
  const petList = [...petStats].sort((a, b) => b[1] - a[1]);
  write('food.html', head(`食事の効果で探す（${foods.length}品）｜攻・命中・魔攻・リジェネなど｜${SITE_SHORT}`,
    `FF11の食事${foods.length}品を、効果（攻%・命中・飛攻・魔攻・魔命・リジェネ・リフレシュ・ストアTPなど）の大きい順に並べられます。割合の物は上限（最大）でも比べられます。`, `${ORIGIN}/food.html`)
    + `<main class="finder">${crumb('アイテム', '食事の効果で探す')}<h1>食事の効果で探す <span class="cnt">${foods.length}品</span></h1>
<p class="lead">効果のボタンを押すと、その効果が大きい順に並びます。「攻+12%（最大75）」のような割合の物は、上限（最大）の大きい順に並べ、同じなら割合で並べます。ペットへの効果は下の段で選べます。</p>
<div class="ctl"><div class="row"><label>効果</label><div class="statpick" id="fpick"></div></div>
<div class="row"><label>名前</label><input id="fq" type="search" placeholder="食事の名前の一部（日本語・英語）"></div></div>
<p id="fcount" class="count"></p><div id="flist" class="tbl foods"></div></main>
<script>window.FOOD=${JSON.stringify({ foods, genres: foodGenres, pet: petList }).replace(/</g, '\\u003c')};</script><script src="${BASE}food.js?v=${VER}"></script>` + foot);

  const foodById = new Map(foods.map(f => [f.i, f]));
  // アイテム1件のページ（作り方・使い道・スクロールの魔法）
  const SK = r => Object.entries(r.skills).map(([k, v]) => `<span class="bd">${esc(k)} ${v}</span>`).join('');
  for (const [id, c] of itemCatOf) {
    const it = items.get(id), d = ((desc.get(id) || {}).ja || '').trim();
    const cj = ITEM_CATS.find(x => x[0] === c);
    const made = madeBy.get(id) || [];
    const uses = [...(usedIn.get(id) || [])].filter(x => items.get(x));
    const sp = c === 'scroll' ? scrollSpell.get((it.en || '').replace(/^scroll of /i, '').toLowerCase()) : null;
    write(`item/${id}.html`, head(`${it.ja}｜${cj[1]}｜${SITE_SHORT}`,
      `${it.ja}（${cj[1]}）の説明${made.length ? '・作り方' : ''}${uses.length ? '・使い道（作れる物）' : ''}。` + d.replace(/\n/g, ' ').slice(0, 80), `${ORIGIN}/item/${id}.html`)
      + `<main class="item">${crumb(`<a href="${BASE}items/${c}.html">${esc(cj[1])}</a>`, esc(it.ja))}
<section class="ihead"><div class="nm"><h1>${esc(it.ja)}</h1><small>${esc(it.en)}</small></div>
<div class="badges"><a class="bd cat" href="${BASE}items/${c}.html">${esc(cj[1])}</a>${it.stack > 1 ? `<span class="bd">スタック ${it.stack}</span>` : '<span class="bd">スタックなし</span>'}${rxBadges(id)}</div></section>
<div class="ingame">${esc(d).replace(/\n/g, '<br>') || '（説明なし）'}</div>
<div class="extl"><a href="${ffo(it.ja)}" rel="noopener" target="_blank">FF11用語辞典で見る（入手方法など）</a><a href="https://www.bg-wiki.com/ffxi/${encodeURIComponent((it.en || '').replace(/ /g, '_'))}" rel="noopener" target="_blank">BG-Wiki（英語）</a><a href="https://jp.ffxiah.com/item/${id}" rel="noopener" target="_blank">FFXIAH（競売の相場）</a></div>
${foodById.has(id) ? `<h2>食事の効果</h2><ul class="stats">${Object.entries(foodById.get(id).s).map(([k, a]) => `<li><a href="${BASE}food.html?stat=${encodeURIComponent(k)}">${esc(k.replace(/%$/, ''))}</a> <b>${a[0] > 0 ? '+' : ''}${a[0]}${/%$/.test(k) ? '%' : ''}${a[1] != null ? `（最大${a[1]}）` : ''}</b></li>`).join('')}</ul>${Object.keys(foodById.get(id).p).length ? `<h2>ペットへの効果</h2><ul class="stats">${Object.entries(foodById.get(id).p).map(([k, a]) => `<li>${esc(k.replace(/%$/, ''))} <b>${a[0] > 0 ? '+' : ''}${a[0]}${/%$/.test(k) ? '%' : ''}${a[1] != null ? `（最大${a[1]}）` : ''}</b></li>`).join('')}</ul>` : ''}<p class="note">効果の名前を押すと、その効果の大きい順に食事が並びます（<a href="${BASE}food.html">食事の効果で探す</a>）。</p>` : ''}
${sp ? `<h2>この巻物で覚える魔法</h2><p><a class="bd cat" href="${BASE}spell/${sp.id}.html">${esc(sp.ja)}</a></p>` : ''}
${acqHtml(id) ? `<h2>入手方法</h2>${acqHtml(id)}` : ''}
${made.length ? `<h2>作り方（合成）</h2><p class="note">有志のサーバー再現データ（LandSandBoat）のレシピ。数値は参考。</p>${made.slice(0, 6).map(r => `<div class="recipe"><div class="rq">${SK(r)}<span class="bd">${esc(iname(r.crystal))}</span></div><div class="ri">${r.ings.map(([i, n]) => `${ilink(i)}${n > 1 ? ` ×${n}` : ''}`).join('　')}</div><div class="ro">→ NQ：${ilink(r.result)}${r.hq.filter(Boolean).length ? `　HQ：${[...new Set(r.hq.filter(Boolean))].map(ilink).join('・')}` : ''}</div></div>`).join('')}` : ''}
${uses.length ? `<h2>使い道（この素材で作れる物 ${uses.length}品）</h2><p class="same">${uses.sort((a, b) => iname(a).localeCompare(iname(b), 'ja')).slice(0, 120).map(x => (equipById.has(x) || itemCatOf.has(x)) ? `<a href="${BASE}item/${x}.html">${esc(iname(x))}</a>` : `<b>${esc(iname(x))}</b>`).join('')}</p>` : ''}
<p class="note">ドロップ・お店・報酬などの入手方法は、<a href="${ffo(it.ja)}" rel="noopener" target="_blank">FF11用語辞典の「${esc(it.ja)}」</a>を見てください。</p>
</main>` + foot);
  }

  // ── だいじなもの（種類ごと）
  const kiByCat = new Map();
  for (const k of keyItems.values()) { if (!k.ja || k.ja === '.') continue; const c = k.category || 'other'; if (!kiByCat.has(c)) kiByCat.set(c, []); kiByCat.get(c).push(k); }
  const kiCats = [...kiByCat.keys()].sort((a, b) => Object.keys(KI_JA).indexOf(a) - Object.keys(KI_JA).indexOf(b));
  const kiNav = cur => `<nav class="catnav"><div><span class="lbl">種類</span>${kiCats.map(c => c === cur ? `<b>${esc(KI_JA[c] || c)}</b>` : `<a href="${BASE}ki/${KI_KEY[c] || 'other'}.html">${esc(KI_JA[c] || c)}</a>`).join('')}</div></nav>`;
  for (const c of kiCats) {
    const list = kiByCat.get(c).sort((a, b) => a.id - b.id), key = KI_KEY[c] || 'other', ja = KI_JA[c] || c;
    const pages = Math.ceil(list.length / PAGE);
    for (let p = 0; p < pages; p++) {
      write(`ki/${key}${p ? '-' + (p + 1) : ''}.html`, head(`だいじなもの：${ja}（${list.length.toLocaleString()}件${pages > 1 ? `・${p + 1}/${pages}` : ''}）｜${SITE_SHORT}`,
        `FF11のだいじなもの「${ja}」${list.length.toLocaleString()}件の一覧（日本語名・英語名）。`, `${ORIGIN}/ki/${key}${p ? '-' + (p + 1) : ''}.html`)
        + `<main class="wide">${crumb('だいじなもの', esc(ja))}<h1>だいじなもの：${esc(ja)} <span class="cnt">${list.length.toLocaleString()}件</span></h1>${kiNav(c)}${pager(pages, p, `ki/${key}`)}
<div class="tbl ki" data-ck="ki"><div class="r h"><div class="c-n">名前</div><div class="c-fx">英語名</div><div class="c-x">用語辞典</div></div>${list.slice(p * PAGE, (p + 1) * PAGE).map(k => `<div class="r" data-id="${k.id}"><div class="c-n"><b>${esc(k.ja)}</b></div><div class="c-fx">${esc(k.en)}</div><div class="c-x"><a href="${ffo(k.ja)}" rel="noopener" target="_blank">見る</a></div></div>`).join('')}</div>${pager(pages, p, `ki/${key}`)}</main><script src="${BASE}list.js?v=${VER}"></script>` + foot);
    }
  }

  // ── 魔法（種類ごとの一覧・1件のページ）
  const parseLv = s => [...String(s || '').matchAll(/\[(\d+)\]\s*=\s*(\d+)/g)].map(m => [Number(m[1]), Number(m[2])]);
  const jobS = new Map(JOB_LIST.map(j => [j.id, j]));
  const lvText = s => parseLv(s.levels).map(([j, l]) => jobS.get(j) ? `<span class="lv1"><b>${esc(jobS.get(j).jas)}</b>${l}</span>` : '').join('');
  const tgt = t => [t & 1 ? '自分' : '', t & 0x0e ? '味方' : '', t & 32 ? '敵' : ''].filter(Boolean).join('・') || '—';
  const scrollOf = new Map(); for (const [id, c] of itemCatOf) if (c === 'scroll') scrollOf.set((items.get(id).en || '').replace(/^scroll of /i, '').toLowerCase(), id);
  const spNav = cur => `<nav class="catnav"><div><span class="lbl">魔法</span>${SPELL_TYPES.map(([, k, ja]) => k === cur ? `<b>${ja}</b>` : `<a href="${BASE}magic/${k}.html">${ja}</a>`).join('')}</div></nav>`;
  const spCount = new Map();
  const SC_NO = { 1: 'Transfixion', 2: 'Compression', 3: 'Liquefaction', 4: 'Scission', 5: 'Reverberation', 6: 'Detonation', 7: 'Induration', 8: 'Impaction', 9: 'Gravitation', 10: 'Distortion', 11: 'Fusion', 12: 'Fragmentation', 13: 'Light', 14: 'Darkness' };
  const traitsW = fs.existsSync(path.join(DATA, 'job_traits.lua')) ? readLua(path.join(DATA, 'job_traits.lua')) : new Map();
  const blueOf = s => (lsb && lsb.blue ? lsb.blue[s.id] : null);
  const blueTrait = b => { const t = b && lsb.blueTraits[b.cat]; return t && t[0] ? ((traitsW.get(t[0][1]) || {}).ja || '') : ''; };
  const blueSc = b => (b ? b.sc.map(n => SC_NO[n]).filter(Boolean).map(x => `<span class="sc sc-${x}">${esc(SC_JA[x] || x)}</span>`).join('') : '');
  for (const [type, key, ja] of SPELL_TYPES) {
    const list = [...spells.values()].filter(s => s.type === type && s.ja && s.ja !== '.')
      .sort((a, b) => (Math.min(...parseLv(a.levels).map(x => x[1]), 999) - Math.min(...parseLv(b.levels).map(x => x[1]), 999)) || a.id - b.id);
    spCount.set(key, list.length);
    write(`magic/${key}.html`, head(`${ja}の一覧（${list.length}件）｜覚えるジョブとLv・MP・詠唱｜${SITE_SHORT}`,
      `FF11の${ja}${list.length}件。覚えるジョブとレベル、消費MP、詠唱時間、再詠唱、属性、対象${key === 'blue' ? '、セットポイント、付く特性、連携属性' : ''}を一覧で。`, `${ORIGIN}/magic/${key}.html`)
      + `<main class="wide">${crumb('魔法', ja)}<h1>${ja} <span class="cnt">${list.length}件</span></h1>${spNav(key)}${jobChipsFor(list)}
<div class="tbl spells${key === 'blue' ? ' blue' : ''}" data-ck="sp"><div class="r h"><div class="c-n">名前</div><div class="c-jl">覚えるジョブとLv</div><div class="c-m">MP</div><div class="c-m">詠唱</div><div class="c-m">再詠唱</div><div class="c-m">属性</div><div class="c-m">対象</div>${key === 'blue' ? '<div class="c-m">セット</div><div class="c-tr">特性</div><div class="c-sc">連携属性</div>' : ''}</div>
${list.map(s => `<div class="r" data-id="${s.id}" data-j="${parseLv(s.levels).reduce((a, [j]) => a | (1 << j), 0)}"><div class="c-n"><a href="${BASE}spell/${s.id}.html">${esc(s.ja)}</a><small>${esc(s.en)}</small></div><div class="c-jl">${lvText(s) || '<span class="nl">—</span>'}</div><div class="c-m">${s.mp_cost ?? ''}</div><div class="c-m">${s.cast_time ?? ''}秒</div><div class="c-m">${s.recast ?? ''}秒</div><div class="c-m el el${s.element}">${ELEMENT_JA[s.element] ?? ''}</div><div class="c-m">${tgt(s.targets || 0)}</div>${key === 'blue' ? `<div class="c-m">${blueOf(s) ? blueOf(s).sp : ''}</div><div class="c-tr">${esc(blueTrait(blueOf(s)))}</div><div class="c-sc">${blueSc(blueOf(s))}</div>` : ''}</div>`).join('')}</div>
<p class="none" hidden>このジョブが覚える物はありません。</p></main><script src="${BASE}list.js?v=${VER}"></script>` + foot);
    for (const s of list) {
      const sc = scrollOf.get((s.en || '').toLowerCase());
      write(`spell/${s.id}.html`, head(`${s.ja}｜${ja}｜${SITE_SHORT}`, `${s.ja}（${ja}）の覚えるジョブとレベル、消費MP${s.mp_cost}、詠唱${s.cast_time}秒、再詠唱${s.recast}秒、属性、対象${sc ? '、スクロール' : ''}。`, `${ORIGIN}/spell/${s.id}.html`)
        + `<main class="item">${crumb(`<a href="${BASE}magic/${key}.html">${ja}</a>`, esc(s.ja))}
<section class="ihead"><div class="nm"><h1>${esc(s.ja)}</h1><small>${esc(s.en)}</small></div>
<div class="badges"><a class="bd cat" href="${BASE}magic/${key}.html">${ja}</a>${skills.get(s.skill) ? `<span class="bd">${esc(skills.get(s.skill).ja)}</span>` : ''}<span class="bd">MP ${s.mp_cost}</span><span class="bd">詠唱 ${s.cast_time}秒</span><span class="bd">再詠唱 ${s.recast}秒</span><span class="bd el${s.element}">${ELEMENT_JA[s.element] ?? ''}</span><span class="bd">対象：${tgt(s.targets || 0)}</span>${blueOf(s) ? `<span class="bd il">セット ${blueOf(s).sp}</span>${blueTrait(blueOf(s)) ? `<span class="bd">特性：${esc(blueTrait(blueOf(s)))}</span>` : ''}${blueSc(blueOf(s))}` : ''}</div>
<div class="jobsrow"><span class="lbl">覚えるジョブとLv</span><span class="lvs">${lvText(s) || '<span class="nl">—</span>'}</span></div></section>
<div class="extl"><a href="${ffo(s.ja)}" rel="noopener" target="_blank">FF11用語辞典で見る（効果・入手）</a><a href="https://www.bg-wiki.com/ffxi/${encodeURIComponent((s.en || '').replace(/ /g, '_'))}" rel="noopener" target="_blank">BG-Wiki（英語）</a></div>
${sc ? `<h2>スクロール</h2><p><a class="bd cat" href="${BASE}item/${sc}.html">${esc(iname(sc))}</a></p>` : ''}
</main>` + foot);
    }
  }
  function jobChipsFor(list) {
    const used = new Set(list.flatMap(s => parseLv(s.levels).map(([j]) => j)));
    if (used.size < 2) return '';
    return `<div class="jfilter"><span class="lbl">ジョブで絞る：</span><button type="button" data-job="" class="on">すべて</button>${JOB_LIST.filter(j => used.has(j.id)).map(j => `<button type="button" data-job="${j.id}" title="${esc(j.ja)}">${esc(j.jas)}</button>`).join('')}</div>`;
  }

  // ── ウェポンスキル（武器の種類ごと・覚えるスキル値の順・使えるジョブ）
  // 覚え方の元：LandSandBoat の data/weapon_skills.yaml（lsb.ws[id] = [スキル値, ジョブのビット, メインのみ, 習得が要る]）
  const wsBySkill = new Map();
  for (const w of wss.values()) { if (!w.ja || w.ja === '.') continue; const s = (skills.get(w.skill) || {}).ja || 'その他'; if (!wsBySkill.has(s)) wsBySkill.set(s, []); wsBySkill.get(s).push(w); }
  const wsSkills = [...wsBySkill.keys()].sort((a, b) => (wsBySkill.get(a)[0].skill || 99) - (wsBySkill.get(b)[0].skill || 99));
  const scCell = w => [w.skillchain_a, w.skillchain_b, w.skillchain_c].filter(Boolean).map(x => `<span class="sc sc-${esc(x)}">${esc(SC_JA[x] || x)}</span>`).join('');
  const wsKey = s => 'ws-' + (wsBySkill.get(s)[0].skill || 0);
  const jobGrid = mask => {
    if (!mask) return '<span class="nl">—</span>';
    const n = JOB_LIST.filter(j => mask & (1 << j.id)).length;
    if (n >= 22) return '<span class="jb all">全ジョブ</span>';
    return `<span class="jb">${JOB_LIST.map(j => (mask & (1 << j.id) ? `<b title="${esc(j.ja)}">${esc(j.jas)}</b>` : `<i>${esc(j.jas)}</i>`)).join('')}</span>`;
  };
  // [スキル値, 印, 印の色, 並びの組]：スキル値のある物はスキル値の順、ない物は後ろに組ごと
  const wsHow = w => {
    const x = lsb.ws && lsb.ws[w.id];
    if (!x) return [0, '', '', 9];
    const [lv, , main, un] = x;
    if (lv && un && lv >= 357) return [lv, 'メリポ', 'mp', 0];
    if (lv && un) return [lv, 'クエスト', 'qu', 0];
    if (lv) return [lv, main ? 'メインのみ' : '', 'mo', 0];
    if (un) return [0, '武器で習得', 'wp', 1];
    if (main && !x[1]) return [0, 'レリック', 'wp', 2];
    return [0, '専用の武器', 'wp', 3];
  };
  const wsTag = h => (h[1] ? `<span class="tag ab-${h[2]}">${h[1]}</span>` : '');
  const wsSort = (a, b) => { const x = wsHow(a), y = wsHow(b); return (x[3] - y[3]) || (x[0] - y[0]) || (a.id - b.id); };
  write('ws/index.html', head(`ウェポンスキルの一覧（${[...wss.values()].length}件）｜覚えるスキル値・使えるジョブ・連携属性｜${SITE_SHORT}`, 'FF11のウェポンスキルを武器の種類ごとに、覚えるスキル値の順で一覧。使えるジョブ、クエスト・メリポ・エンピリアンなどの覚え方、連携属性（光・闇・核熱・分解…）つき。', `${ORIGIN}/ws/index.html`)
    + `<main class="wide">${crumb('ウェポンスキル')}<h1>ウェポンスキル <span class="cnt">${[...wsBySkill.values()].flat().length}件</span></h1>
<p class="lead">武器の種類ごとに、覚えるスキル値の順です。印の意味：<span class="tag ab-qu">クエスト</span>クエストで覚える　<span class="tag ab-mp">メリポ</span>メリットポイントで覚える　<span class="tag ab-mo">メインのみ</span>サポートジョブでは使えない　<span class="tag ab-wp">武器で習得</span>エンピリアン・ミシックなどの武器でWSポイントを貯めて覚える　<span class="tag ab-wp">レリック</span><span class="tag ab-wp">専用の武器</span>その武器を持つと使える。</p>
<nav class="catnav"><div><span class="lbl">武器</span>${wsSkills.map(s => `<a href="#${wsKey(s)}">${esc(s)}</a>`).join('')}</div></nav>
${wsSkills.map(s => `<h2 id="${wsKey(s)}">${esc(s)} <span class="cnt">${wsBySkill.get(s).length}件</span></h2><div class="tbl ws" data-ck="ws"><div class="r h"><div class="c-no">スキル</div><div class="c-n">名前</div><div class="c-jb">使えるジョブ</div><div class="c-sc">連携属性</div><div class="c-x">用語辞典</div></div>${wsBySkill.get(s).sort(wsSort).map(w => { const h = wsHow(w); return `<div class="r" data-id="${w.id}"><div class="c-no">${h[0] || '—'}</div><div class="c-n"><b>${esc(w.ja)}</b>${wsTag(h)}<small>${esc(w.en)}</small></div><div class="c-jb">${jobGrid(lsb.ws && lsb.ws[w.id] ? lsb.ws[w.id][1] : 0)}</div><div class="c-sc">${scCell(w) || '<span class="nl">—</span>'}</div><div class="c-x"><a href="${ffo(w.ja)}" rel="noopener" target="_blank">見る</a></div></div>`; }).join('')}</div>`).join('')}
<p class="src">覚えるスキル値・使えるジョブ・覚え方は LandSandBoat（GPLv3）の表から。</p>
</main><script src="${BASE}list.js?v=${VER}"></script>` + foot);

  // ── アビリティ（ジョブごと・覚えるレベルの順）
  // 覚え方の元：LandSandBoat の abilities.sql（lsb.abil[id] = [ジョブ, Lv, 再使用の秒, 取り方の印]）
  const abByType = new Map();
  for (const a of abils.values()) { if (!a.ja || a.ja === '.') continue; if (!abByType.has(a.type)) abByType.set(a.type, []); abByType.get(a.type).push(a); }
  const TYPE_JA = new Map(JA_TYPES.map(([t, , ja]) => [t, ja]));
  const abAll = [...abByType.values()].flat();
  const abX = a => (lsb.abil && lsb.abil[a.id]) || null;
  const recastTxt = s => (s <= 1 ? '' : s % 3600 === 0 ? `${s / 3600}時間` : s >= 60 ? (s % 60 ? `${Math.floor(s / 60)}分${s % 60}秒` : `${s / 60}分`) : `${s}秒`);
  const isSp = (a, x) => a.type === 'JobAbility' && x && x[2] === 3600 && (x[1] === 0 || x[1] === 96);
  const abTags = a => {
    const x = abX(a); if (!x) return '';
    const t = [];
    if (isSp(a, x)) t.push(['sp', x[1] === 96 ? 'SPアビ2' : 'SPアビ']);
    if (x[3] & 1) t.push(['mp', 'メリポ']);
    if (x[3] & 2) t.push(['wp', 'アストラルフロー中']);
    if (x[3] & 4) t.push(['mo', 'メインのみ']);
    if (x[3] & 16) t.push(['qu', '白のグリモア']);
    if (x[3] & 32) t.push(['qu', '黒のグリモア']);
    return t.map(([c, s]) => `<span class="tag ab-${c}">${s}</span>`).join('');
  };
  const abLv = a => { const x = abX(a); if (!x) return 999; return x[1] === 0 ? 1 : x[1]; };
  const abSort = (a, b) => (abLv(a) - abLv(b)) || (a.id - b.id);
  const cost = a => (a.type === 'Scholar' ? '' : a.mp_cost > 1 ? `MP ${a.mp_cost}` : a.tp_cost ? `TP ${a.tp_cost}` : ''); // 戦術魔道書はチャージ制、MP1は表の仮の値
  const abHead = (lv = true) => `<div class="r h">${lv ? '<div class="c-no">Lv</div>' : ''}<div class="c-n">名前</div><div class="c-ty">種類</div><div class="c-m">再使用</div><div class="c-m">消費</div><div class="c-x">用語辞典</div></div>`;
  const abRow = (a, lv = true) => { const x = abX(a); return `<div class="r" data-id="${a.id}">${lv ? `<div class="c-no">${x ? abLv(a) : '—'}</div>` : ''}<div class="c-n"><b>${esc(a.ja)}</b>${abTags(a)}<small>${esc(a.en)}</small></div><div class="c-ty">${esc(TYPE_JA.get(a.type) || '')}</div><div class="c-m">${x ? recastTxt(x[2]) : ''}</div><div class="c-m">${cost(a)}</div><div class="c-x"><a href="${ffo(a.ja)}" rel="noopener" target="_blank">見る</a></div></div>`; };
  const abTbl = (list, lv = true) => `<div class="tbl ab${lv ? '' : ' nolv'}" data-ck="ab">${abHead(lv)}${list.map(a => abRow(a, lv)).join('')}</div>`;
  // 召喚獣：契約の履行の番号の並びから
  const avatarOf = id => (id >= 512 && id <= 520 || id === 773 ? 'カーバンクル' : id >= 521 && id <= 527 || id === 780 ? 'ケット・シー' : id >= 528 && id <= 543 ? 'フェンリル'
    : id >= 544 && id <= 559 ? 'イフリート' : id >= 560 && id <= 575 ? 'タイタン' : id >= 576 && id <= 591 ? 'リヴァイアサン' : id >= 592 && id <= 607 ? 'ガルーダ'
    : id >= 608 && id <= 623 ? 'シヴァ' : id >= 624 && id <= 638 ? 'ラムウ' : id >= 656 && id <= 667 ? 'ディアボロス' : id === 668 || id === 669 ? 'アトモス'
    : id === 670 ? 'オーディン' : id === 671 ? 'アレキサンダー' : id >= 960 && id <= 975 ? 'セイレーン' : 'そのほか');
  const AVATARS = ['カーバンクル', 'ケット・シー', 'イフリート', 'タイタン', 'リヴァイアサン', 'ガルーダ', 'シヴァ', 'ラムウ', 'フェンリル', 'ディアボロス', 'セイレーン', 'アトモス', 'オーディン', 'アレキサンダー', 'そのほか'];
  const isBp = a => /^BloodPact/.test(a.type);
  const used = new Set();
  const jobSec = j => {
    const mine = abAll.filter(a => { const x = abX(a); return x && x[0] === j.id; });
    const main = mine.filter(a => !isBp(a) && a.type !== 'Monster').sort(abSort);
    let extra = '';
    if (j.id === 15) { // 召喚士：召喚獣ごとの契約の履行（LSBに無い物も番号から）
      const bps = abAll.filter(a => isBp(a) && avatarOf(a.id) !== 'そのほか' && (!abX(a) || abX(a)[0] === 15));
      bps.forEach(a => used.add(a.id));
      extra = `<h3>契約の履行（召喚獣ごと） <span class="cnt">${bps.length}件</span></h3>` + AVATARS.filter(v => bps.some(a => avatarOf(a.id) === v)).map(v => `<h4>${v}</h4>${abTbl(bps.filter(a => avatarOf(a.id) === v).sort(abSort))}`).join('');
    }
    if (j.id === 9) { // 獣使い：ペットの技（使える技はペットごとに違う）
      const pm = mine.filter(a => a.type === 'Monster').sort((a, b) => a.id - b.id);
      if (pm.length) extra = `<details class="abmore"><summary>ペットの技 <span class="cnt">${pm.length}件</span>（呼び出したペットごとに使える技が違います）</summary>${abTbl(pm, false)}</details>`;
    }
    if (j.id === 14) { // 竜騎士：飛竜が使うブレス
      const br = abAll.filter(a => { const x = abX(a); return x && x[0] === 0; }).sort(abSort);
      br.forEach(a => used.add(a.id));
      if (br.length) extra = `<h3>飛竜のブレス <span class="cnt">${br.length}件</span></h3>${abTbl(br)}`;
    }
    mine.forEach(a => { if (j.id === 9 || a.type !== 'Monster') used.add(a.id); });
    const n = main.length + (extra ? (extra.match(/class="r" data-id/g) || []).length : 0);
    return `<h2 id="ab-j${j.id}">${esc(j.ja)} <span class="cnt">${n}件</span></h2>${abTbl(main)}${extra}`;
  };
  const jobHtml = JOB_LIST.map(jobSec).join('');
  const rest = abAll.filter(a => !used.has(a.id)).sort((a, b) => a.id - b.id);
  write('ability/index.html', head(`アビリティの一覧（${abAll.length}件）｜ジョブごと・覚えるレベル・メリポ・SPアビ｜${SITE_SHORT}`, 'FF11のアビリティをジョブごとに、覚えるレベルの順で一覧。SPアビ・メリポ・メインのみの印、再使用時間、召喚士は召喚獣ごとの契約の履行つき。', `${ORIGIN}/ability/index.html`)
    + `<main class="wide">${crumb('アビリティ')}<h1>アビリティ <span class="cnt">${abAll.length}件</span></h1>
<p class="lead">ジョブごとに、覚えるレベルの順です。印の意味：<span class="tag ab-sp">SPアビ</span>1時間に1回の特別なアビリティ（SPアビ2はLv96）　<span class="tag ab-mp">メリポ</span>メリットポイントで覚える（Lv75から）　<span class="tag ab-mo">メインのみ</span>サポートジョブでは使えない。</p>
<nav class="catnav"><div><span class="lbl">ジョブ</span>${JOB_LIST.map(j => `<a href="#ab-j${j.id}" title="${esc(j.ja)}">${esc(j.jas)}</a>`).join('')}${rest.length ? '<a href="#ab-other">そのほか</a>' : ''}</div></nav>
${jobHtml}
${rest.length ? `<h2 id="ab-other">そのほか <span class="cnt">${rest.length}件</span></h2><p class="lead">覚えるジョブ・レベルが元の表に無い物です。</p>${abTbl(rest, false)}` : ''}
<p class="src">覚えるジョブ・レベル・再使用時間・メリポなどの印は LandSandBoat（GPLv3）の表から。ジョブポイントで変わる再使用時間は入っていません。</p>
</main><script src="${BASE}list.js?v=${VER}"></script>` + foot);

  // ── トップに出す節
  const home = `<section class="box" id="items"><h2>アイテム（装備以外 ${[...itemCount.values()].reduce((a, b) => a + b, 0).toLocaleString()}件）</h2><div class="tiles">${ITEM_CATS.filter(([k]) => itemCount.get(k)).map(([k, ja, ic]) => tile(`${BASE}items/${k}.html`, ja, itemCount.get(k), ic, 'it')).join('')}${tile(`${BASE}food.html`, '食事の効果で探す', foods.length, '探', 'it hot')}</div></section>
<section class="box" id="magic"><h2>魔法（${[...spCount.values()].reduce((a, b) => a + b, 0)}件）</h2><div class="tiles">${SPELL_TYPES.map(([, k, ja]) => tile(`${BASE}magic/${k}.html`, ja, spCount.get(k) || 0, ja[0], 'mg')).join('')}</div></section>
<section class="box" id="ws"><h2>ウェポンスキル・アビリティ</h2><div class="tiles">${tile(`${BASE}ws/index.html`, 'ウェポンスキル', [...wsBySkill.values()].flat().length, '技', 'w')}${tile(`${BASE}ability/index.html`, 'アビリティ', [...abByType.values()].flat().length, '能', 'w')}</div></section>
<section class="box" id="ki"><h2>だいじなもの（${[...kiByCat.values()].flat().length.toLocaleString()}件）</h2><div class="tiles">${kiCats.map(c => tile(`${BASE}ki/${KI_KEY[c] || 'other'}.html`, KI_JA[c] || c, kiByCat.get(c).length, (KI_JA[c] || c)[0], 'ki')).join('')}</div></section>`;
  const counts = { foods: foods.length, items: [...itemCount.values()].reduce((a, b) => a + b, 0), ki: [...kiByCat.values()].flat().length, spells: [...spCount.values()].reduce((a, b) => a + b, 0), ws: [...wsBySkill.values()].flat().length, ab: [...abByType.values()].flat().length };
  return { home, urls, counts, itemCatOf };
}
