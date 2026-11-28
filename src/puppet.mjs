// オートマトンの部品（data/puppet.json・src/fetch_puppet.mjs）のアイテムのページの節
import fs from 'node:fs';
import path from 'node:path';

export const PUP_EL = ['火', '氷', '風', '土', '雷', '水', '光', '闇'];
export const PUP_SLOT = ['', 'ヘッド', 'フレーム', 'アタッチメント'];

export function loadPuppet(DATA) {
  const f = path.join(DATA, 'puppet.json');
  const by = new Map();
  if (!fs.existsSync(f)) return { by, html: () => '' };
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const [id, slot, ...el] of d.list || []) by.set(id, { slot, el });
  const html = (id, link = '') => {
    const v = by.get(id); if (!v) return '';
    const used = v.el.map((n, i) => [PUP_EL[i], n]).filter(([, n]) => n);
    if (v.slot === 3) {
      if (!used.length) return '';
      return `<h2>オートマトンに付けると</h2><ul class="acq"><li>アタッチメント・属性 <b>${used.map(([e, n]) => `${e}（容量 ${n}）`).join('・')}</b></li>`
        + `<li>${used.map(([e]) => e).join('・')}のマニューバを使うと、このアタッチメントの効果が強まります</li></ul>`
        + `<p class="note">付けるには、ヘッドとフレームで決まるその属性の容量に、空きが ${used.map(([, n]) => n).join('・')} 以上要ります。${link}</p>`;
    }
    if (!used.length) return '';
    return `<h2>オートマトンの${PUP_SLOT[v.slot]}の属性の容量</h2><ul class="stats">${used.map(([e, n]) => `<li>${e} <b>${n}</b></li>`).join('')}</ul>`
      + `<p class="note">ヘッドとフレームの容量で、付けられるアタッチメントの属性と数が決まります（数値はLandSandBoatの値・参考）。${link}</p>`;
  };
  return { by, html };
}
