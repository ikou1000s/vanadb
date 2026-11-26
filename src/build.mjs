// FF11 装備データベース（試作）を作る
// 使い方: node src/build.mjs   … data/*.lua（Windower Resources）から site/ を作り直す
// データの取り込み: node src/fetch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLua } from './lua.mjs';
import { loadBlogUses } from './blog.mjs';
import { writeMore } from './more.mjs';
import { writeQuests } from './quests.mjs';
import { writeExtra } from './extra.mjs';
import { writeSynth } from './synth.mjs';
import { writeFishing } from './fishing.mjs';
import { writeGuild } from './guild.mjs';
import { writeFind } from './find.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const SITE = path.join(ROOT, 'site');
const SITE_NAME = 'ヴァナDB（FF11 データベース）';
const SITE_SHORT = 'FF11 ヴァナDB';
const ORIGIN = 'https://vanadb.com';
const BASE = '/'; // 独自ドメインの直下に置く前提
const VER = Date.now().toString(36); // 更新のたびに css・js を読み直させる印
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
const lsb = fs.existsSync(path.join(DATA, 'lsb.json')) ? JSON.parse(fs.readFileSync(path.join(DATA, 'lsb.json'), 'utf8')) : { sell: {}, flags: {}, fish: [], rods: [] };
const rxTags = id => { const f = lsb.flags[id] || ''; return (f.includes('R') ? '<span class="rx rare">Rare</span>' : '') + (f.includes('E') ? '<span class="rx exc">Ex</span>' : ''); };
const mobsData = fs.existsSync(path.join(DATA, 'mobs.json')) ? JSON.parse(fs.readFileSync(path.join(DATA, 'mobs.json'), 'utf8')) : { drops: {}, steal: {} };
const zonesW = fs.existsSync(path.join(DATA, 'zones.lua')) ? readLua(path.join(DATA, 'zones.lua')) : new Map();
const zoneJaById = id => (zonesW.get(id) || {}).ja || '';
const CHANCE_JA = { always: '必ず', very_common: 'とても多い', common: '多い', uncommon: 'ふつう', rare: 'まれ', very_rare: 'とてもまれ', super_rare: 'ごくまれ' };
const mobName = n => n.replace(/\s(war|mnk|whm|blm|rdm|thf|pld|drk|bst|brd|rng|sam|nin|drg|smn|blu|cor|pup|dnc|sch|geo|run)$/i, '');
const questsData = fs.existsSync(path.join(DATA, 'quests.json')) ? JSON.parse(fs.readFileSync(path.join(DATA, 'quests.json'), 'utf8')) : { quests: [] };
const rewardOf = new Map();
{
  const byEn = new Map(); for (const [id, it] of items) if (it.en && it.category !== 'Gil') { const k = it.en.toLowerCase(); if (!byEn.has(k)) byEn.set(k, id); }
  for (const a of questsData.quests) for (const q of a.list) for (const x of (q.reward || '').split(/\s*(?:,|\/| and )\s*/)) {
    const id = byEn.get(x.toLowerCase().replace(/^\d+x?\s+/, '')); if (!id) continue;
    if (!rewardOf.has(id)) rewardOf.set(id, []); rewardOf.get(id).push([a.key, a.ja, q.ja || q.en]);
  }
}
const acqHtml = id => {
  const drops = (mobsData.drops[id] || []).map(([m, z, c, nm]) => [mobName(m), z, c, nm]);
  const seen = new Set(); const dl = drops.filter(([m, z]) => { const k = m + '|' + z; if (seen.has(k)) return false; seen.add(k); return true; });
  const steal = mobsData.steal[id] || [];
  const qs = rewardOf.get(id) || [];
  let h = '';
  if (qs.length) h += '<h3>クエストの報酬</h3><ul class="acq">' + qs.map(([k, aja, qja]) => '<li><a href="' + BASE + 'quest/' + k + '.html">' + esc(qja) + '</a> <span class="nl">（' + esc(aja) + 'のクエスト）</span></li>').join('') + '</ul>';
  if (dl.length) h += '<h3>ドロップ <span class="cnt">' + dl.length + '件</span></h3><ul class="acq drops">' + dl.slice(0, 40).map(([m, z, c, nm]) => '<li><b>' + esc(m) + '</b>' + (nm ? '<span class="tag nm">NM</span>' : '') + ' <span class="zn">' + esc(zoneJaById(z) || ('#' + z)) + '</span>' + (CHANCE_JA[c] ? ' <span class="ch ch-' + c + '">' + CHANCE_JA[c] + '</span>' : '') + '</li>').join('') + (dl.length > 40 ? '<li class="nl">ほか' + (dl.length - 40) + '件</li>' : '') + '</ul>';
  if (steal.length) h += '<h3>ぬすむ</h3><ul class="acq">' + steal.slice(0, 20).map(([m, z]) => '<li><b>' + esc(mobName(m)) + '</b> <span class="zn">' + esc(zoneJaById(z)) + '</span></li>').join('') + '</ul>';
  if (dl.length || steal.length) h += '<p class="note">ドロップ・ぬすむは有志のサーバー再現データ（LandSandBoat）。モンスター名は英語、出やすさは目安です。</p>';
  return h;
};
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

// ── カテゴリー（防具＝部位、武器＝種類）。1つの装備は1つのカテゴリーに入る
const ARMOR_CATS = [
  ['head', '頭', e => e.it.category === 'Armor' && e.it.slots === 16],
  ['body', '胴', e => e.it.category === 'Armor' && e.it.slots === 32],
  ['hands', '両手', e => e.it.category === 'Armor' && e.it.slots === 64],
  ['legs', '両脚', e => e.it.category === 'Armor' && e.it.slots === 128],
  ['feet', '両足', e => e.it.category === 'Armor' && e.it.slots === 256],
  ['neck', '首', e => e.it.category === 'Armor' && e.it.slots === 512],
  ['waist', '腰', e => e.it.category === 'Armor' && e.it.slots === 1024],
  ['back', '背', e => e.it.category === 'Armor' && e.it.slots === 32768],
  ['ear', '耳', e => e.it.category === 'Armor' && (e.it.slots & 6144) && !(e.it.slots & ~6144)],
  ['ring', '指', e => e.it.category === 'Armor' && (e.it.slots & 24576) && !(e.it.slots & ~24576)],
  ['shield', '盾', e => e.it.category === 'Armor' && e.it.slots === 2],
];
const W = (key, ja, test) => [key, ja, test];
const mainW = s => e => e.it.category === 'Weapon' && (e.it.slots & 1) && e.skill === s;
const rangeW = s => e => e.it.category === 'Weapon' && e.it.slots === 4 && e.skill === s;
const WEAPON_CATS = [
  W('h2h', '格闘', mainW('格闘')), W('dagger', '短剣', mainW('短剣')), W('sword', '片手剣', mainW('片手剣')), W('gsword', '両手剣', mainW('両手剣')),
  W('axe', '片手斧', mainW('片手斧')), W('gaxe', '両手斧', mainW('両手斧')), W('scythe', '両手鎌', mainW('両手鎌')), W('polearm', '両手槍', mainW('両手槍')),
  W('katana', '片手刀', mainW('片手刀')), W('gkatana', '両手刀', mainW('両手刀')), W('club', '片手棍', mainW('片手棍')), W('staff', '両手棍', mainW('両手棍')),
  W('archery', '弓術', rangeW('弓術')), W('marksmanship', '射撃', rangeW('射撃')), W('throwing', '投てき', rangeW('投てき')),
  W('wind', '管楽器', rangeW('管楽器')), W('string', '弦楽器', rangeW('弦楽器')), W('handbell', '風水鈴', rangeW('風水鈴')), W('fishing', '釣り竿', rangeW('釣り')),
  W('ammo', '矢弾', e => e.it.slots === 8), W('grip', 'グリップ', e => e.it.category === 'Weapon' && e.it.slots === 2),
];
const ALL_CATS = [...ARMOR_CATS.map(c => [...c, 'armor']), ...WEAPON_CATS.map(c => [...c, 'weapon'])];
const catOf = new Map();
for (const e of equip) { const c = ALL_CATS.find(([, , t]) => t(e)); if (c) catOf.set(e.id, c); }

