// そのほかの一覧（Windower Resources・BSD）：称号・マウント・メリットポイント・ジョブポイント・ジョブ特性・状態・モンスターの技・モンストロス・エリア
import fs from 'node:fs';
import path from 'node:path';
import { readLua } from './lua.mjs';

export function writeExtra(ctx) {
  const { JOB_LIST, head, foot, esc, BASE, ORIGIN, SITE, DATA, SITE_SHORT, VER, tile } = ctx;
  const urls = [];
  const write = (rel, html) => { const f = path.join(SITE, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); urls.push(`${ORIGIN}/${rel}`); };
  const load = f => (fs.existsSync(path.join(DATA, f + '.lua')) ? [...readLua(path.join(DATA, f + '.lua')).values()].filter(x => x.ja && x.ja !== '.') : []);
  const crumb = (...p) => `<p class="crumb"><a href="${BASE}">トップ</a>${p.map(x => ` › ${x}`).join('')}</p>`;
  const ffo = ja => `https://wiki.ffo.jp/search.cgi?CCC=%E6%84%9B&amp;Command=Search&amp;qf=${encodeURIComponent(ja)}&amp;order=match&amp;ffotype=title&amp;type=title`;
  const jobById = new Map(JOB_LIST.map(j => [j.id, j]));
  const filterBox = id => `<div class="row"><label>名前</label><input type="search" class="tfilter" data-for="${id}" placeholder="名前の一部で絞る（日本語・英語）"></div>`;
  const page = (rel, title, desc, h1, cnt, body, scripts = true) => write(rel, head(`${title}｜${SITE_SHORT}`, desc, `${ORIGIN}/${rel}`)
    + `<main class="wide">${crumb(esc(h1))}<h1>${esc(h1)} <span class="cnt">${cnt}</span></h1>${body}</main>${scripts ? `<script src="${BASE}list.js?v=${VER}"></script>` : ''}` + foot);
  const counts = {};

  // 称号（チェックリスト）
  const titles = load('titles').sort((a, b) => a.id - b.id);
  counts.titles = titles.length;
  page('titles.html', `称号の一覧（${titles.length}件）・チェックリスト`, `FF11の称号${titles.length}件の一覧（日本語名・英語名）。持っている称号にチェックを付けて、取り忘れを確認できます。`, '称号', `${titles.length}件`,
    `<p class="lead">持っている称号にチェックを付けると、「まだの物だけ」で取り忘れが分かります（チェックはこのブラウザに残ります）。</p>${filterBox('tt')}
<div class="tbl simple" id="tt" data-ck="tt"><div class="r h"><div class="c-n">称号</div><div class="c-fx">英語名</div><div class="c-x">用語辞典</div></div>${titles.map(t => `<div class="r" data-id="${t.id}"><div class="c-n"><b>${esc(t.ja)}</b></div><div class="c-fx">${esc(t.en)}</div><div class="c-x"><a href="${ffo(t.ja)}" rel="noopener" target="_blank">見る</a></div></div>`).join('')}</div>`);

  // マウント（チェックリスト・説明つき）
  const mounts = load('mounts').sort((a, b) => a.id - b.id);
  counts.mounts = mounts.length;
  page('mounts.html', `マウントの一覧（${mounts.length}種）・チェックリスト`, `FF11のマウント${mounts.length}種の一覧と説明。持っているマウントにチェックを付けられます。`, 'マウント', `${mounts.length}種`,
    `<div class="tbl simple" data-ck="mt"><div class="r h"><div class="c-n">マウント</div><div class="c-fx">説明（ゲーム内の表記）</div><div class="c-x">用語辞典</div></div>${mounts.map(m => `<div class="r" data-id="${m.id}"><div class="c-n"><b>${esc(m.ja)}</b><small>${esc(m.en)}</small></div><div class="c-fx">${esc(m.jadesc || '')}</div><div class="c-x"><a href="${ffo(m.ja)}" rel="noopener" target="_blank">見る</a></div></div>`).join('')}</div>`);

  // メリットポイント（共通の項目 → ジョブごとに1群・2群をまとめて → ウェポンスキル）
  const merits = load('merit_points');
  // [並びの番号, 帯の名前, 群（ジョブの項目だけ 1/2）]
  const meritCat = id => {
    const k = id >> 6 << 6;
    const base = { 64: 'HP・MP', 128: '能力値', 192: '戦闘スキル', 256: '魔法スキル', 320: 'その他' };
    if (base[k]) return [k, base[k], 0];
    if (k === 1664) return [99999, 'ウェポンスキル', 0];
    let j = 0, g = 0;
    if (k >= 384 && k <= 1600) { j = (k - 384) / 64 + 1; g = 1; } else if (k === 1728) { j = 21; g = 1; } else if (k === 1792) { j = 22; g = 1; }
    else if (k >= 2048 && k <= 3264) { j = (k - 2048) / 64 + 1; g = 2; } else if (k === 3392) { j = 21; g = 2; } else if (k === 3456) { j = 22; g = 2; }
    if (j) return [10000 + j, (jobById.get(j) || {}).ja || '?', g];
    return [99998, 'そのほか', 0];
  };
  const mGroups = new Map();
  for (const m of merits) { const [k, ja, g] = meritCat(m.id); if (!mGroups.has(k)) mGroups.set(k, [ja, []]); mGroups.get(k)[1].push([g, m]); }
  const mSorted = [...mGroups].sort((a, b) => a[0] - b[0]);
  const mRow = m => `<div class="r" data-id="${m.id}"><div class="c-n"><b>${esc(m.ja)}</b><small>${esc(m.en)}</small></div><div class="c-fx">${esc(m.jadesc || '').replace(/\n/g, '<br>')}</div></div>`;
  const mBody = l => {
    l.sort((a, b) => (a[0] - b[0]) || (a[1].id - b[1].id));
    if (!l[0][0]) return l.map(([, m]) => mRow(m)).join('');
    return [1, 2].map(g => { const x = l.filter(e => e[0] === g); return x.length ? `<div class="subband">${g}群 <span>${x.length}件</span></div>${x.map(([, m]) => mRow(m)).join('')}` : ''; }).join('');
  };
  counts.merits = merits.length;
  page('merits.html', `メリットポイントの一覧（${merits.length}項目）`, `FF11のメリットポイント${merits.length}項目を、共通の項目とジョブごと（1群・2群）に、効果の説明つきで。`, 'メリットポイント', `${merits.length}項目`,
    `<p class="lead">共通の項目のあとに、ジョブごとに1群・2群をまとめて並べています。</p><nav class="bands">${mSorted.map(([k, [ja, l]]) => `<a href="#m${k}" data-band="${esc(ja)}">${esc(ja)}<span>${l.length}</span></a>`).join('')}</nav>
<div class="tbl simple2" data-ck="mr"><div class="r h"><div class="c-n">項目</div><div class="c-fx">効果（ゲーム内の表記）</div></div>${mSorted.map(([k, [ja, l]]) => `<div class="band" id="m${k}" data-band="${esc(ja)}">${esc(ja)} <span>${l.length}件</span></div>${mBody(l)}`).join('')}</div>`);

  // ジョブポイント（ジョブごと）
  const jps = load('job_points');
  const jGroups = new Map();
  for (const p of jps) { const j = p.id >> 6; if (!jGroups.has(j)) jGroups.set(j, []); jGroups.get(j).push(p); }
  counts.jp = jps.length;
  page('jobpoints.html', `ジョブポイントの一覧（${jps.length}項目）`, `FF11のジョブポイント${jps.length}項目をジョブごとに、効果の説明つきで。`, 'ジョブポイント', `${jps.length}項目`,
    `<nav class="bands">${[...jGroups.keys()].sort((a, b) => a - b).map(j => `<a href="#j${j}" data-band="${esc((jobById.get(j) || {}).ja || j)}">${esc((jobById.get(j) || {}).ja || j)}<span>${jGroups.get(j).length}</span></a>`).join('')}</nav>
<div class="tbl simple2" data-ck="jp"><div class="r h"><div class="c-n">項目</div><div class="c-fx">効果（ゲーム内の表記）</div></div>${[...jGroups.keys()].sort((a, b) => a - b).map(j => `<div class="band" id="j${j}" data-band="${esc((jobById.get(j) || {}).ja || j)}">${esc((jobById.get(j) || {}).ja || j)} <span>${jGroups.get(j).length}件</span></div>${jGroups.get(j).sort((a, b) => a.id - b.id).map(p => `<div class="r" data-id="${p.id}"><div class="c-n"><b>${esc(p.ja)}</b><small>${esc(p.en)}</small></div><div class="c-fx">${esc(p.jadesc || '').replace(/\n/g, '<br>')}</div></div>`).join('')}`).join('')}</div>`);

  // ジョブ特性・状態（強化／弱体）
  const traits = load('job_traits').sort((a, b) => a.id - b.id);
  counts.traits = traits.length;
  page('traits.html', `ジョブ特性の一覧（${traits.length}件）`, `FF11のジョブ特性${traits.length}件の一覧（日本語名・英語名）。`, 'ジョブ特性', `${traits.length}件`,
    `${filterBox('tr')}<div class="tbl simple" id="tr"><div class="r h"><div class="c-n">特性</div><div class="c-fx">英語名</div><div class="c-x">用語辞典</div></div>${traits.map(t => `<div class="r"><div class="c-n"><b>${esc(t.ja)}</b></div><div class="c-fx">${esc(t.en)}</div><div class="c-x"><a href="${ffo(t.ja)}" rel="noopener" target="_blank">見る</a></div></div>`).join('')}</div>`);
  const buffs = load('buffs').sort((a, b) => a.id - b.id);
  counts.buffs = buffs.length;
  page('buffs.html', `状態（強化・弱体）の一覧（${buffs.length}件）`, `FF11の強化・弱体などの状態${buffs.length}件の一覧（日本語名・英語名）。`, '状態（強化・弱体）', `${buffs.length}件`,
    `${filterBox('bf')}<div class="tbl simple" id="bf"><div class="r h"><div class="c-n">状態</div><div class="c-fx">英語名</div><div class="c-x">用語辞典</div></div>${buffs.map(t => `<div class="r"><div class="c-n"><b>${esc(t.ja)}</b></div><div class="c-fx">${esc(t.en)}</div><div class="c-x"><a href="${ffo(t.ja)}" rel="noopener" target="_blank">見る</a></div></div>`).join('')}</div>`);

  // モンスターの技（検索できる一覧）
  const mab = load('monster_abilities').sort((a, b) => a.id - b.id);
  counts.mab = mab.length;
  page('monster-abilities.html', `モンスターの技の一覧（${mab.length}件）`, `FF11のモンスターの技${mab.length}件（日本語名・英語名）。名前で絞り込めます。`, 'モンスターの技', `${mab.length}件`,
    `${filterBox('ma')}<div class="tbl simple" id="ma"><div class="r h"><div class="c-n">技</div><div class="c-fx">英語名</div><div class="c-x">用語辞典</div></div>${mab.map(t => `<div class="r"><div class="c-n"><b>${esc(t.ja)}</b></div><div class="c-fx">${esc(t.en)}</div><div class="c-x"><a href="${ffo(t.ja)}" rel="noopener" target="_blank">見る</a></div></div>`).join('')}</div>`);

  // モンストロス（種族とTP技）
  const fams = load('monstrosity').sort((a, b) => a.id - b.id);
  const msk = new Map(load('monster_skills').map(s => [s.id, s]));
  counts.mon = fams.length;
  const moves = f => [...String(f.tp_moves || '').matchAll(/\[(\d+)\]\s*=\s*(\d+)/g)].map(m => [msk.get(Number(m[1])), Number(m[2])]).filter(([s]) => s).sort((a, b) => a[1] - b[1]);
  page('monstrosity.html', `モンストロスの種族とTP技（${fams.length}種族）`, `FF11モンストロスの${fams.length}種族と、覚えるTP技（Lv・TP）の一覧。`, 'モンストロス', `${fams.length}種族`,
    `${filterBox('mo')}<div class="tbl simple2" id="mo" data-ck="mo"><div class="r h"><div class="c-n">種族</div><div class="c-fx">TP技（覚えるLv）</div></div>${fams.map(f => `<div class="r" data-id="${f.id}"><div class="c-n"><b>${esc(f.ja)}</b><small>${esc(f.en)}</small></div><div class="c-fx c-jl">${moves(f).map(([s, lv]) => `<span class="lv1"><b>Lv${lv}</b>${esc(s.ja)}</span>`).join('') || '<span class="nl">—</span>'}</div></div>`).join('')}</div>`);

  // エリア
  const zones = load('zones').sort((a, b) => a.id - b.id);
  // 地図のあるエリア（src/maps.json）
  const mapZ = new Set(fs.existsSync(path.join(DATA, '..', 'src', 'maps.json')) ? JSON.parse(fs.readFileSync(path.join(DATA, '..', 'src', 'maps.json'), 'utf8')).map(x => x[1]) : []);
  counts.zones = zones.length;
  const flag = (b, t) => b ? `<span class="tag">${t}</span>` : '';
  page('zones.html', `エリアの一覧（${zones.length}件）`, `FF11のエリア${zones.length}件（日本語名・英語名）と、マウント・ペット・ネクサスの可否。`, 'エリア', `${zones.length}件`,
    `${filterBox('zn')}<div class="tbl simple" id="zn"><div class="r h"><div class="c-n">エリア</div><div class="c-fx">英語名・できること</div><div class="c-x">用語辞典</div></div>${zones.map(z => `<div class="r"><div class="c-n">${mapZ.has(z.id) ? `<a href="${BASE}maps/${z.id}.html">${esc(z.ja)}</a> <span class="tag rep">地図</span>` : `<b>${esc(z.ja)}</b>`}</div><div class="c-fx">${esc(z.en)} ${flag(z.can_mount, 'マウント')}${flag(z.can_pet, 'ペット')}${flag(z.can_nexus, 'ネクサス')}</div><div class="c-x"><a href="${ffo(z.ja)}" rel="noopener" target="_blank">見る</a></div></div>`).join('')}</div>`);

  const home = `<section class="box" id="more"><h2>そのほかの一覧</h2><div class="tiles">${[
    ['titles.html', '称号', counts.titles, '称'], ['mounts.html', 'マウント', counts.mounts, '騎'], ['merits.html', 'メリットポイント', counts.merits, 'メ'], ['jobpoints.html', 'ジョブポイント', counts.jp, 'JP'],
    ['traits.html', 'ジョブ特性', counts.traits, '特'], ['buffs.html', '状態（強化・弱体）', counts.buffs, '状'], ['monster-abilities.html', 'モンスターの技', counts.mab, '技'], ['monstrosity.html', 'モンストロス', counts.mon, '魔'], ['zones.html', 'エリア', counts.zones, '地'],
  ].map(([u, ja, n, ic]) => tile(`${BASE}${u}`, ja, n, ic, 'ex')).join('')}</div></section>`;
  const meritByJob = new Map(); for (const [k, [, l]] of mGroups) if (k > 10000 && k < 10100) meritByJob.set(k - 10000, l);
  const jpByJob = jGroups;
  return { home, urls, counts, meritByJob, jpByJob };
}
