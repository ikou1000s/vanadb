// 名前で探す：全ページ上の検索窓と find.html の元になる索引（find.json）を作る
// build.mjs の最後で writeFind(ctx) を呼ぶ。出来上がった site/item・site/spell のページの見出しから読むので、ほかの作り方に依存しない
import fs from 'node:fs';
import path from 'node:path';

export function writeFind(ctx) {
  const { SITE, ORIGIN, head, foot, SITE_SHORT, BASE, VER } = ctx;
  const kinds = [], kindIdx = new Map();
  const kindOf = k => { if (!kindIdx.has(k)) { kindIdx.set(k, kinds.length); kinds.push(k); } return kindIdx.get(k); };
  const rows = [];
  const pick = (t, re) => { const m = t.match(re); return m ? m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : ''; };
  // [t: 0=装備・アイテム（item/）, 1=魔法（spell/）, id, 日本語名, 英名, 分類の番号, Lv/IL の短い印]
  for (const [dir, t] of [['item', 0], ['spell', 1]]) {
    const d = path.join(SITE, dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith('.html')) continue;
      const html = fs.readFileSync(path.join(d, f), 'utf8');
      const i = html.indexOf('<section class="ihead">');
      const part = i >= 0 ? html.slice(i, i + 1500) : '';
      const ja = pick(part, /<h1>([^<]*)<\/h1>/);
      if (!ja) continue;
      const en = pick(part, /<\/h1><small>([^<]*)<\/small>/);
      const cat = pick(part, /class="bd cat"[^>]*>([^<]*)</) || (t ? '魔法' : 'アイテム');
      const il = pick(part, /<span class="bd il">(IL\d+)<\/span>/);
      const lv = pick(part, /<span class="bd">(Lv\d+)<\/span>/);
      rows.push([t, +f.slice(0, -5), ja, en, kindOf(cat), il || lv]);
    }
  }
  rows.sort((a, b) => a[2].localeCompare(b[2], 'ja') || a[1] - b[1]);
  fs.writeFileSync(path.join(SITE, 'find.json'), JSON.stringify({ kinds, rows }));
  fs.copyFileSync(path.join(ctx.ROOT, 'src', 'find.js'), path.join(SITE, 'find.js'));

  fs.writeFileSync(path.join(SITE, 'find.html'), head(`名前で探す（装備・アイテム・魔法）｜${SITE_SHORT}`,
    `FF11の装備・アイテム・魔法${rows.length.toLocaleString()}件を、名前の一部（日本語・英語・ひらがな）で探せます。`, `${ORIGIN}/find.html`)
    + `<main class="wide finder"><p class="crumb"><a href="${BASE}">トップ</a> › 名前で探す</p><h1>名前で探す</h1>
<p class="lead">装備・アイテム・魔法 ${rows.length.toLocaleString()}件から、名前の一部で探します。ひらがな・カタカナ・英語どれでも。空白で区切ると、すべてを含む物だけ出ます（例：「ニャメ 胴」）。</p>
<form class="findbig" action="${BASE}find.html" method="get" role="search"><input id="fq" name="q" type="search" placeholder="例：モグスーツ、ニャメ、ケアル、fire crystal" autocomplete="off" autofocus><button type="submit">探す</button></form>
<div id="fkinds" class="chips"></div>
<p id="fcount" class="count"></p>
<div id="fres" class="tbl find"></div>
<noscript><p>名前で探すにはJavaScriptが要ります。</p></noscript>
</main>` + foot);
  return { count: rows.length, urls: [`${ORIGIN}/find.html`] };
}
