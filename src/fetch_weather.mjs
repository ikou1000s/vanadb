// エリアの天候（LandSandBoat sql/zone_weather.sql・GPLv3）→ data/weather.json
// 元データは2160日（ヴァナ・ディール日）の周期で、日ごとに「ふつう・ときどき・まれ」の3つの天候を持つ（変わる日だけ値がある）。
// サーバーは ふつう50%・ときどき35%・まれ15% で選ぶ（src/map/zone.cpp UpdateWeather）。周期の全日で重みを足して、天候ごとの出やすさ（%）にする。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const RAW = 'https://raw.githubusercontent.com/LandSandBoat/server/base/';
// 通信が一時的に切れることがあるので、3回まで待って取り直す
const get = async f => { for (let i = 0; ; i++) { try { const r = await fetch(RAW + f); return r.ok ? await r.text() : ''; } catch (e) { if (i >= 3) throw e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); } } };

const CYCLE = 2160, W = [0.5, 0.35, 0.15];
const src = await get('sql/zone_weather.sql');
const zones = {};
for (const m of src.matchAll(/\((\d+),0x([0-9a-fA-F]+)\)/g)) {
  const z = Number(m[1]), hex = m[2];
  const share = {};
  let cur = [0, 0, 0], any = false;
  for (let d = 0; d < CYCLE; d++) {
    const o = d * 4;
    if (o + 4 <= hex.length) {
      const v = parseInt(hex.slice(o + 2, o + 4) + hex.slice(o, o + 2), 16); // 2バイトの小さい方が先
      if (v) { cur = [v >> 10, (v >> 5) & 0x1f, v & 0x1f]; any = true; }
    }
    cur.forEach((w, k) => { share[w] = (share[w] || 0) + W[k]; });
  }
  if (!any) continue;
  const out = {};
  for (const [w, s] of Object.entries(share)) { const p = Math.round(s / CYCLE * 1000) / 10; if (p > 0) out[w] = p; }
  zones[z] = out;
}
if (Object.keys(zones).length > 100) fs.writeFileSync(path.join(DATA, 'weather.json'), JSON.stringify({ source: 'https://github.com/LandSandBoat/server (sql/zone_weather.sql)', license: 'GPL-3.0', note: 'normal 50% / common 35% / rare 15% over the 2160-day cycle', zones }));
console.log('天候', Object.keys(zones).length, 'エリア');
