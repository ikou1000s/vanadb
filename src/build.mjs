// FF11 装備データベース（試作）を作る
// 使い方: node src/build.mjs   … data/*.lua（Windower Resources）から site/ を作り直す
// データの取り込み: node src/fetch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLua } from './lua.mjs';
import { loadBlogUses } from './blog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const SITE = path.join(ROOT, 'site');
const SITE_NAME = 'ヴァナDB（FF11 装備データベース）';
const SITE_SHORT = 'FF11 ヴァナDB';
const ORIGIN = 'https://vanadb.com';
const BASE = '/'; // 独自ドメインの直下に置く前提
const ADSENSE = 'ca-pub-4200741999536694'; // ブログと同じAdSense（ikou1000s）

const items = readLua(path.join(DATA, 'items.lua'));
const desc = readLua(path.join(DATA, 'item_descriptions.lua'));
const jobs = readLua(path.join(DATA, 'jobs.lua'));
const skills = readLua(path.join(DATA, 'skills.lua'));
// ブログの装備の逆引き：家PCでは fc2-updater の最新を data/ に写してから使う（GitHub の自動更新では data/ の写しを使う）
const BLOG_SRC = path.join(ROOT, '..', 'fc2-updater', 'gear_index.html');
const BLOG_COPY = path.join(DATA, 'blog_gear_index.html');
if (fs.existsSync(BLOG_SRC)) fs.copyFileSync(BLOG_SRC, BLOG_COPY);
const blogUses = loadBlogUses(BLOG_COPY);
const asof = JSON.parse(fs.readFileSync(path.join(DATA, 'asof.json'), 'utf8'));

// 部位（Windower の slots のビット）→ 日本語。左右は1つにまとめる
const SLOT_JA = ['メイン', 'サブ', 'レンジ', '矢弾', '頭', '胴', '両手', '両脚', '両足', '首', '腰', '耳', '耳', '指', '指', '背'];
const SLOT_GROUPS = [
  ['main', 'メイン', 1 << 0], ['sub', 'サブ', 1 << 1], ['range', 'レンジ', 1 << 2], ['ammo', '矢弾', 1 << 3],
  ['head', '頭', 1 << 4], ['body', '胴', 1 << 5], ['hands', '両手', 1 << 6], ['legs', '両脚', 1 << 7], ['feet', '両足', 1 << 8],
  ['neck', '首', 1 << 9], ['waist', '腰', 1 << 10], ['ear', '耳', (1 << 11) | (1 << 12)], ['ring', '指', (1 << 13) | (1 << 14)], ['back', '背', 1 << 15],
];
const JOB_LIST = [...jobs.values()].filter(j => j.id >= 1 && j.id <= 22);
const RACE_JA = ['', 'ヒュム♂', 'ヒュム♀', 'エル♂', 'エル♀', 'タル♂', 'タル♀', 'ミスラ', 'ガルカ'];
const ALL_RACES = 510;