// レベルの区切り（ff11db と同じく、Lv と IL の帯で並べる）
const BANDS = ['IL119', 'IL117〜118', 'IL113〜116', 'IL100〜112', 'Lv99', 'Lv91〜98', 'Lv81〜90', 'Lv76〜80', 'Lv71〜75', 'Lv61〜70', 'Lv51〜60', 'Lv41〜50', 'Lv31〜40', 'Lv21〜30', 'Lv11〜20', 'Lv1〜10'];
const bandOf = it => {
  const il = it.item_level || 0, lv = it.level;
  if (il >= 119) return 0; if (il >= 117) return 1; if (il >= 113) return 2; if (il >= 100) return 3;
  if (lv >= 99) return 4; if (lv >= 91) return 5; if (lv >= 81) return 6; if (lv >= 76) return 7; if (lv >= 71) return 8;
  return 9 + (6 - Math.floor((lv - 1) / 10)); // Lv61〜70→9 … Lv1〜10→15
};


// 一覧用のデータ（短い配列で軽くする）
// [id, 名前, Lv, IL, ジョブ, 部位, 武器の種類, D, 隔, 性能(番号:値,…), ペット性能あり, 条件付きあり, 英名]
const rows = equip.map(({ id, it, st, skill }) => [
  id, it.ja, it.level, it.item_level || 0, it.jobs || 0, it.slots, skill, it.damage || 0, it.delay || 0,
  Object.entries(st.main).filter(([k]) => statIdx.has(k)).map(([k, v]) => statIdx.get(k) + ':' + v).join(','),
  Object.keys(st.pet).length ? 1 : 0, Object.keys(st.cond).length ? 1 : 0, it.en,
  catOf.get(id) ? ALL_CATS.indexOf(catOf.get(id)) : -1,
]);
const meta = {
  asof, stats: STATS.map(k => [k, statCount.get(k), LOWER_BETTER.test(k) ? 1 : 0]),
  jobs: JOB_LIST.map(j => [j.id, j.jas, j.ja]),
  slots: SLOT_GROUPS.map(([k, ja, mask]) => [k, ja, mask]),
  skills: [...new Set(equip.map(e => e.skill).filter(Boolean))],
  cats: ALL_CATS.map(([key, ja, , kind]) => [key, ja, kind]),
};
fs.writeFileSync(path.join(SITE, 'items.json'), JSON.stringify({ meta, rows }));

const css = fs.readFileSync(path.join(ROOT, 'src', 'style.css'), 'utf8');
fs.writeFileSync(path.join(SITE, 'style.css'), css);
fs.copyFileSync(path.join(ROOT, 'src', 'app.js'), path.join(SITE, 'app.js'));
fs.copyFileSync(path.join(ROOT, 'src', 'list.js'), path.join(SITE, 'list.js'));
fs.copyFileSync(path.join(ROOT, 'src', 'food.js'), path.join(SITE, 'food.js'));
// サイトのアイコン（スピードダイヤル・ブックマーク・タブ）。元は src/icons/icon.svg・favicon.svg（PNGは Chrome で書き出し済み）
for (const f of fs.readdirSync(path.join(ROOT, 'src', 'icons'))) if (f !== 'icon.svg') fs.copyFileSync(path.join(ROOT, 'src', 'icons', f), path.join(SITE, f));

const head = (title, description, canonical) => `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
<link rel="stylesheet" href="${BASE}style.css?v=${VER}">
<link rel="icon" href="${BASE}favicon.ico" sizes="48x48"><link rel="icon" href="${BASE}favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="${BASE}apple-touch-icon.png"><link rel="manifest" href="${BASE}site.webmanifest"><meta name="theme-color" content="#14254a">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}" crossorigin="anonymous"></script><script src="${BASE}find.js?v=${VER}" defer></script></head><body>
<header class="top"><div class="in"><a class="brand" href="${BASE}">ヴァナDB<small>FF11 データベース</small></a><span class="asof">データ ${esc(asof.date)} 時点（${esc(asof.note)}）</span><form class="hfind" action="${BASE}find.html" method="get" role="search"><span class="hf-ic" aria-hidden="true"></span><input name="q" type="search" placeholder="名前で探す（装備・アイテム・魔法・クエスト…）" autocomplete="off" aria-label="名前で探す"><button type="submit">探す</button></form></div>
<nav class="gnav"><a class="new" href="${BASE}new.html">新装備・新アイテム</a><a href="${BASE}#armor">防具</a><a href="${BASE}#weapon">武器</a><a href="${BASE}#items">アイテム</a><a href="${BASE}#magic">魔法</a><a href="${BASE}#synth">合成</a><a href="${BASE}ws/index.html">WS</a><a href="${BASE}ability/index.html">アビリティ</a><a href="${BASE}#ki">だいじなもの</a><a href="${BASE}quest/index.html">クエスト</a><a href="${BASE}mission/index.html">ミッション</a><a href="${BASE}titles.html">称号</a><a href="${BASE}#more">そのほか</a><a href="${BASE}#job">ジョブ別</a><a href="${BASE}search.html">性能で探す</a><a href="${BASE}food.html">食事で探す</a></nav></header>`;
const foot = `<footer class="foot"><p>装備の名前と性能の文はゲーム内の表記（データの出典：<a href="https://github.com/Windower/Resources" rel="noopener">Windower Resources</a>）。誤りに気づいたら教えてください。</p>
<p>姉妹サイト：<a href="https://ff11ikou.blog.fc2.com/">【 FF11 】いこう！ の実験＆実用メモ帳</a>（ジョブ別の装備セットと選んだ理由）</p>
<p><a href="${BASE}about.html">このサイトについて・プライバシーポリシー・お問い合わせ</a></p>
<p class="cr">FINAL FANTASY XI © SQUARE ENIX CO., LTD. All Rights Reserved. このサイトは個人のファンサイトで、株式会社スクウェア・エニックスとは関係ありません。</p></footer></body></html>`;

