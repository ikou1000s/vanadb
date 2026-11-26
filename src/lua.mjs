// Windower Resources の .lua（1行1件の表）を読む小さな読み取り器
import fs from 'node:fs';

function parseValue(s, i) {
  if (s[i] === '"') {
    let out = '';
    i++;
    while (i < s.length && s[i] !== '"') {
      if (s[i] === '\\') {
        const c = s[i + 1];
        out += c === 'n' ? '\n' : c === 't' ? '\t' : c;
        i += 2;
      } else out += s[i++];
    }
    return [out, i + 1];
  }
  if (s[i] === '{') {
    // 入れ子の表（まれ）。中身は文字列のまま返す
    let depth = 0, j = i;
    for (; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}') { depth--; if (depth === 0) break; }
    }
    return [s.slice(i, j + 1), j + 1];
  }
  let j = i;
  while (j < s.length && s[j] !== ',' && s[j] !== '}') j++;
  const raw = s.slice(i, j).trim();
  const num = Number(raw);
  return [raw === 'true' ? true : raw === 'false' ? false : Number.isNaN(num) ? raw : num, j];
}

export function parseRecord(body) {
  const o = {};
  let i = 0;
  while (i < body.length) {
    while (body[i] === ',' || body[i] === ' ') i++;
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(body.slice(i, i + 64));
    if (!m) break;
    i += m[0].length;
    const [v, ni] = parseValue(body, i);
    o[m[1]] = v;
    i = ni;
  }
  return o;
}

export function readLua(file) {
  const text = fs.readFileSync(file, 'utf8');
  const out = new Map();
  for (const line of text.split('\n')) {
    const m = /^\s*\[(\d+)\] = \{(.*)\},?\s*$/.exec(line);
    if (!m) continue;
    out.set(Number(m[1]), parseRecord(m[2]));
  }
  return out;
}
