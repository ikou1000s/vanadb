// 調度品（data/furnishing.json・src/fetch_furnishing.mjs）のアイテムのページの節
// 属性・属性値・ストレージの増え方・モグハンス（効果は自分の言葉で短く）・置き方・大きさ
import fs from 'node:fs';
import path from 'node:path';

const EL = ['', '火', '氷', '風', '土', '雷', '水', '光', '闇'];
const PLACE = ['床に置く', '床に置く（上に小物を置ける台）', '壁に掛ける', '台の上に置く'];
const CRAFT = { FISHING: '釣り', WOODWORKING: '木工', SMITHING: '鍛冶', GOLDSMITHING: '彫金', CLOTHCRAFT: '裁縫', LEATHERCRAFT: '革細工', BONECRAFT: '骨細工', ALCHEMY: '錬金術', COOKING: '調理' };
const ELEM = { FIRE: '火', ICE: '氷', WIND: '風', EARTH: '土', LIGHTNING: '雷', WATER: '水', LIGHT: '光', DARK: '闇' };
const RESIST = { DEATH: '死の宣告', SLEEP: '睡眠', POISON: '毒', PARALYSIS: '麻痺', SILENCE: '静寂', PETRIFICATION: '石化', VIRUS: 'ウイルス', CURSE: '呪い' };
const OTHER = {
  MOGHANCEMENT_EXPERIENCE: '戦闘不能で失う経験値が減る', MOGHANCEMENT_GARDENING: '栽培で植物が枯れにくい', MOGHANCEMENT_DESYNTHESIS: '分解が成功しやすい',
  MOGHANCEMENT_CONQUEST: 'コンクェストの個人の戦績が多く貰える', MOGHANCEMENT_REGION: 'コンクェストで自国に入る地域のポイントが増える', MOGHANCEMENT_FISHING_ITEM: '釣りで魚以外の物が掛かりやすい',
  MOGHANCEMENT_SANDORIA_CONQUEST: 'サンドリアの冒険者だけ、コンクェストの個人の戦績が多く貰える', MOGHANCEMENT_BASTOK_CONQUEST: 'バストゥークの冒険者だけ、コンクェストの個人の戦績が多く貰える', MOGHANCEMENT_WINDURST_CONQUEST: 'ウィンダスの冒険者だけ、コンクェストの個人の戦績が多く貰える',
  MOGHANCEMENT_MONEY: 'モンスターが落とすギルが増える', MOGHANCEMENT_CAMPAIGN: '連合軍への貢献の評価が上がる', MOGHANCEMENT_MONEY_II: '貰えるギルが増える',
  MOGHANCEMENT_SKILL_GAINS: '戦闘・魔法のスキルが上がりやすい', MOGHANCEMENT_BOUNTY: '経験値とキャパシティポイントが多く貰える',
  MOGLIFICATION_EXPERIENCE_BOOST: '経験値が多く貰える', MOGLIFICATION_CAPACITY_BOOST: 'キャパシティポイントが多く貰える',
};
export const mogJa = k => {
  if (!k) return '';
  if (OTHER[k]) return OTHER[k];
  let m;
  if ((m = k.match(/^MOGHANCEMENT_(\w+)$/)) && ELEM[m[1]]) return ELEM[m[1]] + 'のクリスタルの合成で、失敗しても素材を失いにくい';
  if ((m = k.match(/^MOGHANCEMENT_(\w+)$/)) && CRAFT[m[1]]) return CRAFT[m[1]] + 'のスキルが少し上がる';
  if ((m = k.match(/^MEGA_MOGLIFICATION_(\w+)$/)) && CRAFT[m[1]]) return CRAFT[m[1]] + 'のスキルが大きく上がる' + (m[1] === 'FISHING' ? '（魚が掛かったのも分かりやすい）' : '');
  if ((m = k.match(/^MOGLIFICATION_RESIST_(\w+)$/)) && RESIST[m[1]]) return RESIST[m[1]] + 'に少しかかりにくい';
  if ((m = k.match(/^MOGLIFICATION_(\w+)$/)) && CRAFT[m[1]]) return CRAFT[m[1]] + 'のスキルが上がり、' + (m[1] === 'FISHING' ? '釣り上げやすい' : '合成に失敗しても素材を失いにくい');
  return '';
};

export function loadFurnishing(DATA) {
  const f = path.join(DATA, 'furnishing.json');
  const by = new Map();
  if (!fs.existsSync(f)) return { by, html: () => '' };
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const [id, storage, mog, el, aura, place, x, y] of d.list || []) by.set(id, { storage, mog: d.mog[mog] || '', el, aura, place, x, y });
  const html = id => {
    const v = by.get(id); if (!v) return '';
    const eff = mogJa(v.mog);
    const li = [];
    if (EL[v.el]) li.push(`<li>属性 <b>${EL[v.el]}</b>・属性値 <b>${v.aura}</b></li>`);
    if (v.storage) li.push(`<li>置くとストレージ（モグハウスの収納）が <b>+${v.storage}</b></li>`);
    if (eff) li.push(`<li>モグハンスの元になった時の効果：<b>${eff}</b></li>`);
    if (PLACE[v.place] != null) li.push(`<li>置き方：${PLACE[v.place]}・大きさ ${v.x}×${v.y}マス</li>`);
    if (!li.length) return '';
    return `<h2>モグハウスに置くと</h2><ul class="acq">${li.join('')}</ul><p class="note">モグハウスに置いた調度品の属性と属性値の合計で、その時に効くモグハンスが決まります。効き目の大きさは載せていません。</p>`;
  };
  return { by, html };
}
