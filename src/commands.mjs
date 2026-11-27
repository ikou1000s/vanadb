// テキストコマンドの一覧 → commands.html
// 公式のゲームマニュアル（www.playonline.com/ff11/manual/）の「テキストコマンドの種類」「代名詞について」を手本に、
// コマンド名と「何をするか」をこのサイトの言葉で短くまとめた物（説明文はそのまま写さない）。細かい使い方は公式マニュアルへ。
const MANUAL = 'https://www.playonline.com/ff11/manual/';

// [コマンド（省略形）, 何をするか, 例]
const GROUPS = [
  ['pron', 'ターゲットの指定（代名詞）', 'コマンドの後ろに付けて、誰に使うかを決めます。', [
    ['<t>', '今ターゲットしている相手', '/ma ケアル <t>'],
    ['<me>', '自分', '/ma プロテス <me>'],
    ['<st>', '矢印で相手を選んでから決める', '/ma ケアル <st>'],
    ['<stpc> / <stnpc>', '選べる相手をPCだけ／NPC・モンスターだけに絞って選ぶ', ''],
    ['<stpt> / <stal>', 'パーティ／アライアンスの欄から選ぶ（画面にいない人も選べる）', '/ma ケアル <stpt>'],
    ['<lastst>', '最後に選んだ相手', ''],
    ['<r>', '最後にtellをくれた人', '/t <r> 了解です'],
    ['<p0>〜<p5>', 'パーティの上から順に（p0＝自分）', '/ma ケアル <p1>'],
    ['<a10>〜<a15> / <a20>〜<a25>', 'アライアンスの上の段／下の段のメンバー', ''],
    ['<bt>', 'パーティが戦っている相手', '/a <bt>'],
    ['<ht>', '救援要請の出ている相手', ''],
    ['<scan>', '広域スキャンで追っている相手', ''],
    ['<pet>', '自分のペット（召喚獣・飛竜など）', '/ma ケアル <pet>'],
    ['<ft>', '自分が呼んでいるフェロー', ''],
  ]],
  ['chat', 'チャット', '話す相手・範囲を決めて発言します。', [
    ['/say (/s)', '近くの人に話す', '/s こんにちは'],
    ['/shout (/sh)', '広い範囲の人に話す', ''],
    ['/yell', 'エリアの全員に話す（使えるエリアのみ）', ''],
    ['/tell (/t)', '名前を指定して1人に話す', '/t 名前 文章'],
    ['/party (/p)', 'パーティ・アライアンスに話す', '/p 釣ります'],
    ['/linkshell (/l) ・ /linkshell2 (/l2)', 'リンクシェル（1・2）に話す', ''],
    ['/unity (/u)', 'ユニティのチャット', ''],
    ['/assistj (/aj) ・ /assiste (/ae)', 'アシストチャンネル（日本語・英語）', ''],
    ['/emote (/em)', '自分の名前に続けて文章を出す（動きの文）', '/em はおじぎした'],
    ['/chatmode (/cm)', 'ふだんの発言先を変える', '/cm party'],
    ['/echo', '自分だけに見える文を出す（マクロの目印に）', '/echo MP回復中'],
    ['/blacklist (/blist)', '指定した人の発言を見えなくする一覧', ''],
    ['/yellsw ・ /assistjsw ・ /assistesw', 'yell・アシストチャンネルの表示のon/off', ''],
  ]],
  ['battle', 'バトル', '攻撃・魔法・アビリティなど。<t>などと組み合わせます。', [
    ['/attack (/a)', 'オートアタックのon/off', '/a <bt>'],
    ['/attackoff', '攻撃をやめる', ''],
    ['/magic (/ma)', '魔法を使う', '/ma ケアルIV <stpt>'],
    ['/jobability (/ja)', 'ジョブアビリティを使う', '/ja 挑発 <t>'],
    ['/weaponskill (/ws)', 'ウェポンスキルを使う', '/ws サベッジブレード <t>'],
    ['/ninjutsu (/nin)', '忍術を使う', ''],
    ['/song (/so)', '歌を歌う', ''],
    ['/pet', 'ペットコマンドを使う', '/pet かかれ <t>'],
    ['/monsterskill (/ms)', 'モンストロスの技を使う', ''],
    ['/range (/ra)', '遠隔攻撃', '/ra <t>'],
    ['/item', 'アイテムを使う', '/item ハイポーション <me>'],
    ['/target (/ta)', '名前を指定してターゲットする', ''],
    ['/targetnpc ・ /targetpc ・ /targetbnpc', '近くのNPC・PC・戦える相手をターゲットする', ''],
    ['/assist (/as)', '指定した人のターゲットに合わせる', '/as <p1>'],
    ['/check (/c)', '相手を調べる', ''],
    ['/recast', 'アビリティ・魔法の再使用までの時間を見る', '/recast 挑発'],
    ['/heal', 'ヒーリング（休む）のon/off', ''],
    ['/help (/h)', '救援要請を出す', ''],
    ['/fish', '釣りをする', ''],
    ['/dig', 'チョコボで地面を掘る', ''],
  ]],
  ['gear', '装備・見た目', '', [
    ['/equip', '部位を指定して装備する（名前なしで外す）', '/equip head ニャメヘルム'],
    ['/equipset', '登録した装備セットに着替える（1〜100）', '/equipset 5'],
    ['/lockstyle', '今の見た目を固定する', '/lockstyle on'],
    ['/lockstyleset', '装備セットの見た目で固定する', '/lockstyleset 10'],
    ['/displayhead', '頭の装備を見せる／隠す', ''],
    ['/itemsearch', 'アイテムがどのかばん・倉庫にあるか探す', '/itemsearch ○○'],
  ]],
  ['party', 'パーティ・リンクシェル・フレンド', '', [
    ['/invite (/inv)', '「パーティ参加希望」のon/off', ''],
    ['/autogroup (/ag)', '「おまかせ編成」のon/off', ''],
    ['/partycmd (/pcmd)', 'パーティの勧誘・除名・リーダー交代など', '/pcmd add 名前'],
    ['/alliancecmd (/acmd)', 'アライアンスの操作', ''],
    ['/join ・ /decline', '誘いを受ける・断る', ''],
    ['/recruit (/rec) ・ /recruitlist (/rlist)', '「リクエスト受付」と、申し込んできた人の管理', ''],
    ['/search (/sea)', '条件に合う人を探す', ''],
    ['/seacom (/sc) ・ /seacomup (/scu)', 'サーチコメントを書く・出す', ''],
    ['/anon', 'サーチで名前以外を隠す', ''],
    ['/away ・ /online ・ /hide', 'フレンドリストでの状態（席を外す・オンライン・姿を隠す）', ''],
    ['/friendlist (/flist)', 'フレンドリストを開く', ''],
    ['/linkshellmes (/lsmes) ・ /ls2mes', 'リンクシェルのメッセージを見る・書く', ''],
    ['/makelinkshell (/makeli) ・ /breaklinkshell (/breakli)', 'リンクパールを作る・壊す', ''],
    ['/nominate ・ /vote', '問いを出して投票してもらう・投票する', '/nominate party どっち？ 右 左'],
    ['/random', '0〜999のさいころ', ''],
    ['/blockaid', 'パーティ以外からの支援（ケアルなど）を受けない', '/blockaid on'],
  ]],
  ['menu', 'メニューを開く', '', [
    ['/map', 'マップ', ''],
    ['/keyitem', 'だいじなもの', ''],
    ['/quest ・ /mission', 'クエスト・ミッション', ''],
    ['/bank ・ /bank2 ・ /storage ・ /locker ・ /satchel ・ /sack ・ /case', 'モグ金庫・収納家具・ロッカー・サッチェル・サック・ケース', ''],
    ['/wardrobe 〜 /wardrobe8', 'モグワードローブ1〜8', ''],
    ['/mailbox ・ /sendpost', 'ポスト（受け取る・送る）', ''],
    ['/recycle', 'リサイクル', ''],
    ['/lastsynth', '最後にした合成を確かめる・もう一度する', ''],
    ['/layout ・ /garden ・ /remodel', 'レイアウト・栽培・リモデル', ''],
    ['/regionmap (/rmap) ・ /besiegemap ・ /campaignmap ・ /colonizationmap', 'コンクェスト・ビシージ・カンパニエ・コロナイズの画面', ''],
    ['/supportdesk (/sd) ・ /guide', 'サポートデスク・コンテンツガイド', ''],
    ['/playtime ・ /clock', 'プレイ時間・今の時刻', ''],
  ]],
  ['sys', '表示・設定・そのほか', '', [
    ['/?', 'コマンドの一覧・説明をゲームの中で見る', '/? equip'],
    ['/follow', '相手について歩く', ''],
    ['/automove', '前に歩き続ける', ''],
    ['/lockon', 'ターゲットに向きを合わせ続ける', ''],
    ['/mount ・ /dismount', 'マウントに乗る・降りる', '/mount ラプトル'],
    ['/names', '頭の上の名前を出す／消す', '/names off otherpc'],
    ['/autotarget', '攻撃してきた相手に自動でターゲットを替えるかどうか', ''],
    ['/macro', 'マクロのブック・セットを切り替える', '/macro book 3'],
    ['/checkparam', '自分・ペットの命中・攻撃などを見る', '/checkparam <me>'],
    ['/returntrust (/retr) ・ /returnfaith', 'フェイスを戻す（all で全員）', '/retr all'],
    ['/hidetrust ・ /ignoretrust ・ /emotetrust', 'ほかの人のフェイスを隠す・選ばない、フェイスの感情表現', ''],
    ['/ignorepet', '自分のペット以外をターゲットしにくくする', ''],
    ['/timestamp', 'ログに時刻を出す（分・秒）', '/timestamp sec'],
    ['/statustimer ・ /statusparty', '強化の残り時間・パーティの強化アイコンを出す', ''],
    ['/partyinfo', 'パーティの欄にTPを出す', '/partyinfo showtp on'],
    ['/focustarget', 'パーティの人をフォーカスターゲットにする', ''],
    ['/areaeffect (/aoe)', '範囲の効果の表示', ''],
    ['/localsettings', '表示人数・影・ほかの人の防具を隠すなど', '/localsettings charanum 50'],
    ['/battlebgm', '戦闘曲を自分が戦う時だけにする', ''],
    ['/mutebgm ・ /mutese', '音楽・効果音を一時的に消す', ''],
    ['/jobmasterdisp', 'ジョブマスターの★を出す／消す', ''],
    ['/translate', 'アイテム名を日本語⇔英語にする', '/translate 炎のクリスタル je'],
    ['/servmes ・ /ver', 'お知らせ・バージョンを見る', ''],
    ['/logout ・ /shutdown', 'ログアウト・終了', ''],
  ]],
  ['macro', 'マクロで使う書き方', 'マクロの文の中に書くと、その場の値に置き換わったり、待ったりします。', [
    ['<wait 秒数>', '次の行まで待つ', '/ja 挑発 <t> <wait 2>'],
    ['<hp> ・ <mp> ・ <tp>', '自分のHP・MP（今/最大）・TP', '/p TP <tp>'],
    ['<hpp> ・ <mpp>', '自分のHP・MPの割合（%）', ''],
    ['<pethpp> ・ <petmpp> ・ <pettp>', 'ペットのHP%・MP%・TP', ''],
    ['<job> ・ <mjob> ・ <sjob>', 'ジョブとレベル', ''],
    ['<pos>', '今いる場所（地図のマス）', '/p 今 <pos> にいます'],
    ['<call> ・ <ncall> ・ <scall>', '呼び出し音を鳴らす（番号つきで音を選ぶ）', '/p 集合！ <call14>'],
    ['<recast=アビリティ名>', 'そのアビリティ・魔法の再使用までの時間', ''],
    ['<focust>', 'フォーカスターゲットにした人', ''],
  ]],
];
// 感情表現：ゲームのデータにあるコマンド名に、意味を添える（分からない物は意味なし）
const EMO_JA = { bow: 'おじぎ', point: '指さす', salute: '敬礼', kneel: 'ひざまずく', laugh: '笑う', cry: '泣く', no: 'いいえ', yes: 'はい（/nod）', wave: '手を振る', goodbye: 'さようなら（/farewell）', welcome: 'いらっしゃい', joy: '喜ぶ', cheer: '応援する', clap: '拍手', praise: 'ほめる', smile: 'ほほえむ', poke: 'つつく', slap: 'ひっぱたく', stagger: 'よろめく', sigh: 'ため息', comfort: 'なぐさめる', surprised: '驚く', amazed: '感心する', stare: 'じっと見る', blush: '照れる', angry: '怒る', disgusted: 'うんざり（/upset）', muted: 'だまる', doze: '居眠り', panic: 'あわてる', grin: 'にやり', dance: '踊る', think: '考える', fume: 'ぷんぷん', doubt: '疑う', sulk: 'すねる', psych: '気合い', huh: 'はあ？', shocked: 'がーん', hurray: '勝ちどき', toss: '投げる', sit: '座る', sitchair: '椅子に座る', jump: 'ジャンプ', aim: '遠隔攻撃の構え', bell: 'ベルを鳴らす' };

