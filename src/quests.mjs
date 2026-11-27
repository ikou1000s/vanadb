// クエスト・ミッションのチェックリスト（data/quests.json＝Journal-FFXI-JP・GPL-3.0 から名前・場所・NPC・条件・報酬だけ）
import fs from 'node:fs';
import path from 'node:path';
import { readLua } from './lua.mjs';

export function writeQuests(ctx) {
  const { items, JOB_LIST, head, foot, esc, BASE, ORIGIN, SITE, DATA, SITE_SHORT, VER, tile } = ctx;
  const file = path.join(DATA, 'quests.json');
  if (!fs.existsSync(file)) return { home: '', urls: [], counts: { quests: 0, missions: 0 } };
  const Q = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.mkdirSync(path.join(SITE, 'data'), { recursive: true }); fs.copyFileSync(file, path.join(SITE, 'data', 'quests.json')); // GPL-3.0：使った形のデータも公開する
  const urls = [];
  const write = (rel, html) => { const f = path.join(SITE, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); urls.push(`${ORIGIN}/${rel}`); };
  const crumb = (...p) => `<p class="crumb"><a href="${BASE}">トップ</a>${p.map(x => ` › ${x}`).join('')}</p>`;
  const ffo = ja => `https://wiki.ffo.jp/search.cgi?CCC=%E6%84%9B&amp;Command=Search&amp;qf=${encodeURIComponent(ja)}&amp;order=match&amp;ffotype=title&amp;type=title`;
  // 英語名 → 日本語（エリア・アイテム・ジョブ・クエスト）
  const zones = fs.existsSync(path.join(DATA, 'zones.lua')) ? readLua(path.join(DATA, 'zones.lua')) : new Map();
  const zkey = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const zoneJa = new Map([...zones.values()].filter(z => z.en && z.ja).map(z => [zkey(z.en), z.ja]));
  zoneJa.set(zkey('Other Locations'), 'そのほかの場所'); zoneJa.set(zkey('Mog House'), 'モグハウス'); zoneJa.set(zkey('Multi-Nation'), '各国');
  const itemByEn = new Map();
  for (const [id, it] of items) if (it.en && it.ja && it.ja !== '.' && it.category !== 'Gil') { const k = it.en.toLowerCase(); if (!itemByEn.has(k)) itemByEn.set(k, id); }
  const jobByEns = new Map(JOB_LIST.map(j => [j.ens, j.ja]));
  const jobByEn = new Map(JOB_LIST.map(j => [j.en.toLowerCase(), j.ja]));
  const questJa = new Map(Q.quests.flatMap(a => a.list.map(q => [q.en, q.ja])));
  const zoneTxt = z => zoneJa.get(zkey(z)) || z;
  const locTxt = (zone, loc) => { const g = /\(([A-Z]-\d+)\)/.exec(loc || ''); return esc(zoneTxt(zone)) + (g ? ` <span class="grid">${g[1]}</span>` : ''); };
  const reqTxt = r => esc(r).replace(/Lv\.?\s?(\d+)\+/g, 'Lv$1以上').replace(/\b([A-Z]{3})\b/g, (m, c) => jobByEns.get(c) || m).replace(/Fame/g, '名声').replace(/Rank/g, 'ランク');
  const rewardTxt = r => (r || '').split(/\s*(?:,|\/| and )\s*/).filter(Boolean).map(x => {
    const id = itemByEn.get(x.toLowerCase().replace(/^\d+x?\s+/, ''));
    if (id) return `<a href="${BASE}item/${id}.html">${esc(items.get(id).ja)}</a>`;
    const job = /^(.+?) job$/i.exec(x); if (job && jobByEn.get(job[1].toLowerCase())) return `${esc(jobByEn.get(job[1].toLowerCase()))}になれる`;
    const gil = /^([\d,]+)\s*gil$/i.exec(x); if (gil) return `${gil[1]}ギル`;
    return `<span class="en">${esc(x)}</span>`;
  }).join('・');
  const prereqTxt = p => (p || '').split(/\s*(?:,|\/)\s*/).filter(Boolean).map(x => questJa.get(x) ? esc(questJa.get(x)) : `<span class="en">${esc(x)}</span>`).join('・');

  // ── クエスト（エリアごと・ゾーンの帯・チェック欄）
  const qTotal = Q.quests.reduce((a, b) => a + b.list.length, 0);
  const qNav = cur => `<nav class="catnav"><div><span class="lbl">クエスト</span>${Q.quests.map(a => a.key === cur ? `<b>${esc(a.ja)}</b>` : `<a href="${BASE}quest/${a.key}.html">${esc(a.ja)}</a>`).join('')}<a href="${BASE}mission/index.html">ミッション</a></div></nav>`;
  const credit = `<p class="note">一覧の元データ：有志が公開しているデータ（GPL-3.0・<a href="${BASE}data/quests.json">このサイトで使った形のデータ</a>）。名前・場所・依頼する人・条件・報酬だけを使い、手順の文は載せていません。手順や細かい条件は、各クエストの「用語辞典」から見てください。</p>`;
  for (const a of Q.quests) {
    const byZone = new Map();
    for (const q of a.list) { const z = zoneTxt(q.zone) || 'そのほか'; if (!byZone.has(z)) byZone.set(z, []); byZone.get(z).push(q); }
    write(`quest/${a.key}.html`, head(`${a.ja}のクエスト一覧（${a.list.length}件）｜チェックリスト｜${SITE_SHORT}`,
      `FF11 ${a.ja}のクエスト${a.list.length}件を、場所ごとに一覧。依頼する人・条件・報酬つきで、やった物にチェックを付けて、やり忘れを確認できます。`, `${ORIGIN}/quest/${a.key}.html`)
      + `<main class="wide">${crumb(`<a href="${BASE}quest/index.html">クエスト</a>`, esc(a.ja))}<h1>${esc(a.ja)}のクエスト <span class="cnt">${a.list.length}件</span></h1>
<p class="lead">やったクエストにチェックを付けると、「まだの物だけ」で残りが分かります（チェックはこのブラウザに残ります）。</p>${qNav(a.key)}
<nav class="bands">${[...byZone].map(([z, l]) => `<a href="#${encodeURIComponent(z)}" data-band="${esc(z)}">${esc(z)}<span>${l.length}</span></a>`).join('')}</nav>
<div class="tbl quests" data-ck="qs"><div class="r h"><div class="c-n">クエスト</div><div class="c-loc">場所</div><div class="c-npc">依頼する人</div><div class="c-req">条件・前提</div><div class="c-rw">報酬</div><div class="c-x">用語辞典</div></div>
${[...byZone].map(([z, l]) => `<div class="band" id="${esc(z)}" data-band="${esc(z)}">${esc(z)} <span>${l.length}件</span></div>` + l.map(q => `<div class="r" data-id="${esc(a.key + ':' + q.en)}"><div class="c-n"><b>${esc(q.ja || q.en)}</b>${q.rep ? ' <span class="tag rep">くり返し可</span>' : ''}<small>${esc(q.en)}</small></div><div class="c-loc">${locTxt(q.zone, q.loc)}</div><div class="c-npc">${esc(q.npc)}</div><div class="c-req">${q.req ? reqTxt(q.req) : ''}${q.prereq ? `<div class="pre">前提：${prereqTxt(q.prereq)}</div>` : ''}${!q.req && !q.prereq ? '<span class="nl">—</span>' : ''}</div><div class="c-rw">${q.reward ? rewardTxt(q.reward) : '<span class="nl">—</span>'}</div><div class="c-x"><a href="${ffo(q.ja || q.en)}" rel="noopener" target="_blank">見る</a></div></div>`).join('')).join('')}</div>
${credit}</main><script src="${BASE}list.js?v=${VER}"></script>` + foot);
  }

  // ── ミッション（ストーリーごと・チェック欄）
  const mTotal = Q.missions.reduce((a, b) => a + b.list.length, 0);
  const mNav = cur => `<nav class="catnav"><div><span class="lbl">ミッション</span>${Q.missions.map(m => m.key === cur ? `<b>${esc(m.ja)}</b>` : `<a href="${BASE}mission/${m.key}.html">${esc(m.ja)}</a>`).join('')}</div></nav>`;
  for (const m of Q.missions) {
    write(`mission/${m.key}.html`, head(`${m.ja}のミッション一覧（${m.list.length}件）｜チェックリスト｜${SITE_SHORT}`,
      `FF11「${m.ja}」のミッション${m.list.length}件を順番に一覧。進めた物にチェックを付けて、どこまで進んだか確認できます。`, `${ORIGIN}/mission/${m.key}.html`)
      + `<main class="wide">${crumb(`<a href="${BASE}mission/index.html">ミッション</a>`, esc(m.ja))}<h1>${esc(m.ja)} <span class="cnt">${m.list.length}件</span></h1>${mNav(m.key)}
<div class="tbl missions" data-ck="ms"><div class="r h"><div class="c-no">番号</div><div class="c-n">ミッション</div><div class="c-x">用語辞典</div></div>
${m.list.map((x, i) => `<div class="r" data-id="${esc(m.key + ':' + x.no)}"><div class="c-no">${i + 1}</div><div class="c-n"><b>${esc(x.ja || x.en)}</b><small>${esc(x.en)}</small></div><div class="c-x"><a href="${ffo(x.ja || x.en)}" rel="noopener" target="_blank">見る</a></div></div>`).join('')}</div>
${credit}</main><script src="${BASE}list.js?v=${VER}"></script>` + foot);
  }
  write('mission/index.html', head(`ミッションの一覧（${mTotal}件）｜ストーリーごとのチェックリスト｜${SITE_SHORT}`, `FF11のミッション${mTotal}件をストーリーごとに。`, `${ORIGIN}/mission/index.html`)
    + `<main class="wide">${crumb('ミッション')}<h1>ミッション <span class="cnt">${mTotal}件</span></h1><div class="tiles">${Q.missions.map(m => tile(`${BASE}mission/${m.key}.html`, m.ja, m.list.length, m.ja[0], 'ms')).join('')}</div>${credit}</main>` + foot);
  write('quest/index.html', head(`クエストの一覧（${qTotal}件）｜エリアごとのチェックリスト｜${SITE_SHORT}`, `FF11のクエスト${qTotal}件をエリアごとに。やり忘れの確認に。`, `${ORIGIN}/quest/index.html`)
    + `<main class="wide">${crumb('クエスト')}<h1>クエスト <span class="cnt">${qTotal}件</span></h1><div class="tiles">${Q.quests.map(a => tile(`${BASE}quest/${a.key}.html`, a.ja, a.list.length, a.ja[0], 'qs')).join('')}${tile(`${BASE}mission/index.html`, 'ミッション', mTotal, '任', 'ms')}</div>${credit}</main>` + foot);

  const ckNote = '<p class="note" style="margin:0 0 10px">やった物にチェックを付けて、やり忘れ・取り忘れを確認できます（チェックはこのブラウザに残ります）。</p>';
  const home = `<section class="box" id="mission"><h2>ミッション（${mTotal}件・チェックリスト）<a class="all" href="${BASE}mission/index.html">一覧へ</a></h2>
${ckNote}<div class="tiles">${Q.missions.map(m => tile(`${BASE}mission/${m.key}.html`, m.ja, m.list.length, m.ja[0], 'ms')).join('')}</div></section>
<section class="box" id="quest"><h2>クエスト（${qTotal}件・チェックリスト）<a class="all" href="${BASE}quest/index.html">一覧へ</a></h2>
${ckNote}<div class="tiles">${Q.quests.map(a => tile(`${BASE}quest/${a.key}.html`, a.ja, a.list.length, a.ja[0], 'qs')).join('')}</div></section>`;
  return { home, urls, counts: { quests: qTotal, missions: mTotal } };
}
