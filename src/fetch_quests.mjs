// クエスト・ミッションの一覧の元データ（Journal-FFXI-JP・GPL-3.0）を取り込み、data/quests.json にする
// 使うのは事実だけ（名前・場所・NPC・条件・報酬・くり返し）。手順の文章は使わない。
// 使い方: node src/fetch_quests.mjs（fetch.mjs から呼ばれる）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// GitHub の API は鍵なしだと1時間60回まで。Actions では GITHUB_TOKEN を付けて回数制限に当たらないように
const GH = { 'User-Agent': 'ff11-db', ...(process.env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {}) };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const REPO = 'Tsukasa-17/Journal-FFXI-JP';
const RAW = `https://raw.githubusercontent.com/${REPO}/HEAD/Journal/data/`;
const QUEST_AREAS = [['sandoria', 'サンドリア'], ['bastok', 'バストゥーク'], ['windurst', 'ウィンダス'], ['jeuno', 'ジュノ'], ['other', 'その他の地域'], ['outlands', '辺境'], ['whitegate', 'アトルガン'], ['crystal', 'クリスタル大戦']];
const MISSION_LINES = [['sandy', 'サンドリアミッション'], ['bastok', 'バストゥークミッション'], ['windurst', 'ウィンダスミッション'], ['roz', 'ジラートの幻影'], ['cop', 'プロマシアの呪縛'], ['toau', 'アトルガンの秘宝'], ['wotg', 'アルタナの神兵'],
  ['acp', '石の見る夢'], ['mkd', '戦慄！モグ祭りの夜'], ['asa', 'シャントット帝国の陰謀'], ['abyssea', 'アビセア'], ['adoulin', 'アドゥリンの魔境'], ['rov', 'ヴァナ・ディールの星唄'], ['tvr', '蝕世のエンブリオ'], ['assault', 'アサルト'], ['campaign', 'カンパニエ']];

// 通信が一時的に切れる（ECONNRESET）ことがあるので、3回まで待って取り直す（2026-11-28）
const retry = async g => { for (let i = 0; ; i++) { try { return await g(); } catch (e) { if (i >= 3) throw e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); } } };
const get = async f => { const r = await retry(() => fetch(RAW + f)); if (!r.ok) throw new Error(`${f}: ${r.status}`); return r.text(); };
const unq = s => s.replace(/\\(['"\\])/g, '$1');
const tr = new Map();
for (const m of (await get('translations_ja.lua')).matchAll(/\[\s*"((?:[^"\\]|\\.)*)"\s*\]\s*=\s*"((?:[^"\\]|\\.)*)"/g)) tr.set(unq(m[1]), unq(m[2]));

const parseQuests = t => {
  const out = [];
  for (const m of t.matchAll(/\{\s*\n\s*id\s*=\s*'([^']+)',([\s\S]*?)\n\s*\},?/g)) {
    const o = { id: m[1] };
    for (const f of m[2].matchAll(/\b(\w+)\s*=\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|(true|false|-?\d+))/g)) o[f[1]] = f[2] != null ? unq(f[2]) : f[3] != null ? unq(f[3]) : f[4] === 'true' ? true : f[4] === 'false' ? false : Number(f[4]);
    if (o.name) out.push(o);
  }
  return out;
};
const quests = [];
for (const [key, ja] of QUEST_AREAS) {
  const list = parseQuests(await get(`quests/${key}.lua`)).filter(q => !/NOT IMPLEMENTED/i.test(q.req || ''))
    .map(q => ({ en: q.name, ja: tr.get(q.name) || '', zone: q.zone || '', loc: q.loc || '', npc: q.npc || '', req: q.req || '', prereq: q.prereq || '', reward: q.reward || '', rep: !!q.repeatable }));
  quests.push({ key, ja, list });
}
const missions = [];
for (const [key, ja] of MISSION_LINES) {
  const t = await get(`missions/${key}.lua`).catch(() => '');
  const blk = /M\.MISSIONS\s*=\s*\{([\s\S]*?)\n\}/.exec(t);
  if (!blk) continue;
  const list = [...blk[1].matchAll(/\[(\d+)\]\s*=\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)]
    .map(m => { const en = unq(m[2] ?? m[3]); return { no: Number(m[1]), en, ja: tr.get(en) || '' }; }).filter(x => x.no > 0);
  if (list.length) missions.push({ key, ja, list });
}
const commit = await fetch(`https://api.github.com/repos/${REPO}/commits?per_page=1`, { headers: GH }).then(r => r.json()).then(c => c[0] && c[0].sha).catch(() => '');
fs.writeFileSync(path.join(DATA, 'quests.json'), JSON.stringify({ source: `https://github.com/${REPO}`, commit, license: 'GPL-3.0', quests, missions }));
console.log('クエスト', quests.map(a => `${a.ja}${a.list.length}`).join(' '), '／ミッション', missions.map(a => `${a.ja}${a.list.length}`).join(' '));
console.log('日本語名なし：クエスト', quests.flatMap(a => a.list).filter(q => !q.ja).length, 'ミッション', missions.flatMap(a => a.list).filter(q => !q.ja).length);
