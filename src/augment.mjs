// オーグメント：固定で付く分（魔法試練の報酬）と、幅つきでランダムに付く分（アビセアの箱）→ augment.html
// 元データ：LandSandBoat（GPLv3）。英語の表記を、ゲーム内の日本語の略し方に置き換える（分からない語は英語のまま残す）。
import fs from 'node:fs';
import path from 'node:path';
import { readLua } from './lua.mjs';

// 語の置き換え（長い語から順に）
const WORDS = [
  ['Spell interruption rate down', '詠唱中断率ダウン'], ['Cure spellcasting time', 'ケアル詠唱時間'], ['HP recovered while healing', 'ヒーリングHP'], ['MP recovered while healing', 'ヒーリングMP'],
  ['Weapon skill damage', 'ウェポンスキルのダメージ'], ['Weapon Skill:DMG', 'ウェポンスキルのダメージ'], ['Weapon Skill Acc.', 'ウェポンスキルの命中'],
  ['Enemy crit. hit rate', '被クリティカルヒット率'], ['Mag. crit. hit dmg.', '魔法クリティカルヒットダメージ'], ['Breath dmg. taken', '被ブレスダメージ'], ['Magic dmg. taken', '被魔法ダメージ'], ['Phys. dmg. taken', '被物理ダメージ'],
  ['Healing magic skill', '回復魔法スキル'], ['Dark magic skill', '暗黒魔法スキル'], ['Shield skill', '盾スキル'], ['Shield Mastery', 'シールドマスタリー'],
  ['Mag.Atk.Bns.', '魔攻'], ['Rng.Atk.', '飛攻'], ['Rng.Acc.', '飛命'], ['Crit.hit rate', 'クリティカルヒット'], ['Cure potency', 'ケアル回復量'], ['Occ. atk. twice', 'ときどき2回攻撃'],
  ['Treasure Hunter', 'トレジャーハンター'], ['Gilfinder', 'ギルスティール'], ['Subtle Blow', 'モクシャ'], ['Store TP', 'ストアTP'], ['TP Bonus', 'TPボーナス'], ['Fast Cast', 'ファストキャスト'], ['Conserve MP', 'コンサーブMP'],
  ['Snapshot', 'スナップショット'], ['Zanshin', '残心'], ['Counter', 'カウンター'], ['Refresh', 'リフレシュ'], ['Regen', 'リジェネ'], ['Enmity', '敵対心'], ['Evasion', '回避'], ['Accuracy', '命中'], ['Attack', '攻'],
  ['Resist Silence', '耐静寂'], ['Resist Virus', '耐ウィルス'], ['Resist Charm', '耐魅了'], ['Resist Gravity', '耐重力'], ['Resist Blind', '耐暗闇'], ['Resist Bind', '耐バインド'], ['Resist Petrify', '耐石化'],
  ['Resist Stun', '耐スタン'], ['Resist Poison', '耐毒'], ['Resist Curse', '耐呪い'], ['Resist Paralyze', '耐麻痺'], ['Resist Sleep', '耐睡眠'], ['Resist Slow', '耐スロウ'], ['Resist Amnesia', '耐アムネジア'],
  ['Fire resist', '耐火'], ['Ice resist', '耐氷'], ['Wind resist', '耐風'], ['Earth resist', '耐土'], ['Lightning resist', '耐雷'], ['Water resist', '耐水'], ['Light resist', '耐光'], ['Dark resist', '耐闇'],
  ['Pet:', 'ペット：'], ['DEF', '防'], ['Delay:', '隔'], ['DMG:', 'D'], ['Dmg:', 'D'], [':DMG', 'のダメージ'],
];
const AID = { 746: '（遠隔）', 747: '（遠隔）', 761: '（遠隔）', 764: '（遠隔）', 765: '（遠隔）' }; // 遠隔用の番号

