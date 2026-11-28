// ジョブのページの「ジョブポイントのギフト」の節（data/jpgifts.json・fetch_jpgifts.mjs）
// 見出しは英語の説明を自分の言葉で短く日本語にした物（ゲーム内の表記とは違うことがある）。無い物は英語のまま
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = path.join(ROOT, 'data', 'jpgifts.json');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const JA = {
  'physical defense bonus': '防御力', 'attack bonus': '攻撃力', 'ranged attack bonus': '飛攻', 'accuracy bonus': '命中', 'ranged accuracy bonus': '飛命',
  'magic attack bonus': '魔法攻撃力', 'magic defense bonus': '魔法防御力', 'magic accuracy bonus': '魔法命中', 'magic evasion bonus': '魔法回避', 'physical evasion bonus': '回避',
  'capacity point bonus': 'キャパシティポイントの獲得量（%）', superior: 'スペリオル（装備できる段階）', '1 hour delay': 'SPアビリティの再使用時間の短縮',
  'critical damage bonus': 'クリティカルのダメージ', 'critical hit bonus': 'クリティカルヒット率', 'critical defense bonus': '被クリティカルの軽減',
  'dark magic skill bonus': '暗黒魔法スキル', 'enhancing magic skill bonus': '強化魔法スキル', 'elemental magic skill bonus': '精霊魔法スキル', 'elemental skill bonus': '精霊魔法スキル',
  'healing magic skill bonus': '回復魔法スキル', 'divine magic skill bonus': '神聖魔法スキル', 'enfeebling magic skill bonus': '弱体魔法スキル', 'summoning magic skill bonus': '召喚魔法スキル',
  'blue magic skill bonus': '青魔法スキル', 'ninjutsu skill bonus': '忍術スキル', 'singing skill bonus': '歌唱スキル', 'string instrument skill bonus': '弦楽器スキル',
  'wind instrument skill bonus': '管楽器スキル', 'handbell skill bonus': '風水鈴スキル', 'geomancy skill bonus': '風水魔法スキル', 'guarding skill bonus': 'ガードスキル',
  'skillchain bonus': '連携のダメージ', 'magic damage bonus': '魔法ダメージ', 'magic burst damage bonus': 'マジックバーストのダメージ',
  'weapon skill damage': 'ウェポンスキルのダメージ', 'weapon skill damage bonus': 'ウェポンスキルのダメージ',
  'true shot effect': 'トゥルーショットの効果', 'dead aim effect': 'デッドエイムの効果', 'velocity shot effect': 'ベロシティショットの効果', 'snapshot effect': 'スナップショットの効果',
  'barrage effect': '乱れ撃ちの効果', 'reduced ammunition consumption': '矢弾を減らさない率', 'quick draw delay': 'クイックドローの再使用時間の短縮',
  'fencer effect': 'フェンサーの効果', 'enhances fencer effect': 'フェンサーの効果', 'double attack effect': 'ダブルアタック率', 'triple attack chance': 'トリプルアタック率', 'triple attack bonus': 'トリプルアタック率',
  'counter effect': 'カウンター率', 'counter damage': 'カウンターのダメージ', 'martial arts effect': 'マーシャルアーツの効果', 'dual wield effect': '二刀流の効果',
  'subtle blow effect': 'モクシャ', 'subtle blow effect bonus': 'モクシャ', 'store tp effect': 'ストアTPの効果', 'conserve tp effect bonus': 'コンサーブTPの効果',
  'zanshin effect': '残心の効果', 'zanshin effect bonus': '残心の効果', 'zanshin chance bonus': '残心の効果', 'third eye effect': '心眼の効果',
  'daken effect': '打剣の効果', 'ninjutsu effect duration': '忍術の効果時間', 'inquartata effect': 'インクァルタータの効果', 'shield mastery effect': 'シールドマスタリーの効果',
  'protect effect': 'プロテスの効果', 'cure potency bonus': 'ケアルの回復量', 'regen bonus': 'リジェネの回復量', 'healing magic cast time decrease': '回復魔法の詠唱時間の短縮',
  'fast cast effect': 'ファストキャスト', 'enhanced fast cast effect': 'ファストキャスト', 'enspell damage': 'エン系魔法のダメージ', 'enhanced weapon enchantment damage': 'エン系魔法のダメージ',
  'elemental celerity effect': '精霊魔法の詠唱時間の短縮', 'stratagem recast time': '戦術魔道書の再使用時間の短縮',
  'enhancing magic received duration': '受ける強化魔法の効果時間', 'enh. magic received duration': '受ける強化魔法の効果時間',
  'song effect duration': '歌の効果時間', 'song spellcasting time': '歌の詠唱時間の短縮', 'blue magic effect': '青魔法の効果', 'job trait bonus': '青魔法でつくジョブ特性', 'jobs trait bonus': '青魔法でつくジョブ特性',
  'dread spikes effect': 'ドレッドスパイクの効果', 'blood pact recast time': '契約の履行の再使用時間の短縮',
  'treasure hunter bonus': 'トレジャーハンター', 'maximum treasure hunter value': 'トレジャーハンターの上限', 'maximum finishing moves bonus': 'フィニシングムーブの上限',
  'avatar/spirit mag. atk. & def. bonus': '召喚獣の魔法攻撃力・魔法防御力', 'avatar/spirit phys. acc. & eva. bonus': '召喚獣の命中・回避', 'avatar/spirit phys. atk. & def. bonus': '召喚獣の攻撃力・防御力',
  'avatar/spirit mag. acc. & eva. bonus': '召喚獣の魔法命中・魔法回避', 'avatar/spirit mac. acc. & eva. bonus': '召喚獣の魔法命中・魔法回避', 'spirit/avatar mag. acc. & eva. bonus': '召喚獣の魔法命中・魔法回避',
  'familiar phys. acc. and eva. bonus': 'ペットの命中・回避', 'familiar phys. atk. and def. bonus': 'ペットの攻撃力・防御力', 'familiar physical attack and physical defense bonus': 'ペットの攻撃力・防御力',
  'familiar tp bonus': 'ペットのTP', 'pet attribute bonus': 'ペットの能力値', 'sic and ready recast time': 'けしかけるの再使用時間の短縮',
  'wyvern phys. acc. and eva. bonus': '飛竜の命中・回避', 'wyvern mag. acc. and eva. bonus': '飛竜の魔法命中・魔法回避', 'wyvern attribute increase effect': '飛竜の能力値', 'restoring/smiting breath delay': 'ブレスの再使用時間の短縮',
  'automaton mag. acc. and eva. bonus': 'オートマトンの魔法命中・魔法回避', 'automation mag. acc. and eva. bonus': 'オートマトンの魔法命中・魔法回避',
  'automaton mag. atk. and def. bonus': 'オートマトンの魔法攻撃力・魔法防御力', 'automation mag. atk. and def. bonus': 'オートマトンの魔法攻撃力・魔法防御力',
  'automaton phys. atk. and def. bonus': 'オートマトンの攻撃力・防御力', 'automation phys. atk. and def. bonus': 'オートマトンの攻撃力・防御力', 'automaton physical attack and defense bonus': 'オートマトンの攻撃力・防御力',
  'automaton phys. acc. and eva. bonus': 'オートマトンの命中・回避', 'automation phys. acc. and eva. bonus': 'オートマトンの命中・回避', 'automaton physical accuracy and physical evasion bonus': 'オートマトンの命中・回避',
  'automaton elemental capacity bonus': 'オートマトンの属性の容量', 'automation elemental capacity bonus': 'オートマトンの属性の容量',
};
export const giftJa = k => JA[k] || k;

