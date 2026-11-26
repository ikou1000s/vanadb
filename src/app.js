// 装備の絞り込み（items.json を読んで、ジョブ・部位・性能で並べる）
(async function () {
  const $ = id => document.getElementById(id);
  const data = await fetch('items.json').then(r => r.json());
  const { meta } = data;
  const STATS = meta.stats; // [名前, 件数, 低い方が良い]
  const SLOT_JA = ['メイン', 'サブ', 'レンジ', '矢弾', '頭', '胴', '両手', '両脚', '両足', '首', '腰', '耳', '耳', '指', '指', '背'];
  const jobShort = new Map(meta.jobs.map(([id, s]) => [id, s]));
  const items = data.rows.map(r => {
    const st = {}, order = [];
    if (r[9]) for (const p of r[9].split(',')) { const [k, v] = p.split(':'); st[k] = Number(v); order.push(k); }
    return { id: r[0], name: r[1], lv: r[2], il: r[3], jobs: r[4], slots: r[5], skill: r[6], dmg: r[7], delay: r[8], st, order, pet: r[10], cond: r[11], en: r[12] };
  });

  const params = new URLSearchParams(location.search);
  const state = {
    jobs: new Set((params.get('job') || '').split(',').filter(Boolean)),
    slots: new Set((params.get('slot') || '').split(',').filter(Boolean)),
    skill: params.get('skill') || '', stat: params.get('stat') || '', dir: params.get('dir') || '',
    lvmin: Number(params.get('lvmin') || 1), lvmax: Number(params.get('lvmax') || 99), il: params.get('il') === '1', q: params.get('q') || '',
  };

  // 選択肢を作る
  for (const [id, s, ja] of meta.jobs) chip($('jobs'), s, ja, state.jobs, String(id));
  for (const [k, ja] of meta.slots) chip($('slots'), ja, ja, state.slots, ja);
  for (const s of meta.skills) $('skill').append(new Option(s, s));
  $('stat').append(new Option('（指定なし：IL・Lvの高い順）', ''));
  const COMMON = ['HP', 'MP', 'STR', 'DEX', 'VIT', 'AGI', 'INT', 'MND', 'CHR', '命中', '攻', '飛命', '飛攻', '魔命', '魔攻', '魔法ダメージ', '回避', '魔回避', '魔防', '防',
    'ヘイスト%', 'ダブルアタック%', 'トリプルアタック%', 'クワッドアタック%', 'ストアTP', '二刀流', 'クリティカルヒット%', 'クリティカルヒットダメージ%', 'ウェポンスキルのダメージ%', 'TPボーナス', '物理ダメージ上限%', '連携ボーナス', 'モクシャ', 'リゲイン',
    '被ダメージ%', '被物理ダメージ%', '被魔法ダメージ%', '被物理ダメージII%', '敵対心', 'ファストキャスト%', 'ケアル回復量%', 'ケアル回復量II%', 'マジックバーストダメージ', 'マジックバーストダメージII', 'コンサーブMP', 'リフレシュ', 'リジェネ',
    'スナップショット', 'ラピッドショット', '移動速度%', '魔法クリティカルヒット%', '歌の詠唱時間%', '全歌', 'カウンター'];
  const g1 = document.createElement('optgroup'); g1.label = 'よく使う性能';
  const g2 = document.createElement('optgroup'); g2.label = 'そのほか（多い順）';
  const label = (n, c) => `${n.replace(/%$/, '')}${/%$/.test(n) ? '（%）' : ''}　${c}件`;
  const idxOf = new Map(STATS.map(([n], i) => [n, i]));
  for (const n of COMMON) if (idxOf.has(n)) g1.append(new Option(label(n, STATS[idxOf.get(n)][1]), String(idxOf.get(n))));
  STATS.forEach(([n, c], i) => { if (c >= 5 && !COMMON.includes(n)) g2.append(new Option(label(n, c), String(i))); });
  $('stat').append(g1, g2);
  const statByName = new Map(STATS.map(([n], i) => [n, String(i)]));
  if (state.stat && !/^\d+$/.test(state.stat)) state.stat = statByName.get(state.stat) || '';
  $('stat').value = state.stat; $('skill').value = state.skill;
  $('lvmin').value = state.lvmin; $('lvmax').value = state.lvmax; $('il').checked = state.il; $('q').value = state.q;
  $('dir').value = state.dir || (state.stat && STATS[state.stat][2] ? 'asc' : 'desc');

  function chip(box, label, title, set, val) {
    const b = document.createElement('span');
    b.className = 'chip' + (set.has(val) ? ' on' : ''); b.textContent = label; b.title = title;
    b.onclick = () => { set.has(val) ? set.delete(val) : set.add(val); b.classList.toggle('on'); render(true); };
    box.append(b);
  }
  $('stat').onchange = () => { state.stat = $('stat').value; $('dir').value = state.stat && STATS[state.stat][2] ? 'asc' : 'desc'; render(true); };
  for (const id of ['skill', 'dir', 'lvmin', 'lvmax', 'il', 'q']) $(id).addEventListener(id === 'q' ? 'input' : 'change', () => render(true));

  const slotMask = new Map(meta.slots.map(([, ja, m]) => [ja, m]));
  let shown = 0, result = [];
  const slotNames = m => [...new Set(SLOT_JA.filter((_, i) => m & (1 << i)))].join('・');
  const jobNames = m => { const js = meta.jobs.filter(([id]) => m & (1 << id)); return js.length >= 22 ? '全ジョブ' : js.map(([, s]) => s).join(''); };

  function render(reset) {
    state.skill = $('skill').value; state.dir = $('dir').value; state.il = $('il').checked; state.q = $('q').value.trim();
    state.lvmin = Number($('lvmin').value) || 1; state.lvmax = Number($('lvmax').value) || 99;
    const jm = [...state.jobs].reduce((a, j) => a | (1 << Number(j)), 0);
    const sm = [...state.slots].reduce((a, s) => a | slotMask.get(s), 0);
    const q = state.q.toLowerCase();
    const sk = state.stat;
    result = items.filter(it =>
      (!jm || it.jobs & jm) && (!sm || it.slots & sm) && (!state.skill || it.skill === state.skill) &&
      it.lv >= state.lvmin && it.lv <= state.lvmax && (!state.il || it.il) &&
      (!q || it.name.includes(state.q) || it.en.toLowerCase().includes(q)) && (sk === '' || sk in it.st));
    const asc = state.dir === 'asc';
    result.sort(sk === '' ? (a, b) => b.il - a.il || b.lv - a.lv || a.id - b.id
      : (a, b) => (asc ? a.st[sk] - b.st[sk] : b.st[sk] - a.st[sk]) || b.il - a.il || b.lv - a.lv);
    if (reset) { shown = 0; $('list').innerHTML = ''; saveUrl(); }
    const next = result.slice(shown, shown + 60);
    $('list').insertAdjacentHTML('beforeend', next.map(card).join(''));
    shown += next.length;
    $('count').textContent = `${result.length.toLocaleString()}件（全${items.length.toLocaleString()}件）`;
    $('more').hidden = shown >= result.length;
  }
  $('more').onclick = () => render(false);

  function card(it) {
    const kind = it.skill || slotNames(it.slots);
    const sk = state.stat;
    const v = sk !== '' ? `<span class="v">${STATS[sk][0].replace(/%$/, '')} ${fmt(it.st[sk])}${/%$/.test(STATS[sk][0]) ? '%' : ''}</span>` : '';
    const st = it.order.slice(0, 16).map(k => [k, it.st[k]]).map(([k, val]) => {
      const n = STATS[k][0];
      return n === '防' ? `防${val}` : `${n.replace(/%$/, '')}${fmt(val)}${/%$/.test(n) ? '%' : ''}`;
    }).join(' ');
    return `<div class="card">${v}<a class="nm" href="item/${it.id}.html">${esc(it.name)}</a><span class="k">${esc(kind)}・Lv${it.lv}${it.il ? '・IL' + it.il : ''}・${jobNames(it.jobs)}</span>`
      + `<div class="s">${it.dmg ? `D${it.dmg} 隔${it.delay} ` : ''}${esc(st)}${it.pet ? ' <b>＋ペット</b>' : ''}${it.cond ? ' <b>＋条件付き</b>' : ''}</div></div>`;
  }
  const fmt = v => (v > 0 ? '+' : '') + v;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function saveUrl() {
    const p = new URLSearchParams();
    if (state.jobs.size) p.set('job', [...state.jobs].join(','));
    if (state.slots.size) p.set('slot', [...state.slots].join(','));
    if (state.skill) p.set('skill', state.skill);
    if (state.stat !== '') p.set('stat', STATS[state.stat][0]);
    if (state.lvmin !== 1) p.set('lvmin', state.lvmin);
    if (state.lvmax !== 99) p.set('lvmax', state.lvmax);
    if (state.il) p.set('il', '1');
    if (state.q) p.set('q', state.q);
    history.replaceState(null, '', p.toString() ? '?' + p : location.pathname);
  }
  render(true);
})();