// Rare/Ex/競売不可・NPCへの売値のバッジ（LandSandBoat の item_basic）
function rxBadges(id) { const f = lsb.flags[id] || ''; return (f.includes('R') ? '<span class="bd rx rare">Rare</span>' : '') + (f.includes('E') ? '<span class="bd rx exc">Ex</span>' : '') + (f.includes('N') ? '<span class="bd">競売不可</span>' : '') + (lsb.sell[id] ? `<span class="bd">NPC売値 ${lsb.sell[id].toLocaleString()}ギル</span>` : ''); }
// 見た目が同じ装備（LandSandBoat の item_equipment：同じ部位で同じモデル番号 MId）と、ほかの部位も覆う印
const LOOK_SLOT = s => (s & 1 ? 'main' : s & 2 ? 'sub' : s & 4 ? 'range' : s & 16 ? 'head' : s & 32 ? 'body' : s & 64 ? 'hands' : s & 128 ? 'legs' : s & 256 ? 'feet' : '');
const lookKey = id => { const l = (lsb.look || {})[id]; if (!l) return ''; const s = LOOK_SLOT(l[1]); return s ? `${s}|${l[0]}` : ''; };
function lookGroups() {
  const m = new Map();
  for (const e of equip) { const k = lookKey(e.id); if (!k) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(e); }
  for (const l of m.values()) l.sort((a, b) => (a.it.level - b.it.level) || ((a.it.item_level || 0) - (b.it.item_level || 0)) || a.it.ja.localeCompare(b.it.ja, 'ja'));
  return m;
}
const COVER = [[16, '頭'], [64, '両手'], [128, '両脚'], [256, '両足']];
const coverOf = id => { const l = (lsb.look || {})[id]; if (!l || !l[2]) return []; return COVER.filter(([b]) => l[2] & b).map(([, n]) => n); };

// 見た目で探す：部位・武器の種類ごとに、同じ見た目の装備をまとめた一覧（画像は載せない）
function writeLooks() {
  fs.mkdirSync(path.join(SITE, 'looks'), { recursive: true });
  const groups = lookGroups();
  const pages = [];
  const cats = ALL_CATS.filter(c => ['head', 'body', 'hands', 'legs', 'feet'].includes(c[0]) || c[3] === 'weapon' || c[0] === 'shield');
  const perCat = cats.map(c => {
    const gs = [...groups.values()].map(l => l.filter(e => catOf.get(e.id) === c)).filter(l => l.length >= 1);
    gs.sort((a, b) => b.length - a.length || a[0].it.ja.localeCompare(b[0].it.ja, 'ja'));
    return [c, gs];
  }).filter(([, gs]) => gs.length);
  const nav = cur => `<nav class="catnav"><div><span class="lbl">防具</span>${perCat.filter(([c]) => c[3] !== 'weapon').map(([c]) => c[0] === cur ? `<b>${esc(c[1])}</b>` : `<a href="${BASE}looks/${c[0]}.html">${esc(c[1])}</a>`).join('')}</div><div><span class="lbl">武器</span>${perCat.filter(([c]) => c[3] === 'weapon').map(([c]) => c[0] === cur ? `<b>${esc(c[1])}</b>` : `<a href="${BASE}looks/${c[0]}.html">${esc(c[1])}</a>`).join('')}</div></nav>`;
  for (const [c, gs] of perCat) {
    const multi = gs.filter(l => l.length >= 2), single = gs.filter(l => l.length === 1);
    const card = l => { const cv = coverOf(l[0].id); return `<div class="look" data-q="${esc(l.map(e => e.it.ja + ' ' + (e.it.en || '')).join(' ').toLowerCase())}"><h3>${esc(l[0].it.ja)}の見た目 <span class="cnt">${l.length}件</span>${cv.length ? ` <span class="bd cover">${esc(cv.join('・'))}も覆う</span>` : ''}</h3><p>${l.map(e => `<a href="${BASE}item/${e.id}.html">${esc(e.it.ja)}</a><small>Lv${e.it.level}${e.it.item_level ? '・IL' + e.it.item_level : ''}${raceNames(e.it.races) ? '・' + esc(raceNames(e.it.races)) : ''}</small>`).join('　')}</p></div>`; };
    const url = `${ORIGIN}/looks/${c[0]}.html`; pages.push(url);
    fs.writeFileSync(path.join(SITE, 'looks', `${c[0]}.html`), head(`${c[1]}の見た目で探す（同じ見た目の装備）｜${SITE_SHORT}`,
      `FF11の${c[1]}を、ゲームの中で同じ見た目になる物ごとにまとめた一覧。${multi.length}通りの見た目に2件以上の装備。見た目の固定（ロックスタイル）選びに。`, url)
      + `<main class="wide"><p class="crumb"><a href="${BASE}">トップ</a> › <a href="${BASE}looks/head.html">見た目で探す</a> › ${esc(c[1])}</p><h1>${esc(c[1])}の見た目で探す <span class="cnt">${gs.length}通り</span></h1>
<p class="lead">ゲームの中で同じ見た目になる${esc(c[1])}を、まとめて並べています（件数の多い順）。見た目の固定（ロックスタイル）で、低いレベルの物や手に入れやすい物を探す時に。画像は載せていません。見た目は FF11用語辞典などで確かめてください。種族専用の装備（ヒューム用・ガルカ用など）は、同じ組でもそれぞれの種族の体での見た目です。</p>
${nav(c[0])}
<div class="row"><input id="lq" type="search" placeholder="装備の名前で絞る（日本語・英語）"> <span id="lc" class="cnt"></span></div>
<h2>同じ見た目の装備が2件以上 <span class="cnt">${multi.length}通り</span></h2>
<div id="looks">${multi.map(card).join('')}</div>
${single.length ? `<h2>この見た目は1件だけ <span class="cnt">${single.length}件</span></h2><div class="looks1">${single.map(card).join('')}</div>` : ''}
<p class="note">元データ：有志のサーバー再現データ LandSandBoat（GPLv3）の、装備ごとのモデル番号。同じ部位で番号が同じ物を「同じ見た目」としています（参考）。</p>
<script>(function(){var q=document.getElementById('lq'),c=document.getElementById('lc'),cards=[].slice.call(document.querySelectorAll('.look'));function f(){var v=q.value.trim().toLowerCase(),n=0;cards.forEach(function(d){var ok=!v||d.getAttribute('data-q').indexOf(v)>=0;d.hidden=!ok;if(ok)n++;});c.textContent=v?n+'通り':'';}q.addEventListener('input',f);})();</script>
</main>` + foot);
  }
  const total = [...groups.values()].filter(l => l.length >= 2).length;
  return { home: tile(`${BASE}looks/head.html`, '見た目で探す', total, '見', 'ex'), urls: pages, count: total };
}

