// ブログ（いこう！の実験＆実用メモ帳）の装備の逆引き（記事173の元 fc2-updater/gear_index.html）から
// 「装備名 → 使っているジョブ・セット・記事のリンク」を作る
import fs from 'node:fs';
const BLOG = 'https://ff11ikou.blog.fc2.com/';
function arr(t, v) {
  const i = t.indexOf(v + '=[');
  if (i < 0) throw new Error(v + ' が見つからない');
  let d = 0, j = i + v.length + 1;
  for (; j < t.length; j++) { if (t[j] === '[') d++; else if (t[j] === ']') { d--; if (!d) break; } }
  return JSON.parse(t.slice(i + v.length + 1, j + 1));
}
export function loadBlogUses(file) {
  if (!fs.existsSync(file)) return new Map();
  const t = fs.readFileSync(file, 'utf8');
  const J = arr(t, 'J'), S = arr(t, 'S'), P = arr(t, 'P'), D = arr(t, 'D');
  const map = new Map();
  for (const [name, codes] of D) {
    const uses = [];
    for (const x of codes) {
      const c = Array.isArray(x) ? x[0] : x;
      const [ji, setName, anchor] = S[Math.floor(c / 100)];
      const [job, art] = J[ji];
      const key = job + '#' + anchor;
      let u = uses.find(z => z.key === key);
      if (!u) uses.push(u = { key, job: job.replace('（歌）', '（歌）'), set: setName, url: `${BLOG}blog-entry-${art}.html#${anchor}`, parts: [] });
      const p = P[c % 100];
      if (!u.parts.includes(p)) u.parts.push(p);
    }
    map.set(name, uses);
  }
  return map;
}
