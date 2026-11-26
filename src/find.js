// 名前で探す：上の検索窓（候補を出す）と find.html（全部の結果）
(() => {
  const BASE = '/';
  let data = null, loading = null;
  const load = () => loading || (loading = fetch(BASE + 'find.json').then(r => r.json()).then(d => {
    d.rows.forEach(r => { r.k = norm(r[2]); r.e = norm(r[3]); r.s = r[0] === 2 ? norm(r[5]) : ''; }); // r.s＝場所・ストーリー（クエスト・ミッション・だいじなものの分類）
    return (data = d);
  }));
  // ひらがな→カタカナ、全角英数→半角、大文字→小文字、空白・中黒などは無視
  const norm = s => (s || '').normalize('NFKC').toLowerCase()
    .replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/[\s・'’\-]/g, '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const url = r => BASE + (r[0] === 2 ? r[1] : (r[0] === 1 ? 'spell/' : 'item/') + r[1] + '.html');
  // 空白で区切った語をすべて含む物。分類の名前（「胴」「白魔法」など）にも当たる
  const search = (q, kindFilter) => {
    const words = q.split(/[\s　]+/).map(norm).filter(Boolean);
    if (!words.length || !data) return [];
    const out = [];
    for (const r of data.rows) {
      if (kindFilter != null && r[4] !== kindFilter) continue;
      const kind = norm(data.kinds[r[4]]);
      let score = 0, ok = true;
      for (const w of words) {
        const a = r.k.indexOf(w), b = r.e.indexOf(w);
        if (a < 0 && b < 0) { if (kind.includes(w) || (r.s && r.s.includes(w))) { score += 1; continue; } ok = false; break; }
        const pos = a >= 0 ? a : b, full = a >= 0 ? r.k : r.e;
        score += full === w ? 100 : pos === 0 ? 50 : 10;
      }
      if (ok) out.push([score, r]);
    }
    out.sort((x, y) => y[0] - x[0] || x[1][2].length - y[1][2].length || x[1][2].localeCompare(y[1][2], 'ja'));
    return out.map(x => x[1]);
  };
  const tag = r => `<span class="fk">${esc(data.kinds[r[4]])}</span>${r[5] ? `<span class="fl">${esc(r[5])}</span>` : ''}`;

  // ── 検索窓（上の窓と、トップの真ん中の大きい窓）
  const forms = [...document.querySelectorAll('.hfind')];
  for (const form of forms) {
    const input = form.querySelector('input'), box = document.createElement('div');
    box.className = 'hsug'; box.hidden = true; form.appendChild(box);
    let sel = -1, list = [];
    const show = () => {
      const q = input.value.trim();
      if (!q) { box.hidden = true; return; }
      if (!data) { load().then(show); box.innerHTML = '<div class="hs-msg">読み込み中…</div>'; box.hidden = false; return; }
      const all = search(q); list = all.slice(0, 10); sel = -1;
      box.innerHTML = list.length
        ? list.map((r, i) => `<a href="${url(r)}" data-i="${i}"><b>${esc(r[2])}</b><small>${esc(r[3])}</small>${tag(r)}</a>`).join('')
          + `<a class="hs-all" href="${BASE}find.html?q=${encodeURIComponent(q)}">「${esc(q)}」の結果をすべて見る（${all.length.toLocaleString()}件）</a>`
        : '<div class="hs-msg">見つかりません。ひらがな・英語・短い語でも試せます。</div>';
      box.hidden = false;
    };
    const mark = () => box.querySelectorAll('a[data-i]').forEach((a, i) => a.classList.toggle('on', i === sel));
    input.addEventListener('focus', () => { load(); if (input.value.trim()) show(); });
    input.addEventListener('input', show);
    input.addEventListener('keydown', e => {
      if (box.hidden || !list.length) return;
      if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, list.length - 1); mark(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, -1); mark(); e.preventDefault(); }
      else if (e.key === 'Enter' && sel >= 0) { location.href = url(list[sel]); e.preventDefault(); }
      else if (e.key === 'Escape') { box.hidden = true; }
    });
    document.addEventListener('click', e => { if (!form.contains(e.target)) box.hidden = true; });
    // トップの例のボタン：押すとその語で探す
    form.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); input.value = b.dataset.q; input.focus(); show(); }));
  }
  // 「/」キーで検索窓へ（トップは真ん中の大きい窓）
  document.addEventListener('keydown', e => {
    if (e.key === '/' && forms.length && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) { forms[forms.length - 1].querySelector('input').focus(); e.preventDefault(); }
  });

  // ── 一覧のページで #r-… の行へ飛んで光らせる（検索から来た時）
  const jump = () => {
    const m = location.hash.match(/^#r-(.+)$/); if (!m) return;
    let id; try { id = decodeURIComponent(m[1]); } catch (e) { return; }
    const row = document.querySelector('.r[data-id="' + CSS.escape(id) + '"]'); if (!row) return;
    document.querySelectorAll('.r.me').forEach(x => x.classList.remove('me'));
    row.hidden = false; row.classList.add('me');
    setTimeout(() => row.scrollIntoView({ block: 'center' }), 50);
  };
  window.addEventListener('hashchange', jump);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', jump); else jump();

  // ── find.html（結果をすべて）
  const res = document.getElementById('fres');
  if (res) {
    const fq = document.getElementById('fq'), cnt = document.getElementById('fcount'), kc = document.getElementById('fkinds');
    const params = new URLSearchParams(location.search);
    fq.value = params.get('q') || '';
    let kind = null, shown = 200;
    const draw = () => {
      const q = fq.value.trim();
      if (!q) { cnt.textContent = '名前の一部を入れてください。'; res.innerHTML = ''; kc.innerHTML = ''; return; }
      const all = search(q);
      // 分類ごとの件数のボタン
      const per = new Map(); for (const r of all) per.set(r[4], (per.get(r[4]) || 0) + 1);
      kc.innerHTML = all.length > 1 && per.size > 1 ? `<button class="chip${kind == null ? ' on' : ''}" data-k="">すべて ${all.length}</button>`
        + [...per].sort((a, b) => b[1] - a[1]).map(([k, n]) => `<button class="chip${kind === k ? ' on' : ''}" data-k="${k}">${esc(data.kinds[k])} ${n}</button>`).join('') : '';
      const list = kind == null ? all : all.filter(r => r[4] === kind);
      cnt.innerHTML = `「${esc(q)}」<b>${list.length.toLocaleString()}</b>件${list.length > shown ? `（上から${shown}件）` : ''}`;
      res.innerHTML = list.length ? '<div class="r h"><div class="c-n">名前</div><div>分類</div><div>Lv・場所など</div></div>'
        + list.slice(0, shown).map(r => `<div class="r"><div class="c-n"><a href="${url(r)}">${esc(r[2])}</a><small>${esc(r[3])}</small></div><div>${esc(data.kinds[r[4]])}</div><div>${esc(r[5] || '')}</div></div>`).join('')
        + (list.length > shown ? '<p class="more"><button id="fmore">もっと見る</button></p>' : '')
        : '<p class="nl" style="padding:12px">見つかりません。ひらがな・英語・短い語でも試せます。</p>';
    };
    kc.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; kind = b.dataset.k === '' ? null : +b.dataset.k; shown = 200; draw(); });
    res.addEventListener('click', e => { if (e.target.id === 'fmore') { shown += 400; draw(); } });
    fq.addEventListener('input', () => { kind = null; shown = 200; history.replaceState(null, '', fq.value.trim() ? '?q=' + encodeURIComponent(fq.value.trim()) : location.pathname); draw(); });
    fq.form.addEventListener('submit', e => { e.preventDefault(); });
    cnt.textContent = '読み込み中…';
    load().then(draw);
  }
})();
