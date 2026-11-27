// フェイスアセンド（2026/11/10 のバージョンアップ〜：前からあるフェイスポイントの強化が広がった物）→ trust-ascend.html
// 素材のセレスタイトを、ゲーム内の説明文のまま並べる。仕組みの細かい数字は載せない（使ってよい公開データが無い）。
import fs from 'node:fs';
import path from 'node:path';

export function writeAscend(ctx) {
  const { items, desc, SITE, head, foot, esc, BASE, ORIGIN, SITE_SHORT, hasPage, trustCount } = ctx;
  const cel = [...items.values()].filter(x => /セレスタイト$/.test(x.ja || '')).sort((a, b) => a.id - b.id);
  const kind = x => (x.category === 'Maze' ? 'だいじなもの扱いの物' : 'アイテム');
  const d = x => ((desc.get(x.id) || {}).ja || '').replace(/\s*\n\s*/g, '');
  const name = x => (hasPage(x.id) ? `<a href="${BASE}item/${x.id}.html">${esc(x.ja)}</a>` : `<b>${esc(x.ja)}</b>`);
  const rel = 'trust-ascend.html';
  const html = head(`フェイスアセンド｜セレスタイトの一覧｜${SITE_SHORT}`, 'FF11のフェイスアセンド（2026年11月のバージョンアップで、フェイスポイントの強化が広がった物）で使うセレスタイトの一覧と、それぞれの効果（ゲーム内の表記）。', `${ORIGIN}/${rel}`)
    + `<main class="wide"><p class="crumb"><a href="${BASE}">トップ</a> › フェイスアセンド</p><h1>フェイスアセンド <span class="cnt">セレスタイト${cel.length}件</span></h1>
<p class="lead">2026年11月10日のバージョンアップで、前からあるフェイスポイントの強化が広がりました（フェイスアセンド）。強化に使うのが下のセレスタイトです。効果の文はゲーム内の表記のままです。細かい仕組みや上限は、公式のバージョンアップ情報を見てください。</p>
<div class="tbl simple2"><div class="r h"><div class="c-n">セレスタイト</div><div class="c-fx">効果（ゲーム内の表記）</div></div>${cel.map(x => `<div class="r" data-id="${x.id}"><div class="c-n">${name(x)}<small>${esc(x.en || '')}</small></div><div class="c-fx">${esc(d(x))}</div></div>`).join('')}</div>
<h2>関連</h2><p class="same"><a href="${BASE}magic/trust.html">フェイスの一覧（戦闘タイプ・ジョブ${trustCount ? `・${trustCount}体` : ''}）</a></p>
</main>` + foot;
  fs.writeFileSync(path.join(SITE, rel), html);
  return { urls: [`${ORIGIN}/${rel}`], count: cel.length };
}
