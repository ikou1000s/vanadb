// 合成レシピの一覧（LandSandBoat の synth_recipes・GPLv3。data/synth.json）
// 主なスキル（いちばん高いスキル）ごとに、スキルの低い順。素材・結果はアイテムのページへ
import fs from 'node:fs';
import path from 'node:path';

const CRAFTS = [['木工', 'wood', '木'], ['鍛冶', 'smith', '鍛'], ['彫金', 'gold', '彫'], ['裁縫', 'cloth', '裁'], ['革細工', 'leather', '革'], ['骨細工', 'bone', '骨'], ['錬金術', 'alchemy', '錬'], ['調理', 'cook', '調']];

export function writeSynth(ctx) {
  const { items, head, foot, esc, BASE, ORIGIN, SITE, DATA, SITE_SHORT, VER, tile, hasPage } = ctx;
  const file = path.join(DATA, 'synth.json');
  if (!fs.existsSync(file)) return { home: '', urls: [], count: 0 };
  const synth = JSON.parse(fs.readFileSync(file, 'utf8'));
  const urls = [];
  const iname = id => (items.get(id) || {}).ja || `#${id}`;
  const ilink = id => (hasPage(id) ? `<a href="${BASE}item/${id}.html">${esc(iname(id))}</a>` : esc(iname(id)));
  const byCraft = new Map(CRAFTS.map(([ja]) => [ja, []]));
  for (const r of synth) {
    const main = Object.entries(r.skills).sort((a, b) => b[1] - a[1])[0];
    if (!main || !items.get(r.result)) continue;
    byCraft.get(main[0]).push({ r, lv: main[1] });
  }
  const nav = cur => `<nav class="catnav"><div><span class="lbl">合成</span>${CRAFTS.map(([ja, k]) => k === cur ? `<b>${ja}</b>` : `<a href="${BASE}synth/${k}.html">${ja}</a>`).join('')}</div></nav>`;
  const band = lv => lv <= 10 ? '素人（〜10）' : lv <= 20 ? '見習（11〜20）' : lv <= 30 ? '徒弟（21〜30）' : lv <= 40 ? '下級職人（31〜40）' : lv <= 50 ? '名取（41〜50）' : lv <= 60 ? '目録（51〜60）' : lv <= 70 ? '印可（61〜70）' : lv <= 80 ? '高弟（71〜80）' : lv <= 90 ? '皆伝（81〜90）' : lv <= 100 ? '師範（91〜100）' : '高級（101〜）';
  for (const [ja, key] of CRAFTS) {
    const list = byCraft.get(ja).sort((a, b) => a.lv - b.lv || iname(a.r.result).localeCompare(iname(b.r.result), 'ja'));
    const groups = new Map();
    for (const x of list) { const g = band(x.lv); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(x); }
    const rel = `synth/${key}.html`;
    const html = head(`${ja}のレシピ一覧（${list.length}件）｜スキル順・素材つき｜${SITE_SHORT}`,
      `FF11の${ja}のレシピ${list.length}件を、スキルの低い順に。クリスタル・素材・HQ・ほかに要るスキルつき。作った物にチェックを付けられます。`, `${ORIGIN}/${rel}`)
      + `<main class="wide"><p class="crumb"><a href="${BASE}">トップ</a> › 合成 › ${ja}</p><h1>${ja}のレシピ <span class="cnt">${list.length}件</span></h1>
<p class="lead">主なスキル（いちばん高いスキル）が${ja}のレシピです。ほかのスキルも要る物は「ほか」に出しています。</p>${nav(key)}
<nav class="bands">${[...groups].map(([g, l]) => `<a href="#${encodeURIComponent(g)}" data-band="${esc(g)}">${esc(g)}<span>${l.length}</span></a>`).join('')}</nav>
<div class="tbl synth" data-ck="sy"><div class="r h"><div class="c-lv">スキル</div><div class="c-n">できる物（NQ）</div><div class="c-hq">HQ</div><div class="c-cr">クリスタル</div><div class="c-fx">素材</div><div class="c-ot">ほか</div></div>
${[...groups].map(([g, l]) => `<div class="band" id="${esc(g)}" data-band="${esc(g)}">${esc(g)} <span>${l.length}件</span></div>` + l.map(({ r, lv }) => `<div class="r" data-id="${esc(r.result + ':' + r.ings.map(i => i.join('x')).join('-'))}"><div class="c-lv">${lv}</div><div class="c-n">${ilink(r.result)}</div><div class="c-hq">${[...new Set(r.hq.filter(Boolean))].filter(h => h !== r.result).map(ilink).join('<br>') || '<span class="nl">—</span>'}</div><div class="c-cr">${esc(iname(r.crystal).replace('のクリスタル', ''))}</div><div class="c-fx">${r.ings.map(([i, n]) => `${ilink(i)}${n > 1 ? `×${n}` : ''}`).join('、')}</div><div class="c-ot">${Object.entries(r.skills).filter(([k]) => k !== ja).map(([k, v]) => `${esc(k)}${v}`).join(' ') || ''}</div></div>`).join('')).join('')}</div>
<p class="note">レシピの元データ：有志のサーバー再現データ LandSandBoat（GPLv3）。数値は参考です。</p></main><script src="${BASE}list.js?v=${VER}"></script>` + foot;
    const f = path.join(SITE, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); urls.push(`${ORIGIN}/${rel}`);
  }
  const count = [...byCraft.values()].reduce((a, b) => a + b.length, 0);
  const home = `<section class="box" id="synth"><h2>合成レシピ（${count.toLocaleString()}件）</h2><div class="tiles">${CRAFTS.map(([ja, k, ic]) => tile(`${BASE}synth/${k}.html`, ja, byCraft.get(ja).length, ic, 'sy')).join('')}</div></section>`;
  return { home, urls, count };
}