const slotNames = mask => [...new Set(SLOT_JA.filter((_, i) => mask & (1 << i)))].join('・');
const jobNames = mask => {
  const js = JOB_LIST.filter(j => mask & (1 << j.id));
  return js.length >= 22 ? '全ジョブ' : js.map(j => j.jas).join('');
};
const raceNames = mask => (mask === ALL_RACES ? '' : RACE_JA.filter((_, i) => i && mask & (1 << i)).join('・'));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 性能の文を分解する。最初は「ふだんの性能」、「ペット:」の後はペット、それ以外の「◯◯:」の後は条件付き（潜在能力など）
function parseStats(text) {
  const main = {}, pet = {}, cond = {};
  let state = main;
  const def = /^防(\d+)/.exec(text);
  if (def) main['防'] = Number(def[1]);
  const re = /(ペット[:：])|([^\s:：+\-＋（）()\[\]「」]+?(?:（[^）]*）)?[:：])|([^\s\n+\-:：＋"「」（）()\[\]]+?)([+\-＋]\d+)(%?)/g;
  for (const m of text.matchAll(re)) {
    if (m[1]) { state = pet; continue; }
    if (m[2]) { if (state === main) state = cond; continue; }
    const key = m[3] + (m[5] ? '%' : '');
    const val = Number(m[4].replace('＋', '+'));
    if (key === '防') continue;
    if (!(key in state)) state[key] = val; // 同じ物が2回ある時は先の値
  }
  return { main, pet, cond };
}

// 装備だけを集める
const equip = [];
for (const [id, it] of items) {
  if (!(it.category === 'Armor' || it.category === 'Weapon') || !it.level || !it.slots) continue;
  if (!it.ja || it.ja === '.' || /^\s*$/.test(it.ja)) continue;
  const text = ((desc.get(id) || {}).ja || '').trim();
  const st = parseStats(text);
  const skill = it.category === 'Weapon' && it.skill ? (skills.get(it.skill) || {}).ja || '' : '';
  equip.push({ id, it, text, st, skill });
}

// 性能の名前の辞書（多い順）。絞り込みの選択肢は5件以上の物
const statCount = new Map();
for (const e of equip) for (const k of Object.keys(e.st.main)) statCount.set(k, (statCount.get(k) || 0) + 1);
const STATS = [...statCount].sort((a, b) => b[1] - a[1]).map(([k]) => k);
const statIdx = new Map(STATS.map((k, i) => [k, i]));
const petCount = new Map();
for (const e of equip) for (const k of Object.keys(e.st.pet)) petCount.set(k, (petCount.get(k) || 0) + 1);

// 低い方が良い性能（並べ替えの既定を小さい順にする）
const LOWER_BETTER = /^(被.*ダメージ|敵対心|.*詠唱時間|.*使用間隔|召喚獣維持費|.*再詠唱間隔|隔)/;

fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(path.join(SITE, 'item'), { recursive: true });

// 一覧用のデータ（短い配列で軽くする）
// [id, 名前, Lv, IL, ジョブ, 部位, 武器の種類, D, 隔, 性能(番号:値,…), ペット性能あり, 条件付きあり, 英名]
const rows = equip.map(({ id, it, st, skill }) => [
  id, it.ja, it.level, it.item_level || 0, it.jobs || 0, it.slots, skill, it.damage || 0, it.delay || 0,
  Object.entries(st.main).filter(([k]) => statIdx.has(k)).map(([k, v]) => statIdx.get(k) + ':' + v).join(','),
  Object.keys(st.pet).length ? 1 : 0, Object.keys(st.cond).length ? 1 : 0, it.en,
]);
const meta = {
  asof, stats: STATS.map(k => [k, statCount.get(k), LOWER_BETTER.test(k) ? 1 : 0]),
  jobs: JOB_LIST.map(j => [j.id, j.jas, j.ja]),
  slots: SLOT_GROUPS.map(([k, ja, mask]) => [k, ja, mask]),
  skills: [...new Set(equip.map(e => e.skill).filter(Boolean))],
};
fs.writeFileSync(path.join(SITE, 'items.json'), JSON.stringify({ meta, rows }));

const css = fs.readFileSync(path.join(ROOT, 'src', 'style.css'), 'utf8');
fs.writeFileSync(path.join(SITE, 'style.css'), css);
fs.copyFileSync(path.join(ROOT, 'src', 'app.js'), path.join(SITE, 'app.js'));

const head = (title, description, canonical) => `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
<link rel="stylesheet" href="${BASE}style.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}" crossorigin="anonymous"></script></head><body>
<header class="top"><a class="brand" href="${BASE}">${SITE_NAME}</a><span class="asof">データ ${esc(asof.date)} 時点（${esc(asof.note)}）</span></header>`;
const foot = `<footer class="foot"><p>装備の名前と性能の文はゲーム内の表記（データの出典：<a href="https://github.com/Windower/Resources" rel="noopener">Windower Resources</a>）。誤りに気づいたら教えてください。</p>
<p>姉妹サイト：<a href="https://ff11ikou.blog.fc2.com/">【 FF11 】いこう！ の実験＆実用メモ帳</a>（ジョブ別の装備セットと選んだ理由）</p>
<p><a href="${BASE}about.html">このサイトについて・プライバシーポリシー・お問い合わせ</a></p>
<p class="cr">FINAL FANTASY XI © SQUARE ENIX CO., LTD. All Rights Reserved. このサイトは個人のファンサイトで、株式会社スクウェア・エニックスとは関係ありません。</p></footer></body></html>`;

// 1装備1ページ
for (const { id, it, text, st, skill } of equip) {
  const slot = slotNames(it.slots);
  const kind = skill || slot;
  const lines = text.split('\n').map(esc).join('<br>');
  const rows2 = [
    ['部位', slot], skill ? ['種類', skill] : null,
    it.damage ? ['D／隔', `${it.damage}／${it.delay}`] : null,
    ['装備Lv', `Lv${it.level}` + (it.item_level ? `（IL${it.item_level}）` : '') + (it.superior_level ? `　Su${it.superior_level}` : '')],
    ['ジョブ', jobNames(it.jobs || 0)],
    raceNames(it.races) ? ['種族', raceNames(it.races)] : null,
    ['英語名', esc(it.en)],
  ].filter(Boolean);
  const fmtStat = (k, v) => `<li>${esc(k.replace(/%$/, ''))} <b>${v > 0 && k !== '防' ? '+' : ''}${v}${/%$/.test(k) ? '%' : ''}</b></li>`;
  const statRows = Object.entries(st.main).map(([k, v]) => fmtStat(k, v)).join('');
  const uses = blogUses.get(it.ja) || [];
  const usesHtml = uses.length ? `<h2>この装備を使っているセット（姉妹ブログ）</h2><ul class="uses">${uses.map(u => `<li><a href="${u.url}">${esc(u.job)}：${esc(u.set)}</a> <span class="k">（${esc(u.parts.join('・'))}）</span></li>`).join('')}</ul>` : '';
  const slot1 = slot.split('・')[0];
  const sameLinks = Object.keys(st.main).filter(k => statIdx.has(k) && k !== '防' && statCount.get(k) >= 30).slice(0, 8)
    .map(k => `<a href="${BASE}?slot=${encodeURIComponent(slot1)}&amp;stat=${encodeURIComponent(k)}">${esc(k.replace(/%$/, ''))}</a>`).join('　');
  const descText = `${it.ja}（${kind}・Lv${it.level}${it.item_level ? '・IL' + it.item_level : ''}）の性能。` + text.replace(/\n/g, ' ').slice(0, 90);
  const html = head(`${it.ja}｜${kind}の性能｜${SITE_SHORT}`, descText, `${ORIGIN}/item/${id}.html`)
    + `<main class="item"><p class="crumb"><a href="${BASE}">装備を探す</a> › <a href="${BASE}?slot=${encodeURIComponent(slot.split('・')[0])}">${esc(slot)}</a></p>
<h1>${esc(it.ja)}</h1>
<div class="ingame">${lines || '（性能の文なし）'}</div>
<table class="spec">${rows2.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>
${statRows ? `<h2>性能の内訳</h2><ul class="stats">${statRows}</ul>` : ''}
${Object.keys(st.pet).length ? `<h2>ペット</h2><ul class="stats">${Object.entries(st.pet).map(([k, v]) => fmtStat(k, v)).join('')}</ul>` : ''}
${usesHtml}
${sameLinks ? `<h2>同じ部位（${esc(slot1)}）で比べる</h2><p class="same">${sameLinks}</p>` : ''}
${Object.keys(st.cond).length ? `<p class="note">※潜在能力などの条件付きの性能は、内訳と絞り込みに含めていません（上のゲーム内の文を見てください）。</p>` : ''}
<p class="note">※オーグメント（追加の性能）はこのページに含まれていません。</p>
</main>` + foot;
  fs.writeFileSync(path.join(SITE, 'item', `${id}.html`), html);
}

// よく使う絞り込み（トップのリンク）
const qs = o => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&amp;');
const jobId = ens => JOB_LIST.find(j => j.ens === ens).id;
const QUICK = [
  ['忍者・頭のヘイスト', qs({ job: jobId('NIN'), slot: '頭', stat: 'ヘイスト%' })],
  ['赤魔・胴のファストキャスト', qs({ job: jobId('RDM'), slot: '胴', stat: 'ファストキャスト%' })],
  ['黒魔・MBダメージ', qs({ job: jobId('BLM'), stat: 'マジックバーストダメージ' })],
  ['全ジョブ・被ダメージ', qs({ stat: '被ダメージ%' })],
  ['戦士・WSダメージ', qs({ job: jobId('WAR'), stat: 'ウェポンスキルのダメージ%' })],
  ['白魔・ケアル回復量', qs({ job: jobId('WHM'), stat: 'ケアル回復量%' })],
  ['ストアTP', qs({ stat: 'ストアTP' })],
  ['移動速度', qs({ stat: '移動速度%' })],
];

// 最近のバージョンアップで増えた物（data/updates.json＝fetch で作る）
const updates = fs.existsSync(path.join(DATA, 'updates.json')) ? JSON.parse(fs.readFileSync(path.join(DATA, 'updates.json'), 'utf8')) : [];
const equipIds = new Set(equip.map(e => e.id));
const recentHtml = updates.length ? `<div class="recent"><b>最近のバージョンアップで増えた物：</b>${updates.map(u => `<span class="vu">${esc(u.label)}</span>`
  + (u.ids.length ? u.ids.map(id => { const it = items.get(id); if (!it || !it.ja) return ''; return equipIds.has(id) ? `<a href="${BASE}item/${id}.html">${esc(it.ja)}</a>` : `<span class="nl">${esc(it.ja)}</span>`; }).filter(Boolean).join('') : '<span class="nl">（増えた物なし）</span>')).join('')}</div>` : '';

// ジョブ別のページ：部位×性能の入口と、姉妹ブログの記事
const ROLE = {
  melee: ['ヘイスト%', '命中', 'ダブルアタック%', 'ストアTP', 'ウェポンスキルのダメージ%', 'クリティカルヒット%', '被ダメージ%'],
  mage: ['ファストキャスト%', '魔攻', '魔命', 'マジックバーストダメージ', 'ケアル回復量%', 'リフレシュ', '被ダメージ%'],
  tank: ['被ダメージ%', '敵対心', 'HP', '魔回避', 'ヘイスト%', 'ファストキャスト%', '物理ダメージ上限%'],
};
const JOB_ROLE = { WHM: 'mage', BLM: 'mage', RDM: 'mage', SMN: 'mage', SCH: 'mage', GEO: 'mage', BRD: 'mage', PLD: 'tank', RUN: 'tank' };
const BLOG_JOB = { MNK: 89, RDM: 73, THF: 124, BST: 168, BRD: 154, NIN: 113, DRG: 60, SMN: 68, BLU: 169, COR: 54, PUP: 131, SCH: 67, GEO: 104, RUN: 71 };
fs.mkdirSync(path.join(SITE, 'job'), { recursive: true });
const jobPages = [];
for (const j of JOB_LIST) {
  const mine = equip.filter(e => (e.it.jobs || 0) & (1 << j.id));
  const il119 = mine.filter(e => e.it.item_level === 119).length;
  const stats = ROLE[JOB_ROLE[j.ens] || 'melee'].filter(k => statIdx.has(k));
  const slotsOf = SLOT_GROUPS.filter(([, , mask]) => mine.some(e => e.it.slots & mask));
  const cell = (slot, k) => {
    const n = mine.filter(e => e.it.slots & SLOT_GROUPS.find(s => s[1] === slot)[2] && k in e.st.main).length;
    return n ? `<a href="${BASE}?${qs({ job: j.id, slot, stat: k })}">${n}</a>` : '<span class="nl">—</span>';
  };
  const blog = BLOG_JOB[j.ens] ? `<p>このジョブの装備セットと選んだ理由は、姉妹ブログの <a href="https://ff11ikou.blog.fc2.com/blog-entry-${BLOG_JOB[j.ens]}.html">${esc(j.ja)}の装備の記事</a> にまとめています。</p>` : '';
  const url = `${ORIGIN}/job/${j.ens.toLowerCase()}.html`;
  jobPages.push(url);
  fs.writeFileSync(path.join(SITE, 'job', `${j.ens.toLowerCase()}.html`), head(`${j.ja}の装備｜部位×性能で探す｜${SITE_SHORT}`,
    `FF11 ${j.ja}が装備できる${mine.length.toLocaleString()}件（IL119は${il119}件）を、部位と性能（${stats.slice(0, 4).map(k => k.replace(/%$/, '')).join('・')}など）で絞り込めます。`, url)
    + `<main class="item"><p class="crumb"><a href="${BASE}">装備を探す</a> › ジョブ別</p><h1>${esc(j.ja)}の装備</h1>
<p>${esc(j.ja)}が装備できる物は ${mine.length.toLocaleString()}件（そのうち IL119 は ${il119}件）。下の表の数字を押すと、その部位でその性能が付いた装備が大きい順に並びます。</p>
${blog}
<div class="tw"><table class="grid"><tr><th>部位</th>${stats.map(k => `<th>${esc(k.replace(/%$/, ''))}</th>`).join('')}</tr>
${slotsOf.map(([, ja]) => `<tr><th><a href="${BASE}?${qs({ job: j.id, slot: ja })}">${ja}</a></th>${stats.map(k => `<td>${cell(ja, k)}</td>`).join('')}</tr>`).join('\n')}</table></div>
<p class="note">数字は、その性能が付いている装備の件数です（潜在能力などの条件付きの性能とオーグメントは数えていません）。</p>
<h2>ほかのジョブ</h2><p class="same">${JOB_LIST.map(o => o.id === j.id ? `<b>${esc(o.ja)}</b>` : `<a href="${BASE}job/${o.ens.toLowerCase()}.html">${esc(o.ja)}</a>`).join('　')}</p>
</main>` + foot);
}

// トップ（絞り込み）
fs.writeFileSync(path.join(SITE, 'index.html'), head(`${SITE_NAME}｜ジョブ・部位・性能で探せる（最新のバージョンアップまで）`,
  `FF11の装備${equip.length.toLocaleString()}件を、ジョブ・部位・ヘイストやファストキャストなどの性能で絞り込んで並べ替えられるデータベース。毎月のバージョンアップの新装備まで入っています。`, `${ORIGIN}/`)
  + `<main class="finder">
<section class="intro"><h1>FF11の装備を、ジョブ・部位・性能で探す</h1>
<p>ヴァナDBは、FF11の装備${equip.length.toLocaleString()}件を、ジョブ・部位・性能（ヘイスト・ファストキャスト・マジックバーストなど）で絞り込み、大きい順に並べられるデータベースです。毎日、最新のデータを取り込んでいます（${esc(asof.note)}）。装備の名前を押すと、性能の内訳と、姉妹ブログでその装備を使っているセットが見られます。</p>
<div class="quick"><b>よく使う絞り込み：</b>${QUICK.map(([label, q]) => `<a href="${BASE}?${q}">${esc(label)}</a>`).join('')}</div>
<div class="quick"><b>ジョブ別：</b>${JOB_LIST.map(j => `<a href="${BASE}job/${j.ens.toLowerCase()}.html">${esc(j.ja)}</a>`).join('')}</div>
${recentHtml}
</section>
<div class="ctl">
 <div class="row"><label>ジョブ</label><div id="jobs" class="chips"></div></div>
 <div class="row"><label>部位</label><div id="slots" class="chips"></div></div>
 <div class="row"><label>武器</label><select id="skill"><option value="">すべて</option></select></div>
 <div class="row"><label>性能</label><select id="stat"></select><select id="dir"><option value="desc">大きい順</option><option value="asc">小さい順</option></select></div>
 <div class="row"><label>装備Lv</label><input id="lvmin" type="number" min="1" max="99" value="1">〜<input id="lvmax" type="number" min="1" max="99" value="99">
  <label class="ck"><input id="il" type="checkbox">IL装備だけ</label></div>
 <div class="row"><label>名前</label><input id="q" type="search" placeholder="名前の一部（日本語・英語）"></div>
</div>
<p id="count" class="count"></p>
<div id="list" class="list"></div>
<p class="more"><button id="more" hidden>もっと見る</button></p>
<noscript><p>絞り込みにはJavaScriptが要ります。</p></noscript>
</main><script src="${BASE}app.js"></script>` + foot);

// このサイトについて（運営者・データ・プライバシーポリシー・お問い合わせ）
fs.writeFileSync(path.join(SITE, 'about.html'), head(`このサイトについて｜${SITE_SHORT}`, 'ヴァナDB（FF11 装備データベース）の運営者・データの出典・プライバシーポリシー・お問い合わせ。', `${ORIGIN}/about.html`)
  + `<main class="item"><h1>このサイトについて</h1>
<p>ヴァナDBは、ファイナルファンタジーXI（FF11）の装備を、ジョブ・部位・性能で絞り込んで比べられる日本語のデータベースです。毎日、最新のデータを取り込んで作り直しています（今は${esc(asof.note)}）。</p>
<h2>運営者</h2><p>FF11のブログ「<a href="https://ff11ikou.blog.fc2.com/">【 FF11 】いこう！ の実験＆実用メモ帳</a>」の運営者が、個人で運営しています。株式会社スクウェア・エニックスとは関係ありません。</p>
<h2>データについて</h2><p>装備の名前・性能の文は、ゲーム内の表記を有志が公開しているデータ（<a href="https://github.com/Windower/Resources" rel="noopener">Windower Resources</a>）から取り込んでいます。性能の内訳と絞り込みは、その文を機械で分けた物です。条件付きの性能（潜在能力など）とオーグメントは、絞り込みに含めていません。ドロップ率や使い心地のように、遊んで確かめる情報は載せていません。誤りがあれば、下のお問い合わせから教えてください。</p>
<h2>プライバシーポリシー</h2>
<p>当サイトは、第三者配信の広告サービス「Google アドセンス」を利用しています。広告配信事業者は、ユーザーの興味に応じた広告を表示するために Cookie を使用することがあります。Cookie を無効にする方法や Google アドセンスについては、<a href="https://policies.google.com/technologies/ads?hl=ja" rel="noopener">広告 – ポリシーと規約 – Google</a> をご覧ください。パーソナライズ広告は <a href="https://adssettings.google.com/" rel="noopener">広告設定</a> で無効にできます。</p>
<p>当サイトは、アクセスの傾向を知るために Google のサービス（Search Console など）を利用することがあります。これらは個人を特定する情報を含みません。</p>
<p>当サイトは、Amazon.co.jp を宣伝しリンクすることによってサイトが紹介料を獲得できる手段を提供することを目的に設定されたアフィリエイトプログラムである、Amazon アソシエイト・プログラムの参加者です（姉妹ブログを含みます）。</p>
<h2>免責事項</h2><p>掲載している情報はできる限り正確にしていますが、正しさを保証するものではありません。当サイトの情報で生じた損害について、責任を負いかねます。</p>
<h2>お問い合わせ</h2><p>姉妹ブログ「<a href="https://ff11ikou.blog.fc2.com/">【 FF11 】いこう！ の実験＆実用メモ帳</a>」の上のメニューにある「Contact」からご連絡ください。</p>
<h2>著作権</h2><p>FINAL FANTASY XI © SQUARE ENIX CO., LTD. All Rights Reserved. 記載されている会社名・製品名・システム名などは、各社の商標または登録商標です。</p>
</main>` + foot);
fs.writeFileSync(path.join(SITE, 'ads.txt'), `google.com, ${ADSENSE.replace('ca-', '')}, DIRECT, f08c47fec0942fa0
`);

// 検索エンジン向け
fs.writeFileSync(path.join(SITE, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
fs.writeFileSync(path.join(SITE, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + [`${ORIGIN}/`, `${ORIGIN}/about.html`, ...jobPages, ...equip.map(e => `${ORIGIN}/item/${e.id}.html`)].map(u => `<url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');

console.log(`装備 ${equip.length}件 / 性能の種類 ${STATS.length}（ペット ${petCount.size}） / データ ${asof.date}`);
console.log('items.json', (fs.statSync(path.join(SITE, 'items.json')).size / 1024 / 1024).toFixed(2), 'MB');