export function writeCommands(ctx) {
  const { SITE, DATA, head, foot, esc, BASE, ORIGIN, SITE_SHORT, VER, readLua, fs, path } = ctx;
  let emotes = [];
  const ef = path.join(DATA, 'emotes.lua');
  if (fs.existsSync(ef)) emotes = [...new Set([...readLua(ef).values()].filter(e => e.command).map(e => e.command))];
  for (const x of ['point', 'sit', 'sitchair', 'jump', 'aim', 'bell']) if (!emotes.includes(x)) emotes.push(x);
  const n = GROUPS.reduce((a, g) => a + g[3].length, 0) + emotes.length;
  const row = ([c, d, ex]) => `<div class="r"><div class="c-n"><code>${esc(c)}</code></div><div class="c-fx">${esc(d)}</div><div class="c-ex">${ex ? `<code>${esc(ex)}</code>` : ''}</div></div>`;
  const html = head(`テキストコマンドの一覧｜/ma・/equipset・<t>・<wait> など｜${SITE_SHORT}`, 'FF11のテキストコマンド（チャット・バトル・装備・パーティ・メニュー・表示の設定）と、<t> <me> <stpt> などの代名詞、マクロで使う <wait> <hpp> などを、使い方の例つきで一覧。', `${ORIGIN}/commands.html`)
    + `<main class="wide"><p class="crumb"><a href="${BASE}">トップ</a> › テキストコマンド</p><h1>テキストコマンド <span class="cnt">${n}件</span></h1>
<p class="lead">チャット欄に「/」から打つコマンドと、マクロで使う書き方の一覧です。説明は短くまとめています。細かい使い方（サブコマンドなど）は、<a href="${MANUAL}" rel="noopener" target="_blank">公式のゲームマニュアル</a>の「コマンド／マクロ」で見られます。</p>
<div class="row"><label>名前</label><input type="search" class="tfilter" data-for="cmd" placeholder="コマンドや説明の一部で絞る（例：equip、装備、ケアル）"></div>
<nav class="catnav"><div><span class="lbl">種類</span>${GROUPS.map(([k, ja, , l]) => `<a href="#c-${k}">${ja}<span class="cnt">${l.length}</span></a>`).join('')}<a href="#c-emote">感情表現<span class="cnt">${emotes.length}</span></a></div></nav>
<div class="tbl cmd" id="cmd"><div class="r h"><div class="c-n">コマンド</div><div class="c-fx">何をするか</div><div class="c-ex">例</div></div>
${GROUPS.map(([k, ja, note, l]) => `<div class="band" id="c-${k}" data-band="${ja}">${ja} <span>${l.length}件</span></div>${note ? `<div class="cnote">${esc(note)}</div>` : ''}${l.map(row).join('')}`).join('')}
<div class="band" id="c-emote" data-band="感情表現">感情表現 <span>${emotes.length}件</span></div><div class="cnote">キャラが動きで気持ちを表します。後ろに「motion」を付けると文を出さずに動きだけ、相手をターゲットしているとその人に向けて行います。</div>
${emotes.map(e => row([`/${e}`, EMO_JA[e] || '', ''])).join('')}</div>
<p class="note">コマンドの名前と働きは公式のゲームマニュアルを手本にしています（説明文はこのサイトでまとめた物）。外部ツールのコマンドは載せていません。</p>
</main><script src="${BASE}list.js?v=${VER}"></script>` + foot;
  fs.writeFileSync(path.join(SITE, 'commands.html'), html);
  return { urls: [`${ORIGIN}/commands.html`], count: n };
}