let byJob = null;
const load = () => {
  if (byJob) return byJob;
  byJob = new Map();
  if (!fs.existsSync(F)) return byJob;
  for (const [job, jp, key, v] of JSON.parse(fs.readFileSync(F, 'utf8')).list) {
    if (!byJob.has(job)) byJob.set(job, []);
    byJob.get(job).push({ jp, key, v });
  }
  return byJob;
};

// { n: 段の数, html } を返す（データが無ければ n: 0）
export function giftSection(jobId) {
  const l = load().get(jobId) || [];
  if (!l.length) return { n: 0, html: '' };
  const sup = { n: 0 };
  const steps = new Map();
  for (const g of l) {
    const ja = giftJa(g.key);
    let txt;
    if (g.key === 'superior') { sup.n += g.v; txt = `スペリオル${sup.n}`; } else txt = `${ja} ${g.v}`;
    if (!steps.has(g.jp)) steps.set(g.jp, []);
    steps.get(g.jp).push(txt);
  }
  const rows = [...steps].map(([jp, t]) => `<div class="r"><div class="c-n"><b>${jp.toLocaleString()} JP</b></div><div class="c-fx">${t.map(esc).join('、')}</div></div>`).join('');
  return {
    n: steps.size,
    html: `<div class="tbl simple2"><div class="r h"><div class="c-n">使ったJP</div><div class="c-fx">貰える効果</div></div>${rows}</div>
<p class="src">数字は有志のサーバー LandSandBoat のデータ（GPLv3）です。数字は各段のデータの値で（同じ効果の段の数字が、その段で増える分か合計かはゲーム本体と照らしていません）、Lv99の時だけ効きます。見出しは英語の説明を短く日本語にした物で、ゲーム内の表記・単位とは違うことがあります。</p>`,
  };
}
