// 釣り：魚ごとの必要スキル・大きさ・釣れる場所・よく掛かるエサ（LandSandBoat・GPLv3）
import fs from 'node:fs';
import path from 'node:path';
import { readLua } from './lua.mjs';

export function writeFishing(ctx) {
  const { items, head, foot, esc, BASE, ORIGIN, SITE, DATA, SITE_SHORT, VER, tile, lsb, hasPage } = ctx;
  if (!lsb || !lsb.fish || !lsb.fish.length) return { home: '', urls: [], count: 0 };
  const zones = fs.existsSync(path.join(DATA, 'zones.lua')) ? readLua(path.join(DATA, 'zones.lua')) : new Map();
  const iname = id => (items.get(id) || {}).ja || `#${id}`;
  const ilink = id => (hasPage(id) ? `<a href="${BASE}item/${id}.html">${esc(iname(id))}</a>` : esc(iname(id)));
  const zname = z => (zones.get(z) || {}).ja || `#${z}`;
  const fish = lsb.fish.filter(f => items.get(f.id) && items.get(f.id).category !== 'Gil' && f.id < 65535).sort((a, b) => a.skill - b.skill || iname(a.id).localeCompare(iname(b.id), 'ja'));
  const band = s => s <= 10 ? '素人（〜10）' : s <= 20 ? '見習（11〜20）' : s <= 30 ? '徒弟（21〜30）' : s <= 40 ? '下級職人（31〜40）' : s <= 50 ? '名取（41〜50）' : s <= 60 ? '目録（51〜60）' : s <= 70 ? '印可（61〜70）' : s <= 80 ? '高弟（71〜80）' : s <= 90 ? '皆伝（81〜90）' : s <= 100 ? '師範（91〜100）' : '高級（101〜）';
  const groups = new Map(); for (const f of fish) { const g = band(f.skill); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(f); }
  const whereTxt = f => {
    const byZone = new Map(); for (const [z, a] of f.where) { if (!byZone.has(z)) byZone.set(z, new Set()); if (a && a !== 'Whole Zone') byZone.get(z).add(a); }
    const zl = [...byZone];
    if (!zl.length) return '<span class="nl">—</span>';
    return zl.slice(0, 8).map(([z, as]) => `${esc(zname(z))}${as.size ? `<small class="en">（${[...as].slice(0, 3).map(esc).join('・')}${as.size > 3 ? '…' : ''}）</small>` : ''}`).join('、') + (zl.length > 8 ? `<small class="nl">　ほか${zl.length - 8}か所</small>` : '');
  };
  const rel = 'fishing.html';
  const html = head(`釣りの一覧（${fish.length}種）｜必要スキル・釣れる場所・エサ｜${SITE_SHORT}`,
    `FF11の釣れる魚${fish.length}種を、必要スキルの低い順に。大きさ（小物・大物）、釣れるエリア、よく掛かるエサつき。釣った魚にチェックを付けられます。`, `${ORIGIN}/${rel}`)
    + `<main class="wide"><p class="crumb"><a href="${BASE}">トップ</a> › 釣り</p><h1>釣り <span class="cnt">${fish.length}種</span></h1>
<p class="lead">魚を必要スキルの低い順に並べています。エサは、よく掛かる（相性の良い）物を上から出しています。</p>
<div class="row"><label>名前</label><input type="search" class="tfilter" data-for="fs" placeholder="魚・エリア・エサの名前で絞る"></div>
<nav class="bands">${[...groups].map(([g, l]) => `<a href="#${encodeURIComponent(g)}" data-band="${esc(g)}">${esc(g)}<span>${l.length}</span></a>`).join('')}</nav>
<div class="tbl fishing" id="fs" data-ck="fs"><div class="r h"><div class="c-lv">スキル</div><div class="c-n">魚</div><div class="c-sz">大きさ</div><div class="c-fx">釣れる場所</div><div class="c-bt">よく掛かるエサ</div></div>
${[...groups].map(([g, l]) => `<div class="band" id="${esc(g)}" data-band="${esc(g)}">${esc(g)} <span>${l.length}件</span></div>` + l.map(f => `<div class="r" data-id="${f.id}"><div class="c-lv">${f.skill}</div><div class="c-n">${ilink(f.id)}<small>${esc((items.get(f.id) || {}).en || '')}</small></div><div class="c-sz">${f.size ? '<span class="tag big">大物</span>' : '小物'}</div><div class="c-fx">${whereTxt(f)}</div><div class="c-bt">${f.baits.slice(0, 5).map(([b]) => ilink(b)).join('、') || '<span class="nl">—</span>'}</div></div>`).join('')).join('')}</div>
<h2>釣り竿</h2><div class="tbl simple3"><div class="r h"><div class="c-n">竿</div><div class="c-fx">英語名</div></div>${lsb.rods.filter(r => items.get(r.id)).map(r => `<div class="r"><div class="c-n">${ilink(r.id)}</div><div class="c-fx">${esc(items.get(r.id).en)}</div></div>`).join('')}</div>
<p class="note">元データ：有志のサーバー再現データ LandSandBoat（GPLv3）。必要スキル・場所・エサの相性は参考です。</p></main><script src="${BASE}list.js?v=${VER}"></script>` + foot;
  fs.writeFileSync(path.join(SITE, rel), html);
  const home = tile(`${BASE}fishing.html`, '釣り', fish.length, '釣', 'ex');
  return { home, urls: [`${ORIGIN}/${rel}`], count: fish.length };
}