// 1装備1ページ（一覧の表の部品を使うので、ファイルの最後で呼ぶ）
function writeItemPages() {
  // 合成のレシピ（有志のサーバー再現データ LandSandBoat の synth_recipes。fetch で data/synth.json）
  const synth = fs.existsSync(path.join(DATA, 'synth.json')) ? JSON.parse(fs.readFileSync(path.join(DATA, 'synth.json'), 'utf8')) : [];
  const recipesOf = new Map();
  for (const r of synth) for (const [res, q] of [[r.result, 'NQ'], ...r.hq.map((h, i) => [h, 'HQ' + (i + 1)])]) {
    if (!res) continue;
    if (!recipesOf.has(res)) recipesOf.set(res, []);
    if (!recipesOf.get(res).some(x => x.r === r)) recipesOf.get(res).push({ r, q });
  }
  const iname = id => (items.get(id) || {}).ja || `#${id}`;
  const recipeHtml = ({ r, q }) => `<div class="recipe"><div class="rq">${q === 'NQ' ? '' : `<span class="bd il">${q}で出る</span>`}${Object.entries(r.skills).map(([k, v]) => `<span class="bd">${esc(k)} ${v}</span>`).join('')}<span class="bd">${esc(iname(r.crystal))}</span></div>`
    + `<div class="ri">${r.ings.map(([id, n]) => `${equipById.has(id) ? `<a href="${BASE}item/${id}.html">${esc(iname(id))}</a>` : esc(iname(id))}${n > 1 ? ` ×${n}` : ''}`).join('　')}</div>`
    + `<div class="ro">→ NQ：${esc(iname(r.result))}${r.hq.filter(Boolean).length ? `　HQ：${[...new Set(r.hq.filter(Boolean))].map(h => equipById.has(h) ? `<a href="${BASE}item/${h}.html">${esc(iname(h))}</a>` : esc(iname(h))).join('・')}` : ''}</div></div>`;

  // 段階違い（＋1・＋2…）と、同じシリーズ（英語名の頭の語が同じで、部位をまたぐ一式）
  const baseOf = e => e.it.ja.replace(/[+＋][0-9０-９]+$/, '');
  const byBase = new Map();
  for (const e of equip) { const b = baseOf(e); if (!byBase.has(b)) byBase.set(b, []); byBase.get(b).push(e); }
  const seriesKey = e => { const w = (e.it.en || '').split(/[ ']/)[0]; return w.length >= 3 && catOf.get(e.id) ? `${w}|${e.it.item_level || 0}|${catOf.get(e.id)[3]}` : ''; };
  const bySeries = new Map();
  for (const e of equip) { const k = seriesKey(e); if (!k) continue; if (!bySeries.has(k)) bySeries.set(k, []); bySeries.get(k).push(e); }
  const catOrder = e => ALL_CATS.indexOf(catOf.get(e.id));

  const byLook = lookGroups();

  // 性能が近い装備（同じカテゴリー・同じ帯で、性能の向きが近い物）
  const vecOf = e => Object.entries(e.st.main).filter(([k]) => k !== '防');
  const groups = new Map();
  for (const e of equip) { const c = catOf.get(e.id); if (!c) continue; const k = c[0] + '|' + bandOf(e.it); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
  const norm = v => Math.sqrt(v.reduce((s, [, x]) => s + x * x, 0)) || 1;
  const similar = e => {
    const c = catOf.get(e.id); if (!c) return [];
    const va = vecOf(e), na = norm(va), ma = new Map(va);
    if (!va.length) return [];
    return (groups.get(c[0] + '|' + bandOf(e.it)) || []).filter(o => o.id !== e.id && baseOf(o) !== baseOf(e))
      .map(o => { const vb = vecOf(o); let dot = 0; for (const [k, x] of vb) if (ma.has(k)) dot += ma.get(k) * x; return [o, dot / (na * norm(vb))]; })
      .filter(([, s]) => s > 0.75).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([o]) => o);
  };
  const ffo = ja => `https://wiki.ffo.jp/search.cgi?CCC=%E6%84%9B&amp;Command=Search&amp;qf=${encodeURIComponent(ja)}&amp;order=match&amp;ffotype=title&amp;type=title`;
  const bg = en => `https://www.bg-wiki.com/ffxi/${encodeURIComponent((en || '').replace(/ /g, '_'))}`;

  for (const e of equip) {
    const { id, it, text, st, skill } = e;
    const slot = slotNames(it.slots);
    const cat = catOf.get(id);
    const kind = cat ? cat[1] : (skill || slot);
    const lines = text.split('\n').map(esc).join('<br>');
    const fmtStat = (k, v) => `<li>${esc(k.replace(/%$/, ''))} <b>${v > 0 && k !== '防' ? '+' : ''}${v}${/%$/.test(k) ? '%' : ''}</b></li>`;
    const statRows = Object.entries(st.main).map(([k, v]) => fmtStat(k, v)).join('');
    const uses = blogUses.get(it.ja) || [];
    const variants = (byBase.get(baseOf(e)) || []).filter(o => catOf.get(o.id) === cat).sort((a, b) => a.it.ja.length - b.it.ja.length || a.it.ja.localeCompare(b.it.ja, 'ja'));
    const series = (bySeries.get(seriesKey(e)) || []).filter(o => baseOf(o) !== baseOf(e) || o.id === id);
    const seriesOk = series.length >= 2 && series.length <= 16 && new Set(series.map(o => catOf.get(o.id))).size >= 2;
    const sim = similar(e);
    const sameLook = (byLook.get(lookKey(id)) || []).slice().sort((a, b) => (a.it.level - b.it.level) || ((a.it.item_level || 0) - (b.it.item_level || 0)) || a.it.ja.localeCompare(b.it.ja, 'ja'));
    const cover = coverOf(id);
    const recs = recipesOf.get(id) || [];
    const sameLinks = cat ? Object.keys(st.main).filter(k => statIdx.has(k) && k !== '防' && statCount.get(k) >= 30).slice(0, 8)
      .map(k => `<a href="${BASE}search.html?cat=${cat[0]}&amp;stat=${encodeURIComponent(k)}">${esc(k.replace(/%$/, ''))}</a>`).join('') : '';
    const mark = o => (o.id === id ? ' me' : '');
    const tbl = list => `<div class="tbl">${tableHead}${list.map(o => rowHtml(o).replace('<div class="r"', `<div class="r${mark(o)}"`)).join('')}</div>`;
    const descText = `${it.ja}（${kind}・Lv${it.level}${it.item_level ? '・IL' + it.item_level : ''}）の性能・装備できるジョブ・${recs.length ? '合成レシピ・' : ''}${variants.length > 1 ? '段階違い・' : ''}${sameLook.length > 1 ? '見た目が同じ装備・' : ''}性能が近い装備。` + text.replace(/\n/g, ' ').slice(0, 70);
    const html = head(`${it.ja}｜${kind}の性能｜${SITE_SHORT}`, descText, `${ORIGIN}/item/${id}.html`)
      + `<main class="item"><p class="crumb"><a href="${BASE}">トップ</a> › ${cat ? `<a href="${BASE}list/${cat[0]}.html">${esc(cat[1])}の一覧</a>` : esc(slot)} › ${esc(it.ja)}</p>
<section class="ihead"><div class="nm"><h1>${esc(it.ja)}</h1><small>${esc(it.en)}</small></div>
<div class="badges">${cat ? `<a class="bd cat" href="${BASE}list/${cat[0]}.html">${esc(cat[1])}</a>` : ''}<span class="bd">Lv${it.level}</span>${it.item_level ? `<span class="bd il">IL${it.item_level}</span>` : ''}${it.superior_level ? `<span class="bd">Su${it.superior_level}</span>` : ''}${it.damage ? `<span class="bd">D${it.damage}／隔${it.delay}</span>` : ''}${raceNames(it.races) ? `<span class="bd">${esc(raceNames(it.races))}</span>` : ''}${cover.length ? `<span class="bd cover" title="着ている間、${esc(cover.join('・'))}の枠には装備できません">${esc(cover.join('・'))}も覆う</span>` : ''}${rxBadges(id)}</div>
<div class="jobsrow"><span class="lbl">装備できるジョブ</span>${jobCells(it.jobs || 0)}</div></section>
<div class="ingame">${lines || '（性能の文なし）'}</div>
<div class="extl"><a href="${ffo(it.ja)}" rel="noopener" target="_blank">FF11用語辞典で見る（入手方法・オーグメント）</a><a href="${bg(it.en)}" rel="noopener" target="_blank">BG-Wiki（英語）</a><a href="https://jp.ffxiah.com/item/${id}" rel="noopener" target="_blank">FFXIAH（競売の相場）</a></div>
${statRows ? `<h2>性能の内訳</h2><ul class="stats">${statRows}</ul>` : ''}
${Object.keys(st.pet).length ? `<h2>ペットの性能</h2><ul class="stats">${Object.entries(st.pet).map(([k, v]) => fmtStat(k, v)).join('')}</ul>` : ''}
${Object.keys(st.cond).length ? `<p class="note">※潜在能力などの条件付きの性能は、内訳と絞り込みに含めていません（上のゲーム内の文を見てください）。</p>` : ''}
${variants.length > 1 ? `<h2>段階違い（＋1・＋2…）</h2>${tbl(variants)}` : ''}
${seriesOk ? `<h2>同じシリーズ</h2>${tbl(series.sort((a, b) => catOrder(a) - catOrder(b) || a.it.ja.localeCompare(b.it.ja, 'ja')))}` : ''}
${sameLook.length > 1 ? `<h2>見た目が同じ装備（${sameLook.length}件）</h2><p class="note">ゲームの中で同じ見た目になる装備です（有志のサーバー再現データ LandSandBoat で、同じ部位のモデル番号が同じ物）。見た目の固定（ロックスタイル）選びに。${cat ? ` <a href="${BASE}looks/${cat[0]}.html">${esc(cat[1])}の見た目で探す</a>` : ''}</p>${tbl(sameLook.slice(0, 40))}${sameLook.length > 40 ? `<p class="note">ほか${sameLook.length - 40}件。</p>` : ''}` : ''}
<h2>入手方法</h2>${acqHtml(id)}${recs.length ? '<h3>合成</h3>' : ''}${recs.length ? `<p class="note">合成で作れます（有志のサーバー再現データ LandSandBoat のレシピ。数値は参考）。</p>${recs.slice(0, 4).map(recipeHtml).join('')}` : ''}
<p class="note">${recs.length ? 'ほかの入手方法' : 'ドロップ・報酬・お店などの入手方法'}と、オーグメント（追加の性能）の中身は、<a href="${ffo(it.ja)}" rel="noopener" target="_blank">FF11用語辞典の「${esc(it.ja)}」</a>を見てください。</p>
${uses.length ? `<h2>この装備を使っているセット（姉妹ブログ）</h2><ul class="uses">${uses.map(u => `<li><a href="${u.url}">${esc(u.job)}：${esc(u.set)}</a> <span class="k">（${esc(u.parts.join('・'))}）</span></li>`).join('')}</ul>` : ''}
${sim.length ? `<h2>性能が近い装備（同じ${esc(kind)}・同じ帯）</h2>${tbl(sim)}` : ''}
${sameLinks ? `<h2>同じ${cat && cat[3] === 'weapon' ? '種類' : '部位'}（${esc(kind)}）を性能の大きい順で見る</h2><p class="same">${sameLinks}</p>` : ''}
</main>` + foot;
    fs.writeFileSync(path.join(SITE, 'item', `${id}.html`), html);
  }
}

// よく使う絞り込み（トップのリンク）→ 性能で探す（search.html）
const qs = o => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&amp;');
const jobId = ens => JOB_LIST.find(j => j.ens === ens).id;
const QUICK = [
  ['忍者・頭のヘイスト', qs({ job: jobId('NIN'), cat: 'head', stat: 'ヘイスト%' })],
  ['赤魔・胴のファストキャスト', qs({ job: jobId('RDM'), cat: 'body', stat: 'ファストキャスト%' })],
  ['黒魔・MBダメージ', qs({ job: jobId('BLM'), stat: 'マジックバーストダメージ' })],
  ['全ジョブ・被ダメージ', qs({ stat: '被ダメージ%' })],
  ['戦士・WSダメージ', qs({ job: jobId('WAR'), stat: 'ウェポンスキルのダメージ%' })],
  ['白魔・ケアル回復量', qs({ job: jobId('WHM'), stat: 'ケアル回復量%' })],
  ['ストアTP', qs({ stat: 'ストアTP' })],
  ['移動速度', qs({ stat: '移動速度%' })],
];

// 装備できるジョブ：22ジョブを1行に（ff11db の形）。全ジョブは「全ジョブ」
const jobCells = mask => {
  const n = JOB_LIST.filter(j => mask & (1 << j.id)).length;
  if (n >= 22) return '<span class="jb all">全ジョブ</span>';
  return `<span class="jb">${JOB_LIST.map(j => (mask & (1 << j.id) ? `<b title="${esc(j.ja)}">${esc(j.jas)}</b>` : `<i>${esc(j.jas)}</i>`)).join('')}</span>`;
};
const fxText = text => esc(text.replace(/\n+/g, '　'));
const rowHtml = e => {
  const it = e.it;
  const df = it.category === 'Weapon' && it.damage ? `D${it.damage}<br>隔${it.delay}` : (e.st.main['防'] != null ? `防${e.st.main['防']}` : '');
  return `<div class="r" data-id="${e.id}" data-j="${it.jobs || 0}"><div class="c-n"><a href="${BASE}item/${e.id}.html">${esc(it.ja)}</a>${rxTags(e.id)}<small>${esc(it.en)}</small></div>`
    + `<div class="c-lv">${it.level}</div><div class="c-il">${it.item_level || ''}</div><div class="c-df">${df}</div>`
    + `<div class="c-jb">${jobCells(it.jobs || 0)}</div><div class="c-fx">${fxText(e.text) || '<span class="nl">（性能の文なし）</span>'}</div></div>`;
};
const tableHead = '<div class="r h"><div class="c-n">名前</div><div class="c-lv">Lv</div><div class="c-il">IL</div><div class="c-df">防／D</div><div class="c-jb">装備できるジョブ</div><div class="c-fx">性能（ゲーム内の表記）</div></div>';
const jobChips = `<div class="jfilter"><span class="lbl">ジョブで絞る：</span><button type="button" data-job="" class="on">すべて</button>${JOB_LIST.map(j => `<button type="button" data-job="${j.id}" title="${esc(j.ja)}">${esc(j.jas)}</button>`).join('')}</div>`;

// ── 一覧ページ（部位・武器の種類ごと）
fs.mkdirSync(path.join(SITE, 'list'), { recursive: true });
const listPages = [];
const catCount = new Map();
for (const [key, ja, , kind] of ALL_CATS) {
  const list = equip.filter(e => catOf.get(e.id) && catOf.get(e.id)[0] === key)
    .sort((a, b) => bandOf(a.it) - bandOf(b.it) || (b.it.item_level || 0) - (a.it.item_level || 0) || b.it.level - a.it.level || b.id - a.id);
  catCount.set(key, list.length);
  if (!list.length) continue;
  const groups = BANDS.map((label, i) => [label, list.filter(e => bandOf(e.it) === i)]).filter(([, l]) => l.length);
  const kindJa = kind === 'armor' ? '防具' : '武器';
  const url = `${ORIGIN}/list/${key}.html`;
  listPages.push(url);
  const searchLink = `${BASE}search.html?${qs({ cat: key })}`;
  fs.writeFileSync(path.join(SITE, 'list', `${key}.html`), head(`${ja}の${kindJa}一覧（${list.length.toLocaleString()}件）｜${SITE_SHORT}`,
    `FF11の${ja}の${kindJa}${list.length.toLocaleString()}件を、IL119からLv1まで帯ごとに一覧。装備できるジョブと性能を1行で見比べられ、ジョブで絞り込めます（${asof.note}）。`, url)
    + `<main class="wide"><p class="crumb"><a href="${BASE}">トップ</a> › ${kindJa} › ${esc(ja)}</p>
<h1>${esc(ja)}の${kindJa}一覧 <span class="cnt">${list.length.toLocaleString()}件</span></h1>
<p class="lead">IL・Lvの高い順に、帯ごとに並べています。ジョブを押すと、そのジョブが装備できる物だけになります。性能の数値で並べ替えたい時は <a href="${searchLink}">性能で探す</a>。</p>
${catNav(key)}
${jobChips}
<nav class="bands">${groups.map(([label, l]) => `<a href="#${encodeURIComponent(label)}" data-band="${esc(label)}">${esc(label)}<span>${l.length}</span></a>`).join('')}</nav>
<div class="tbl" data-ck="eq">${tableHead}${groups.map(([label, l]) => `<div class="band" id="${esc(label)}" data-band="${esc(label)}">${esc(label)} <span>${l.length}件</span></div>${l.map(rowHtml).join('')}`).join('')}</div>
<p class="none" hidden>このジョブが装備できる物はありません。</p>
</main><script src="${BASE}list.js?v=${VER}"></script>` + foot);
}
function catNav(current) {
  const a = ([key, ja]) => key === current ? `<b>${esc(ja)}</b>` : `<a href="${BASE}list/${key}.html">${esc(ja)}</a>`;
  return `<nav class="catnav"><div><span class="lbl">防具</span>${ARMOR_CATS.map(a).join('')}</div><div><span class="lbl">武器</span>${WEAPON_CATS.map(a).join('')}</div></nav>`;
}

// ── 最新：バージョンアップごとに「新装備」と「新アイテム（装備以外）」を分けて出す
const updates = [];
for (const u of (fs.existsSync(path.join(DATA, 'updates.json')) ? JSON.parse(fs.readFileSync(path.join(DATA, 'updates.json'), 'utf8')) : [])) {
  const same = updates.find(x => x.label === u.label);
  if (same) same.ids.push(...u.ids); else updates.push({ label: u.label, ids: [...u.ids] });
}
const equipById = new Map(equip.map(e => [e.id, e]));
const updateBlock = (u, full) => {
  const eqs = u.ids.map(id => equipById.get(id)).filter(Boolean);
  const others = u.ids.filter(id => !equipById.has(id)).filter(id => { const it = items.get(id); return it && it.ja && it.ja !== '.'; });
  return `<section class="vu-block"><h3>${esc(u.label)} のバージョンアップ</h3>
<h4>新装備 <span>${eqs.length}件</span></h4>${eqs.length ? `<div class="tbl" data-ck="eq">${tableHead}${eqs.map(rowHtml).join('')}</div>` : '<p class="nl">新しい装備はありません。</p>'}
<h4>新アイテム（装備以外） <span>${others.length}件</span></h4>${others.length ? `<ul class="newitems">${others.slice(0, full ? 999 : 12).map(id => `<li><a href="${BASE}item/${id}.html">${esc(items.get(id).ja)}</a></li>`).join('')}${!full && others.length > 12 ? `<li class="more"><a href="${BASE}new.html">ほか${others.length - 12}件</a></li>` : ''}</ul>` : '<p class="nl">新しいアイテムはありません。</p>'}</section>`;
};
fs.writeFileSync(path.join(SITE, 'new.html'), head(`FF11の新装備・新アイテム（バージョンアップごと）｜${SITE_SHORT}`,
  `FF11のバージョンアップごとに増えた装備とアイテムの一覧（${updates.map(u => u.label).slice(0, 3).join('・')}など）。毎日自動で更新しています。`, `${ORIGIN}/new.html`)
  + `<main class="wide"><p class="crumb"><a href="${BASE}">トップ</a> › 新装備・新アイテム</p><h1>新装備・新アイテム</h1>
<p class="lead">バージョンアップごとに、ゲームのデータに増えた物を「装備」と「アイテム（装備以外）」に分けて並べています。データは毎日自動で取り込んでいます（${esc(asof.note)}）。</p>
${updates.map(u => updateBlock(u, true)).join('')}</main><script src="${BASE}list.js?v=${VER}"></script>` + foot);

// ── ジョブ別のページ：部位ごとの一覧（そのジョブで絞った一覧へ）と、部位×性能の件数
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
  const cats = ALL_CATS.map(c => [c, mine.filter(e => catOf.get(e.id) === c)]).filter(([, l]) => l.length);
  const cell = (key, l, k) => {
    const n = l.filter(e => k in e.st.main).length;
    const p = { job: j.id, cat: key, stat: k };
    return n ? `<a href="${BASE}search.html?${qs(p)}">${n}</a>` : '<span class="nl">—</span>';
  };
  const blog = BLOG_JOB[j.ens] ? `<p>このジョブの装備セットと選んだ理由は、姉妹ブログの <a href="https://ff11ikou.blog.fc2.com/blog-entry-${BLOG_JOB[j.ens]}.html">${esc(j.ja)}の装備の記事</a> にまとめています。</p>` : '';
  const url = `${ORIGIN}/job/${j.ens.toLowerCase()}.html`;
  jobPages.push(url);
  fs.writeFileSync(path.join(SITE, 'job', `${j.ens.toLowerCase()}.html`), head(`${j.ja}の装備一覧｜部位・武器ごと｜${SITE_SHORT}`,
    `FF11 ${j.ja}が装備できる${mine.length.toLocaleString()}件（IL119は${il119}件）を、部位・武器ごとの一覧と、性能（${stats.slice(0, 4).map(k => k.replace(/%$/, '')).join('・')}など）で探せます。`, url)
    + `<main class="wide"><p class="crumb"><a href="${BASE}">トップ</a> › ジョブ別 › ${esc(j.ja)}</p><h1>${esc(j.ja)}の装備 <span class="cnt">${mine.length.toLocaleString()}件（IL119 ${il119}件）</span></h1>
${blog}
<div class="tw"><table class="grid"><tr><th>一覧</th><th>件数</th>${stats.map(k => `<th>${esc(k.replace(/%$/, ''))}</th>`).join('')}</tr>
${cats.map(([[key, ja], l]) => `<tr><th><a href="${BASE}list/${key}.html?job=${j.id}">${esc(ja)}</a></th><td>${l.length}</td>${stats.map(k => `<td>${cell(key, l, k)}</td>`).join('')}</tr>`).join('\n')}</table></div>
<p class="note">部位・武器の名前を押すと、${esc(j.ja)}が装備できる物だけの一覧になります。性能の列の数字は、その性能が付いている装備の件数で、押すと大きい順に並びます（潜在能力などの条件付きの性能とオーグメントは数えていません）。</p>
<h2>ほかのジョブ</h2><p class="same">${JOB_LIST.map(o => o.id === j.id ? `<b>${esc(o.ja)}</b>` : `<a href="${BASE}job/${o.ens.toLowerCase()}.html">${esc(o.ja)}</a>`).join('　')}</p>
</main>` + foot);
}

// ── 性能で探す（絞り込み・並べ替え）
fs.writeFileSync(path.join(SITE, 'search.html'), head(`性能で探す（ヘイスト・ファストキャストなど）｜${SITE_SHORT}`,
  `FF11の装備${equip.length.toLocaleString()}件を、ジョブ・部位・性能（ヘイスト・ファストキャスト・マジックバーストなど）で絞り込み、大きい順に並べられます。`, `${ORIGIN}/search.html`)
  + `<main class="finder"><p class="crumb"><a href="${BASE}">トップ</a> › 性能で探す</p><h1>性能で探す</h1>
<div class="quick"><b>よく使う：</b>${QUICK.map(([label, q]) => `<a href="${BASE}search.html?${q}">${esc(label)}</a>`).join('')}</div>
<div class="ctl">
 <div class="row"><label>ジョブ</label><div id="jobs" class="chips"></div></div>
 <div class="row"><label>防具</label><div id="cats-armor" class="chips"></div></div>
 <div class="row"><label>武器</label><div id="cats-weapon" class="chips"></div></div>
 <div class="row"><label>性能</label><div class="statpick" id="statpick"></div></div>
 <div class="row"><label>並び</label><select id="dir"><option value="desc">大きい順</option><option value="asc">小さい順</option></select></div>
 <div class="row"><label>装備Lv</label><input id="lvmin" type="number" min="1" max="99" value="1">〜<input id="lvmax" type="number" min="1" max="99" value="99">
  <label class="ck"><input id="il" type="checkbox">IL装備だけ</label></div>
 <div class="row"><label>名前</label><input id="q" type="search" placeholder="名前の一部（日本語・英語）"></div>
</div>
<p id="count" class="count"></p>
<div id="list" class="tbl"></div>
<p class="more"><button id="more" hidden>もっと見る</button></p>
<noscript><p>絞り込みにはJavaScriptが要ります。</p></noscript>
</main><script src="${BASE}app.js?v=${VER}"></script>` + foot);

// ── トップ：最新の枠 → 防具 → 武器 → ジョブ別 → 性能で探す
const ICON = { head: '頭', body: '胴', hands: '手', legs: '脚', feet: '足', neck: '首', waist: '腰', back: '背', ear: '耳', ring: '指', shield: '盾', h2h: '拳', dagger: '短', sword: '剣', gsword: '大', axe: '斧', gaxe: '鉞', scythe: '鎌', polearm: '槍', katana: '刀', gkatana: '太', club: '棍', staff: '杖', archery: '弓', marksmanship: '銃', throwing: '投', wind: '笛', string: '琴', handbell: '鈴', fishing: '竿', ammo: '矢', grip: '握' };
const tile = (href, label, n, ic, cls = '') => `<a class="tile ${cls}" href="${href}"><span class="ic">${esc(ic)}</span><span><b>${esc(label)}</b><span class="n">${n.toLocaleString()}件</span></span></a>`;
const synthAll = fs.existsSync(path.join(DATA, 'synth.json')) ? JSON.parse(fs.readFileSync(path.join(DATA, 'synth.json'), 'utf8')) : [];
const more = writeMore({ items, desc, JOB_LIST, skills, head, foot, esc, BASE, ORIGIN, SITE, DATA, SITE_SHORT, equipById, synth: synthAll, tile, VER, rxBadges, rxTags, lsb, acqHtml });
console.log('装備以外', JSON.stringify(more.counts));
const qs2 = writeQuests({ items, JOB_LIST, head, foot, esc, BASE, ORIGIN, SITE, DATA, SITE_SHORT, VER, tile });
console.log('クエスト・ミッション', JSON.stringify(qs2.counts));
const ex = writeExtra({ JOB_LIST, head, foot, esc, BASE, ORIGIN, SITE, DATA, SITE_SHORT, VER, tile });
console.log('そのほか', JSON.stringify(ex.counts));
const sy = writeSynth({ items, head, foot, esc, BASE, ORIGIN, SITE, DATA, SITE_SHORT, VER, tile, hasPage: id => equipById.has(id) || more.itemCatOf.has(id) });
console.log('合成レシピ', sy.count);
const fi = writeFishing({ items, head, foot, esc, BASE, ORIGIN, SITE, DATA, SITE_SHORT, VER, tile, lsb, hasPage: id => equipById.has(id) || more.itemCatOf.has(id) });
console.log('釣り', fi.count);
const gu = writeGuild({ items, head, foot, esc, BASE, ORIGIN, SITE, SITE_SHORT, VER, tile, lsb, hasPage: id => equipById.has(id) || more.itemCatOf.has(id) });
console.log('ギルドの納品', gu.count);
const lk = writeLooks();
console.log('見た目で探す', lk.count, '通り', lk.urls.length, 'ページ');
fs.writeFileSync(path.join(SITE, 'index.html'), head(`${SITE_NAME}｜部位・武器・ジョブごとの一覧と性能で探す（最新のバージョンアップまで）`,
  `FF11の装備${equip.length.toLocaleString()}件を、部位・武器の種類・ジョブごとの一覧で見比べ、ヘイストやファストキャストなどの性能でも探せるデータベース。バージョンアップごとの新装備も毎日自動で更新（${asof.note}）。`, `${ORIGIN}/`)
  + `<main class="wide home">
<section class="hero"><h1>FF11の装備・アイテム・魔法を、一覧でざっと見比べる</h1>
<form class="hfind big" action="${BASE}find.html" method="get" role="search"><span class="hf-ic" aria-hidden="true"></span><input name="q" type="search" placeholder="名前で探す　例：ニャメ、モグスーツ、ケアル、プロマシア" autocomplete="off" aria-label="名前で探す"><button type="submit">探す</button>
<div class="hf-ex"><span>例：</span><a href="${BASE}find.html?q=%E3%83%8B%E3%83%A3%E3%83%A1" data-q="ニャメ">ニャメ</a><a href="${BASE}find.html?q=%E3%83%95%E3%82%A7%E3%82%A4%E3%82%B9" data-q="フェイス">フェイス</a><a href="${BASE}find.html?q=%E7%99%BD%E9%AD%94%E6%B3%95%20%E3%82%B1%E3%82%A2%E3%83%AB" data-q="白魔法 ケアル">白魔法 ケアル</a><a href="${BASE}find.html?q=%E3%83%97%E3%83%AD%E3%83%9E%E3%82%B7%E3%82%A2" data-q="プロマシア">プロマシア</a><a href="${BASE}find.html?q=%E3%83%88%E3%83%A9%E3%83%90%E3%83%BC%E3%82%B5%E3%83%BC" data-q="トラバーサー">トラバーサー</a><span class="hf-n">装備・アイテム・魔法・だいじなもの・クエストなど約3万件。ひらがな・英語でもOK</span></div></form>
<p>装備${equip.length.toLocaleString()}件・アイテム${more.counts.items.toLocaleString()}件・だいじなもの${more.counts.ki.toLocaleString()}件・魔法${more.counts.spells}件・WS${more.counts.ws}件・アビリティ${more.counts.ab}件・クエスト${qs2.counts.quests}件・ミッション${qs2.counts.missions}件。装備は部位・武器の種類・ジョブごとに、IL・Lvの帯で並べています。装備できるジョブは22ジョブを1行で、性能はゲーム内の表記のまま。毎日、最新のデータを取り込んでいます（<b>${esc(asof.note)}</b>）。</p></section>
<section class="box latest"><h2>最新の新装備・新アイテム <a class="all" href="${BASE}new.html">バージョンアップごとの一覧へ</a></h2>
${updates.slice(0, 2).map(u => updateBlock(u, false)).join('')}</section>
<section class="box" id="armor"><h2>防具（部位ごと）</h2><div class="tiles">${ARMOR_CATS.map(([k, ja]) => tile(`${BASE}list/${k}.html`, ja, catCount.get(k) || 0, ICON[k])).join('')}</div></section>
<section class="box" id="weapon"><h2>武器（種類ごと）</h2><div class="tiles">${WEAPON_CATS.filter(([k]) => catCount.get(k)).map(([k, ja]) => tile(`${BASE}list/${k}.html`, ja, catCount.get(k), ICON[k], 'w')).join('')}</div></section>
${more.home}
${sy.home}
${qs2.home}
${ex.home.replace('</div></section>', fi.home + gu.home + lk.home + '</div></section>')}
<section class="box" id="job"><h2>ジョブ別</h2><div class="tiles small">${JOB_LIST.map(j => tile(`${BASE}job/${j.ens.toLowerCase()}.html`, j.ja, equip.filter(e => (e.it.jobs || 0) & (1 << j.id)).length, j.jas, 'j')).join('')}</div></section>
<section class="box" id="search"><h2>性能で探す</h2><p>ヘイスト・ファストキャスト・マジックバースト・被ダメージなど、性能の数値で絞り込んで大きい順に並べられます。 <a class="btn" href="${BASE}search.html">性能で探す</a></p>
<div class="quick">${QUICK.map(([label, q]) => `<a href="${BASE}search.html?${q}">${esc(label)}</a>`).join('')}</div></section>
</main><script src="${BASE}list.js?v=${VER}"></script>` + foot);


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

writeItemPages();
const fd = writeFind({ ROOT, SITE, ORIGIN, head, foot, SITE_SHORT, BASE, VER });
console.log('名前で探す', fd.count);

// 検索エンジン向け
fs.writeFileSync(path.join(SITE, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
fs.writeFileSync(path.join(SITE, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + [`${ORIGIN}/`, `${ORIGIN}/new.html`, `${ORIGIN}/search.html`, `${ORIGIN}/about.html`, ...listPages, ...jobPages, ...more.urls, ...qs2.urls, ...ex.urls, ...sy.urls, ...fi.urls, ...gu.urls, ...lk.urls, ...fd.urls, ...equip.map(e => `${ORIGIN}/item/${e.id}.html`)].map(u => `<url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');

console.log(`装備 ${equip.length}件 / 性能の種類 ${STATS.length}（ペット ${petCount.size}） / データ ${asof.date}`);
console.log('items.json', (fs.statSync(path.join(SITE, 'items.json')).size / 1024 / 1024).toFixed(2), 'MB');
