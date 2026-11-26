// 食事の効果で探す（window.FOOD を読んで、効果の大きい順に表で並べる）
(function () {
  var F = window.FOOD, $ = function (id) { return document.getElementById(id); };
  var cur = { k: '', pet: false };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var pretty = function (k) { return k.replace(/%$/, ''); };
  var fmt = function (k, a) { return (a[0] > 0 ? '+' : '') + a[0] + (/%$/.test(k) ? '%' : '') + (a[1] != null ? '<small>（最大' + a[1] + '）</small>' : ''); };
  var btns = [];
  function addRow(label, list, pet) {
    var row = document.createElement('div'); row.className = 'sg';
    row.innerHTML = '<span class="sgl">' + label + '</span>';
    list.forEach(function (x) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip';
      b.textContent = pretty(x[0]) + (/%$/.test(x[0]) ? '%' : ''); b.title = x[1] + '品';
      b.onclick = function () { var same = cur.k === x[0] && cur.pet === pet; cur = same ? { k: '', pet: false } : { k: x[0], pet: pet }; mark(); render(); };
      b._k = x[0]; b._pet = pet; btns.push(b); row.appendChild(b);
    });
    $('fpick').appendChild(row);
  }
  F.genres.forEach(function (g) { addRow(g[0], g[1], false); });
  if (F.pet.length) addRow('ペット', F.pet, true);
  function mark() { btns.forEach(function (b) { b.classList.toggle('on', b._k === cur.k && b._pet === cur.pet); }); }
  var p = new URLSearchParams(location.search);
  if (p.get('stat')) { cur = { k: p.get('stat'), pet: p.get('pet') === '1' }; mark(); }
  if (p.get('q')) $('fq').value = p.get('q');
  $('fq').addEventListener('input', render);

  function render() {
    var q = $('fq').value.trim(), ql = q.toLowerCase(), k = cur.k, pet = cur.pet;
    var list = F.foods.filter(function (f) {
      var m = pet ? f.p : f.s;
      return (!k || m[k]) && (!q || f.n.indexOf(q) >= 0 || (f.e || '').toLowerCase().indexOf(ql) >= 0);
    });
    if (k) list.sort(function (a, b) {
      var x = (pet ? a.p : a.s)[k], y = (pet ? b.p : b.s)[k];
      var cx = x[1] != null ? x[1] : x[0], cy = y[1] != null ? y[1] : y[0];
      return (cy - cx) || (y[0] - x[0]) || a.n.localeCompare(b.n, 'ja');
    });
    else list.sort(function (a, b) { return a.n.localeCompare(b.n, 'ja'); });
    var head = '<div class="r h' + (k ? ' hasv' : '') + '"><div class="c-n">名前</div>' + (k ? '<div class="c-v">' + esc((pet ? 'ペット：' : '') + pretty(k)) + '</div>' : '') + '<div class="c-fx">効果（ゲーム内の表記）</div></div>';
    $('flist').innerHTML = head + list.map(function (f) {
      var m = pet ? f.p : f.s;
      return '<div class="r' + (k ? ' hasv' : '') + '"><div class="c-n"><a href="item/' + f.i + '.html">' + esc(f.n) + '</a><small>' + esc(f.e || '') + '</small></div>'
        + (k ? '<div class="c-v">' + fmt(k, m[k]) + '</div>' : '') + '<div class="c-fx">' + esc(f.d) + '</div></div>';
    }).join('');
    $('fcount').innerHTML = '<b>' + list.length + '</b>品（全' + F.foods.length + '品）' + (k ? '　<b>' + esc((pet ? 'ペット：' : '') + pretty(k)) + '</b> の大きい順' : '');
    var u = new URL(location.href);
    if (k) { u.searchParams.set('stat', k); if (pet) u.searchParams.set('pet', '1'); else u.searchParams.delete('pet'); } else { u.searchParams.delete('stat'); u.searchParams.delete('pet'); }
    if (q) u.searchParams.set('q', q); else u.searchParams.delete('q');
    history.replaceState(null, '', u.pathname + u.search);
  }
  render();
})();
