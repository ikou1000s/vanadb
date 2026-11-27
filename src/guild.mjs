// ギルドの納品（ギルドポイント）：ギルド・ランクごとに、納品できるアイテムとポイント（LandSandBoat・GPLv3）
import fs from 'node:fs';
import path from 'node:path';

const GUILDS = ['釣り', '木工', '鍛冶', '彫金', '裁縫', '革細工', '骨細工', '錬金術', '調理'];
const RANKS = ['素人', '見習', '徒弟', '下級職人', '名取', '目録', '印可', '高弟', '皆伝', '師範', '高級'];

export function writeGuild(ctx) {
  const { items, head, foot, esc, BASE, ORIGIN, SITE, SITE_SHORT, VER, tile, lsb, hasPage } = ctx;
  if (!lsb || !lsb.guild || !lsb.guild.length) return { home: '', urls: [], count: 0 };
  const iname = id => (items.get(id) || {}).ja || `#${id}`;
  const ilink = id => (hasPage(id) ? `<a href="${BASE}item/${id}.html">${esc(iname(id))}</a>` : esc(iname(id)));
  // ギルド→ランク→アイテム→{pts,max,patterns}
  const tree = new Map();
  for (const [g, item, rank, pts, max, pat] of lsb.guild) {
    if (!items.get(item)) continue;
    const key = `${g}:${rank}:${item}`;
    if (!tree.has(key)) tree.set(key, { g, rank, item, pts, max, pats: new Set() });
    tree.get(key).pats.add(pat);
  }
  const rows = [...tree.values()];
  const html = head(`ギルドの納品（ギルドポイント）一覧｜ギルド・ランクごと｜${SITE_SHORT}`,
    'FF11のギルドポイントの納品アイテムを、ギルド（釣り・木工・鍛冶・彫金・裁縫・革細工・骨細工・錬金術・調理）とランクごとに、ポイントと上限つきで。', `${ORIGIN}/guild.html`)
    + `<main class="wide"><p class="crumb"><a href="${BASE}">トップ</a> › ギルドの納品</p><h1>ギルドの納品（ギルドポイント） <span class="cnt">${rows.length}件</span></h1>
<p class="lead">ギルドとランクごとに、納品できるアイテムと、1個あたりのポイント・1日の上限を並べています。納品できる品は日替わりで、「型」はその入れ替わりの番号です（参考）。</p>
<nav class="catnav"><div><span class="lbl">ギルド</span>${GUILDS.map((ja, g) => `<a href="#g${g}">${ja}</a>`).join('')}</div></nav>
${GUILDS.map((ja, g) => {
  const mine = rows.filter(r => r.g === g).sort((a, b) => a.rank - b.rank || iname(a.item).localeCompare(iname(b.item), 'ja'));
  if (!mine.length) return '';
  return `<h2 id="g${g}">${ja}ギルド <span class="cnt">${mine.length}件</span></h2><div class="tbl guild"><div class="r h"><div class="c-rk">ランク</div><div class="c-n">納品アイテム</div><div class="c-m">ポイント</div><div class="c-m">1日の上限</div><div class="c-pt">型</div></div>${mine.map(r => `<div class="r"><div class="c-rk">${esc(RANKS[r.rank] || r.rank)}</div><div class="c-n">${ilink(r.item)}</div><div class="c-m">${r.pts}</div><div class="c-m">${r.max.toLocaleString()}</div><div class="c-pt">${[...r.pats].sort((a, b) => a - b).map(p => p + 1).join('・')}</div></div>`).join('')}</div>`;
}).join('')}
<p class="note">元データ：有志が公開しているデータ。ポイント・上限は参考です。</p></main>` + foot;
  fs.writeFileSync(path.join(SITE, 'guild.html'), html);
  return { home: tile(`${BASE}guild.html`, 'ギルドの納品', rows.length, 'ギ', 'ex'), urls: [`${ORIGIN}/guild.html`], count: rows.length };
}