export function writeAugment(ctx) {
  const { items, head, foot, esc, BASE, ORIGIN, SITE, DATA, SITE_SHORT, VER, tile, hasPage } = ctx;
  const f = path.join(DATA, 'aug.json');
  if (!fs.existsSync(f)) return { home: '', urls: [], count: 0, byItem: new Map() };
  const A = JSON.parse(fs.readFileSync(f, 'utf8'));
  // WS・アビリティの名前は英→日の表で置き換える（"Shining Blade:DMG" → シャインブレードのダメージ）
  const names = new Map();
  for (const file of ['weapon_skills.lua', 'job_abilities.lua']) {
    const p = path.join(DATA, file); if (!fs.existsSync(p)) continue;
    for (const v of readLua(p).values()) if (v && v.en && v.ja) names.set(v.en, v.ja);
  }
  const ja = (txt, id) => {
    let s = txt.replace(/"/g, '').replace(/'/g, '');
    const ws = /^(.+?):\s*DMG/.exec(s);
    if (ws && names.has(ws[1].trim())) s = s.replace(ws[1], names.get(ws[1].trim()));
    const pen = /^Enhances (.+) effect$/i.exec(s);
    if (pen) s = `${names.get(pen[1]) || pen[1]}の効果アップ`;
    for (const [en, j] of WORDS) s = s.split(en).join(j);
    s = s.replace(/\s*\(Ranged\)/i, '').replace(/\s+([+-])/g, '$1').replace(/[:：]\s*/g, '：').trim();
    return s + (AID[id] || '');
  };
  const iname = id => (items.get(id) || {}).ja || `#${id}`;
  const ilink = id => (hasPage(id) ? `<a href="${BASE}item/${id}.html">${esc(iname(id))}</a>` : esc(iname(id)));
  const augList = l => l.map(([a, , t]) => `<span class="aug" title="${esc(t)}">${esc(ja(t, a))}</span>`).join(' ');

  // 魔法試練：オーグメントが付く報酬だけ。武器ごとにまとめ、試練の順に
  const tr = A.trials.filter(t => t.rew.augs.length && items.get(t.rew.id));
  const byW = new Map(); for (const t of tr) { if (!byW.has(t.rew.id)) byW.set(t.rew.id, []); byW.get(t.rew.id).push(t); }
  const weapons = [...byW].sort((a, b) => iname(a[0]).localeCompare(iname(b[0]), 'ja'));
  const byItem = new Map(); // 装備ページ用：品番 → 文
  for (const [id, l] of weapons) byItem.set(id, l.sort((a, b) => a.no - b.no).map(t => ja(t.rew.augs.map(x => x[2]).join(' '), t.rew.augs[0][0])));
  // アビセアの箱：候補と幅
  const px = A.pyxis.filter(p => items.get(p.id)).sort((a, b) => iname(a.id).localeCompare(iname(b.id), 'ja'));
  const zj = { KONSCHTAT: 'コンシュタット', TAHRONGI: 'タロンギ', LA_THEINE: 'ラテーヌ', ATTOHWA: 'アットワ', MISAREAUX: 'ミザレオ', VUNKERL: 'ブンカール', ALTEPA: 'アルテパ', ULEGUERAND: 'ウルガラン', GRAUBERG: 'グロウベルグ' };
  const zone = z => { const k = z.replace(/^ABYSSEA_/, ''); return zj[k] ? `アビセア-${zj[k]}` : z; };
  const range = x => { const lo = ja(x[3], x[0]), hi = ja(x[4], x[0]); if (lo !== hi && (lo.match(/[+-]\d/g) || []).length > 1) return `${lo} 〜 ${hi}`; const m = /^(.*?)([+-]\d+%?)$/.exec(lo), n = /([+-]\d+%?)$/.exec(hi); return m && n && lo !== hi ? `${m[1]}${m[2]}〜${n[1].replace(/^\+/, '')}` : lo; };
  for (const p of px) if (!byItem.has(p.id)) byItem.set(p.id, null);

  const rel = 'augment.html';
  const html = head(`オーグメント一覧｜魔法試練で固定で付く値・アビセアの箱の幅｜${SITE_SHORT}`,
    `FF11のオーグメントのうち、魔法試練（マジアン）の報酬で決まって付く値${tr.length}件と、アビセアの箱から出る装備${px.length}品の候補と幅。`, `${ORIGIN}/${rel}`)
    + `<main class="wide"><p class="crumb"><a href="${BASE}">トップ</a> › オーグメント</p><h1>オーグメント <span class="cnt">固定${tr.length}件・幅つき${px.length}品</span></h1>
<p class="lead">オーグメントの中身が決まっている分を集めています。<b>固定</b>＝魔法試練（マジアンの試練）の報酬で、毎回同じ値が付く物。<b>幅つき</b>＝アビセアの頑丈な箱から出る装備で、候補の中から選ばれた物が、幅の中のどこかの値で付く物です。オデシー・ニャメなどの新しいコンテンツの分は、使ってよい公開データが無いため、まだ載せていません。</p>
<div class="row"><label>名前</label><input type="search" class="tfilter" data-for="mg" placeholder="武器の名前・オーグメントで絞る（例：攻、ストアTP）"></div>
<h2 id="magian">魔法試練で固定で付く（${weapons.length}武器・${tr.length}件）</h2>
<div class="tbl aug" id="mg"><div class="r h"><div class="c-n">武器</div><div class="c-lv">試練</div><div class="c-fx">付くオーグメント</div><div class="c-bt">試練に持ち込む物</div></div>
${weapons.map(([id, l]) => l.map((t, i) => `<div class="r" data-id="${id}"><div class="c-n">${i ? '<span class="nl">〃</span>' : ilink(id) + `<small>${esc((items.get(id) || {}).en || '')}</small>`}</div><div class="c-lv">${t.no}</div><div class="c-fx">${augList(t.rew.augs)}</div><div class="c-bt">${t.req.id ? ilink(t.req.id) + (t.req.augs.length ? ` <small>（${augList(t.req.augs)}）</small>` : '') : '<span class="nl">—</span>'}${t.num ? ` <small class="nl">×${t.num}</small>` : ''}</div></div>`).join('')).join('')}</div>
<h2 id="pyxis">アビセアの箱で幅つきで付く（${px.length}品）</h2>
<p>候補のうちいくつかが、表の幅の中の値で付きます（どれが付くかはランダム）。</p>
<div class="tbl aug"><div class="r h"><div class="c-n">装備</div><div class="c-lv">エリア</div><div class="c-fx">候補と幅</div></div>
${px.map(p => `<div class="r" data-id="${p.id}"><div class="c-n">${ilink(p.id)}<small>${esc((items.get(p.id) || {}).en || '')}</small></div><div class="c-lv">${esc(zone(p.zone))}</div><div class="c-fx">${p.augs.map(x => `<span class="aug" title="${esc(x[3])}〜${esc(x[4])}">${esc(range(x))}</span>`).join(' ')}</div></div>`).join('')}</div>
<p class="note">元データ：有志のサーバー再現データ LandSandBoat（GPLv3）の magian_data.lua・sturdypyxis/augmented_item.lua・augments.sql。英語の表記を、ゲーム内の日本語の略し方（攻・飛攻・D・隔など）に置き換えています。字にマウスを乗せると元の英語が出ます。再現データなので、今のゲームと違う所があり得ます（試練の番号・回数は参考）。</p></main><script src="${BASE}list.js?v=${VER}"></script>` + foot;
  fs.writeFileSync(path.join(SITE, rel), html);
  const home = tile(`${BASE}augment.html`, 'オーグメント', tr.length + px.length, '強', 'ex');
  return { home, urls: [`${ORIGIN}/${rel}`], count: tr.length + px.length, byItem };
}
