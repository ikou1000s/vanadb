// 性能で探す（items.json を読んで、ジョブ・防具の部位・武器の種類・性能で絞り、表で並べる）
(async function () {
  const $ = id => document.getElementById(id);
  const data = await fetch('items.json').then(r => r.json());
  const { meta } = data;
  const STATS = meta.stats; // [名前, 件数, 低い方が良い]
  const CATS = meta.cats; // [key, 日本語, armor|weapon]
  const items = data.rows.map(r => {
    const st = {}, order = [];
    if (r[9]) for (const p of r[9].split(',')) { const [k, v] = p.split(':'); st[k] = Number(v); order.push(k); }
    return { id: r[0], name: r[1], lv: r[2], il: r[3], jobs: r[4], dmg: r[7], delay: r[8], st, order, pet: r[10], cond: r[11], en: r[12], cat: r[13] >= 0 ? CATS[r[13]][0] : '' };
  });
  const ALLJ = meta.jobs.reduce((a, [id]) => a | (1 << id), 0); // 全ジョブ装備できる物の印
  const catJa = new Map(CATS.map(([k, ja]) => [k, ja]));
  // 古いリンク（slot=頭 / skill=片手剣）も読めるように
  const params = new URLSearchParams(location.search);
  const fromOld = [...(params.get('slot') || '').split(','), params.get('skill') || ''].filter(Boolean)
    .map(ja => (CATS.find(c => c[1] === ja || (ja === '釣り' && c[0] === 'fishing')) || [])[0]).filter(Boolean);
  const state = {
    jobs: new Set((params.get('job') || '').split(',').filter(Boolean)),
    cats: new Set([...(params.get('cat') || '').split(',').filter(Boolean), ...fromOld]),
    stat: params.get('stat') || '', dir: params.get('dir') || '',
    lvmin: Number(params.get('lvmin') || 1), lvmax: Number(params.get('lvmax') || 99), il: params.get('il') === '1', all: params.get('all') === '1', q: params.get('q') || '',
  };

  // 選択肢（ジョブ・防具・武器はボタン）
  for (const [id, s, ja] of meta.jobs) chip($('jobs'), s, ja, state.jobs, String(id));
  for (const [k, ja, kind] of CATS) chip($(kind === 'armor' ? 'cats-armor' : 'cats-weapon'), ja, ja, state.cats, k);
  // 性能はジャンルごとのボタン（ふぁいなびの分け方を手本に）。そのほかはプルダウン
  const idxOf = new Map(STATS.map(([n], i) => [n, i]));
  const GENRES = [
    ['基本', ['HP', 'MP', 'STR', 'DEX', 'VIT', 'AGI', 'INT', 'MND', 'CHR', 'HP%', 'MP%']],
    ['物理（近接）', ['命中', '攻', 'ヘイスト%', 'ダブルアタック%', 'トリプルアタック%', 'クワッドアタック%', 'ストアTP', '二刀流', 'クリティカルヒット%', 'クリティカルヒットダメージ%', 'ウェポンスキルのダメージ%', 'ウェポンスキルの命中', 'TPボーナス', '物理ダメージ上限%', '連携ボーナス', 'モクシャ', 'リゲイン', 'カウンター']],
    ['遠隔', ['飛命', '飛攻', 'スナップショット', 'ラピッドショット', 'ダブルショット%', 'トリプルショット%', 'トゥルーショット']],
    ['魔法', ['魔命', '魔攻', '魔法ダメージ', 'マジックバーストダメージ', 'マジックバーストダメージII', 'ファストキャスト%', '魔法クリティカルヒット%', 'コンサーブMP', 'ケアル回復量%', 'ケアル回復量II%', 'ケアル詠唱時間%', '精霊魔法の詠唱時間%', '強化魔法の効果時間%', '歌の詠唱時間%', '全歌']],
    ['防御・盾', ['防', '回避', '魔回避', '魔防', '被ダメージ%', '被物理ダメージ%', '被物理ダメージII%', '被魔法ダメージ%', '被ブレスダメージ%', '敵対心', '盾発動率']],
    ['回復・移動', ['リフレシュ', 'リジェネ', 'ヒーリングHP', 'ヒーリングMP', '移動速度%', '召喚獣維持費']],
  ];
  const used = new Set(GENRES.flatMap(([, l]) => l));
  const auto = (name, test) => { const l = STATS.filter(([n, c]) => c >= 5 && !used.has(n) && test(n)).map(([n]) => n); l.forEach(n => used.add(n)); return [name, l]; };
  GENRES.push(auto('スキル', n => /スキル$/.test(n)));
  GENRES.push(auto('耐性', n => /^耐|レジスト|全状態異常/.test(n)));
  const statBtns = new Map();
  const pick = $('statpick');
  const pretty = n => n.replace(/%$/, '');
  for (const [g, list] of GENRES) {
    const ok = list.filter(n => idxOf.has(n));
    if (!ok.length) continue;
    const row = document.createElement('div'); row.className = 'sg';
    row.innerHTML = '<span class="sgl">' + g + '</span>';
    for (const n of ok) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip';
      b.textContent = pretty(n) + (/%$/.test(n) ? '%' : ''); b.title = STATS[idxOf.get(n)][1] + '件';
      b.onclick = () => setStat(state.stat === String(idxOf.get(n)) ? '' : String(idxOf.get(n)));
      statBtns.set(String(idxOf.get(n)), b); row.append(b);
    }
    pick.append(row);
  }
  const other = document.createElement('div'); other.className = 'sg';
  other.innerHTML = '<span class="sgl">そのほか</span>';
  const sel = document.createElement('select'); sel.id = 'stat';
  sel.append(new Option('（選ぶ）', ''));
  STATS.forEach(([n, c], i) => { if (c >= 5 && !used.has(n)) sel.append(new Option(pretty(n) + (/%$/.test(n) ? '（%）' : '') + '　' + c + '件', String(i))); });
  sel.onchange = () => setStat(sel.value);
  other.append(sel); pick.append(other);
  function setStat(v) {
    state.stat = v;
    statBtns.forEach((b, k) => b.classList.toggle('on', k === v));
    sel.value = statBtns.has(v) ? '' : v;
    $('dir').value = v && STATS[v][2] ? 'asc' : 'desc';
    render(true);
  }
  if (state.stat && !/^\d+$/.test(state.stat)) state.stat = idxOf.has(state.stat) ? String(idxOf.get(state.stat)) : '';
  statBtns.forEach((b, k) => b.classList.toggle('on', k === state.stat));
  if (!statBtns.has(state.stat)) sel.value = state.stat;
  $('dir').value = state.dir || (state.stat && STATS[state.stat][2] ? 'asc' : 'desc');
  $('lvmin').value = state.lvmin; $('lvmax').value = state.lvmax; $('il').checked = state.il; $('alljob').checked = state.all; $('q').value = state.q;

  function chip(box, label, title, set, val) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip' + (set.has(val) ? ' on' : ''); b.textContent = label; b.title = title;
    b.onclick = () => { set.has(val) ? set.delete(val) : set.add(val); b.classList.toggle('on'); render(true); };
    box.append(b);
  }
  for (const id of ['dir', 'lvmin', 'lvmax', 'il', 'alljob', 'q']) $(id).addEventListener(id === 'q' ? 'input' : 'change', () => render(true));

  let shown = 0, result = [];
  const jobCells = m => {
    const js = meta.jobs.filter(([id]) => m & (1 << id));
    if (js.length >= 22) return '<span class="jb all">全ジョブ</span>';
    return '<span class="jb">' + meta.jobs.map(([id, s, ja]) => (m & (1 << id) ? `<b title="${ja}">${s}</b>` : `<i>${s}</i>`)).join('') + '</span>';
  };

  function render(reset) {
    state.dir = $('dir').value; state.il = $('il').checked; state.all = $('alljob').checked; state.q = $('q').value.trim();
    state.lvmin = Number($('lvmin').value) || 1; state.lvmax = Number($('lvmax').value) || 99;
    const jm = [...state.jobs].reduce((a, j) => a | (1 << Number(j)), 0);
    const q = state.q.toLowerCase();
    const sk = state.stat;
    result = items.filter(it =>
      (!jm || it.jobs & jm) && (!state.cats.size || state.cats.has(it.cat)) &&
      it.lv >= state.lvmin && it.lv <= state.lvmax && (!state.il || it.il) && (!state.all || (it.jobs & ALLJ) === ALLJ) &&
      (!q || it.name.includes(state.q) || it.en.toLowerCase().includes(q)) && (sk === '' || sk in it.st));
    const asc = state.dir === 'asc';
    result.sort(sk === '' ? (a, b) => b.il - a.il || b.lv - a.lv || b.id - a.id
      : (a, b) => (asc ? a.st[sk] - b.st[sk] : b.st[sk] - a.st[sk]) || b.il - a.il || b.lv - a.lv);
    if (reset) {
      shown = 0; saveUrl();
      const vh = sk !== '' ? `<div class="c-v">${esc(STATS[sk][0].replace(/%$/, ''))}</div>` : '';
      $('list').innerHTML = `<div class="r h${sk !== '' ? ' hasv' : ''}"><div class="c-n">名前</div><div class="c-lv">Lv</div><div class="c-il">IL</div><div class="c-df">種類</div><div class="c-jb">装備できるジョブ</div>${vh}<div class="c-fx">性能</div></div>`;
    }
    const next = result.slice(shown, shown + 80);
    $('list').insertAdjacentHTML('beforeend', next.map(row).join(''));
    shown += next.length;
    $('count').innerHTML = `<b>${result.length.toLocaleString()}</b>件（全${items.length.toLocaleString()}件）${sk !== '' ? `　<b>${esc(pretty(STATS[sk][0]))}</b> の${state.dir === 'asc' ? '小さい' : '大きい'}順` : ''}`;
    $('more').hidden = shown >= result.length;
  }
  $('more').onclick = () => render(false);

  function row(it) {
    const sk = state.stat;
    const v = sk !== '' ? `<div class="c-v">${fmt(it.st[sk])}${/%$/.test(STATS[sk][0]) ? '%' : ''}</div>` : '';
    const st = it.order.map(k => [k, it.st[k]]).map(([k, val]) => {
      const n = STATS[k][0];
      return n === '防' ? `防${val}` : `${n.replace(/%$/, '')}${fmt(val)}${/%$/.test(n) ? '%' : ''}`;
    }).join(' ');
    return `<div class="r${sk !== '' ? ' hasv' : ''}"><div class="c-n"><a href="item/${it.id}.html">${esc(it.name)}</a><small>${esc(it.en)}</small></div>`
      + `<div class="c-lv">${it.lv}</div><div class="c-il">${it.il || ''}</div><div class="c-df">${esc(catJa.get(it.cat) || '')}${it.dmg ? `<br>D${it.dmg} 隔${it.delay}` : ''}</div>`
      + `<div class="c-jb">${jobCells(it.jobs)}</div>${v}<div class="c-fx">${esc(st)}${it.pet ? ' <b class="tag">ペットの性能あり</b>' : ''}${it.cond ? ' <b class="tag">条件付きの性能あり</b>' : ''}</div></div>`;
  }
  const fmt = v => (v > 0 ? '+' : '') + v;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function saveUrl() {
    const p = new URLSearchParams();
    if (state.jobs.size) p.set('job', [...state.jobs].join(','));
    if (state.cats.size) p.set('cat', [...state.cats].join(','));
    if (state.stat !== '') p.set('stat', STATS[state.stat][0]);
    if (state.lvmin !== 1) p.set('lvmin', state.lvmin);
    if (state.lvmax !== 99) p.set('lvmax', state.lvmax);
    if (state.il) p.set('il', '1');
    if (state.all) p.set('all', '1');
    if (state.q) p.set('q', state.q);
    history.replaceState(null, '', p.toString() ? '?' + p : location.pathname);
  }
  render(true);
})();
