// お店で買える物（LandSandBoat scripts/zones/*/npcs/*.lua の stock・GPLv3）→ data/shops.json
// 店のNPCのファイルの一覧は src/shop_npcs.json（GitHub のコード検索「xi.shop」で集めた物。2026-11-28）
// 1行は { アイテム（番号か xi.item.名前）, 値段, 国の店なら順位 }。国の店（xi.shop.nation）は3つ目が「国の順位が◯位以内の時に買える」
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const RAW = 'https://raw.githubusercontent.com/LandSandBoat/server/base/';
// 通信が一時的に切れる（ECONNRESET）ことがあるので、3回まで待って取り直す
const get = async f => { for (let i = 0; ; i++) { try { const r = await fetch(RAW + f); return r.ok ? await r.text() : ''; } catch (e) { if (i >= 3) throw e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); } } };

const files = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'shop_npcs.json'), 'utf8'));
// xi.item.名前 → アイテム番号
const idByName = new Map();
for (const m of (await get('scripts/enum/item.lua')).matchAll(/^\s*([A-Z0-9_]+)\s*=\s*(\d+)\s*,/gm)) idByName.set(m[1], Number(m[2]));
// エリアのフォルダ名 → エリア番号
const zoneIdByDir = new Map();
for (const m of (await get('sql/zone_settings.sql')).matchAll(/^INSERT INTO `zone_settings` VALUES \((\d+),'[^']*',\d+,'([^']+)'\)/gm)) zoneIdByDir.set(m[2].toLowerCase().replace(/[^a-z0-9]/g, ''), Number(m[1]));

// 共通の店の表（scripts/globals/shop.lua）：地方の店・ギルドの店・よろず屋モーグリは、NPCのファイルではなくここに品がある
const shopLua = await get('scripts/globals/shop.lua');
const blockAfter = (t, name) => { const i = t.indexOf(name); if (i < 0) return ''; const s = t.indexOf('{', i); let d = 0; for (let k = s; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(s + 1, k); } return ''; };
// [xi.○○.KEY] = { ... } の並び → Map(KEY → 中身)
const entries = t => { const out = new Map(); for (const m of t.matchAll(/\[\s*xi\.[a-zA-Z.]+\.([A-Za-z0-9_]+)\s*\]\s*=\s*\{/g)) { let d = 1, k = m.index + m[0].length; for (; k < t.length && d; k++) { if (t[k] === '{') d++; else if (t[k] === '}') d--; } out.set(m[1], t.slice(m.index + m[0].length, k - 1)); } return out; };
const tuples = t => [...t.matchAll(/\{\s*xi\.item\.([A-Z0-9_]+)\s*,\s*(\d+)\s*(?:,\s*xi\.craftRank\.([A-Z]+))?[^{}]*\}/g)].map(r => [idByName.get(r[1]), Number(r[2]), r[3] || '']).filter(x => x[0] && x[1]);
const regionVendor = new Map([...blockAfter(shopLua, 'local regionalVendorTable').matchAll(/\['([^']+)'\s*\]\s*=\s*\{\s*xi\.region\.([A-Z_]+)/g)].map(m => [m[1], m[2]]));
const regionStock = entries(blockAfter(shopLua, 'local regionalStockTable'));
const guildStock = entries(blockAfter(shopLua, 'xi.shop.generalGuildStock ='));
const curioStock = entries(blockAfter(shopLua, 'xi.shop.curioVendorMoogleStock ='));
const RANKS = ['AMATEUR', 'RECRUIT', 'INITIATE', 'NOVICE', 'APPRENTICE', 'JOURNEYMAN', 'CRAFTSMAN', 'ARTISAN', 'ADEPT', 'VETERAN'];
const uniq = l => { const s = new Set(); return l.filter(x => !s.has(x[0]) && s.add(x[0])); };

const shops = [];
const queue = [...files];
const work = async () => {
  while (queue.length) {
    const f = queue.shift();
    const m = /^scripts\/zones\/([^/]+)\/npcs\/([^/]+)\.lua$/.exec(f); if (!m) continue;
    const z = zoneIdByDir.get(m[1].toLowerCase().replace(/[^a-z0-9]/g, '')); if (z == null) continue;
    const src = await get(f); if (!/xi\.shop\./.test(src)) continue;
    const npc = m[2].replace(/_/g, ' ');
    // 地方の店：その地方を自国が支配している時だけ開く（region は enum の名前。表示側で日本語にする）
    if (/handleRegionalShop/.test(src)) { const r = regionVendor.get(m[2]); const l = r && regionStock.get(r) ? uniq(tuples(regionStock.get(r))).map(x => [x[0], x[1]]) : []; if (l.length) shops.push({ z, npc, nation: false, region: r, items: l }); continue; }
    // ギルドの店：3つ目はその品を買えるギルドの位（0＝素人〜。分からない位は付けない）
    const gk = /guildSkillId\s*=\s*xi\.skill\.([A-Z]+)/.exec(src) || /generalGuildStock\[\s*xi\.skill\.([A-Z]+)\s*\]/.exec(src);
    if (gk && guildStock.get(gk[1])) { const l = uniq(tuples(guildStock.get(gk[1]))).map(x => { const i = RANKS.indexOf(x[2]); return i >= 0 ? [x[0], x[1], i] : [x[0], x[1]]; }); if (l.length) shops.push({ z, npc, nation: false, guild: gk[1], items: l }); continue; }
    // よろず屋モーグリ：全部の分類を1つの店にまとめる（品は大事な物「ラプソディ」で増える）
    if (/curioVendorMoogleStock/.test(src)) { const l = uniq([...curioStock.values()].flatMap(tuples)).map(x => [x[0], x[1]]); if (l.length) shops.push({ z, npc, nation: false, curio: true, items: l }); continue; }
    const nation = /xi\.shop\.nation\s*\(/.test(src);
    const items = [], seen = new Set();
    for (const r of src.matchAll(/\{\s*(xi\.item\.([A-Z0-9_]+)|\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+)\s*)?,?\s*\}/g)) {
      const id = r[2] ? idByName.get(r[2]) : Number(r[1]); const price = Number(r[3]);
      if (!id || !price || seen.has(id)) continue; seen.add(id);
      items.push(nation && r[4] ? [id, price, Number(r[4])] : [id, price]);
    }
    if (items.length) shops.push({ z, npc, nation, items });
  }
};
await Promise.all(Array.from({ length: 8 }, work));
// 表示用の注記（日本語）。地方名は src/mapsPage.mjs の地方の表と同じ呼び方
const REGION_JA = { RONFAURE: 'ロンフォール', ZULKHEIM: 'ザルクヘイム', NORVALLEN: 'ノルバレン', GUSTABERG: 'グスタベルグ', DERFLAND: 'デルフラント', SARUTABARUTA: 'サルタバルタ', KOLSHUSHU: 'コルシュシュ', ARAGONEU: 'アラゴーニュ', FAUREGANDI: 'フォルガンディ', VALDEAUNIA: 'ヴァルドニア', QUFIM_ISLAND: 'クフィム', LITELOR: 'リ・テロア', KUZOTZ: 'クゾッツ', VOLLBOW: 'ヴォルボー', ELSHIMO_LOWLANDS: 'エルシモ低地', ELSHIMO_UPLANDS: 'エルシモ高地', TULIA: 'トゥー・リア', MOVALPOLOS: 'ムバルポロス', TAVNAZIAN_ARCHIPELAGO: 'タブナジア群島' };
const GUILD_JA = { WOODWORKING: '木工', SMITHING: '鍛冶', GOLDSMITHING: '彫金', CLOTHCRAFT: '裁縫', LEATHERCRAFT: '革細工', BONECRAFT: '骨細工', ALCHEMY: '錬金術', COOKING: '調理', FISHING: '釣り' };
for (const s of shops) {
  if (s.region) s.note = (REGION_JA[s.region] || s.region) + '地方の店（その地方を自国が支配している時だけ）';
  else if (s.guild) s.note = (GUILD_JA[s.guild] || s.guild) + 'ギルドの店';
  else if (s.curio) s.note = 'よろず屋モーグリ（大事な物「ラプソディ」で品が増える）';
}
shops.sort((a, b) => a.z - b.z || a.npc.localeCompare(b.npc));
if (shops.length > 50) fs.writeFileSync(path.join(DATA, 'shops.json'), JSON.stringify({ shops }));
console.log('お店', shops.length, '店', shops.reduce((s, x) => s + x.items.length, 0), '品');
