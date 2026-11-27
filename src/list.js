// 一覧ページ：ジョブで絞る（?job=番号）＋チェック欄（やり忘れ・取り忘れの確認。チェックはこのブラウザに残る）
(function () {
  var tables = [].slice.call(document.querySelectorAll('.tbl[data-ck]'));
  var box = document.querySelector('.jfilter');
  var job = '', mode = 'all';
  var store = {
    get: function (ns) { try { return JSON.parse(localStorage.getItem('vanadb:ck:' + ns) || '{}'); } catch (e) { return {}; } },
    set: function (ns, v) { try { localStorage.setItem('vanadb:ck:' + ns, JSON.stringify(v)); } catch (e) {} },
  };
  try { mode = localStorage.getItem('vanadb:ckmode') || 'all'; } catch (e) {}

  // チェック欄を足す
  tables.forEach(function (t) {
    var ns = t.getAttribute('data-ck'), saved = store.get(ns);
    t.classList.add('cktbl');
    [].forEach.call(t.querySelectorAll('.r[data-id]'), function (r) {
      var c = document.createElement('input');
      c.type = 'checkbox'; c.className = 'ckb'; c.title = 'チェック（このブラウザに残ります）';
      c.checked = !!saved[r.getAttribute('data-id')];
      r.classList.toggle('done', c.checked);
      c.addEventListener('change', function () {
        var s = store.get(ns);
        if (c.checked) s[r.getAttribute('data-id')] = 1; else delete s[r.getAttribute('data-id')];
        store.set(ns, s); r.classList.toggle('done', c.checked); apply();
      });
      var n = r.querySelector('.c-n'); if (n) n.insertBefore(c, n.firstChild);
    });
  });

  // チェックのバー（件数・表示の切り替え）
  var bar = null;
  if (tables.length) {
    bar = document.createElement('div');
    bar.className = 'ckbar';
    bar.innerHTML = '<span class="ckn"></span><button type="button" data-mode="all">全部</button><button type="button" data-mode="todo">まだの物だけ</button><button type="button" data-mode="done">チェック済みだけ</button><span class="ckio"><button type="button" class="cksave" title="このサイトの全部のチェックを1つのファイルに保存します">記録をファイルに保存</button><button type="button" class="ckload" title="保存したファイルからチェックを戻します（今のチェックは消えません）">ファイルから戻す</button><input type="file" accept=".json,application/json" hidden></span><span class="ckh">チェックはこのブラウザに残ります。キャッシュを消す前や、別の端末・ブラウザに移す時は「記録をファイルに保存」</span>';
    var first = tables[0];
    (document.querySelector('.bands') || first).insertAdjacentElement('beforebegin', bar);
    // チェックの記録をファイルに保存・ファイルから戻す（このサイトの全部のページの分をまとめて）
    bar.querySelector('.cksave').addEventListener('click', function () {
      var data = {}, n = 0;
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('vanadb:ck:') === 0) { var v = JSON.parse(localStorage.getItem(k) || '{}'); data[k.slice(10)] = v; n += Object.keys(v).length; } } } catch (x) {}
      if (!n) { alert('まだチェックがありません。'); return; }
      var d = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; };
      var blob = new Blob([JSON.stringify({ app: 'vanadb-check', ver: 1, saved: d.toISOString(), count: n, data: data }, null, 1)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'vanadb-check-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '.json';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    });
    var fileIn = bar.querySelector('input[type=file]');
    bar.querySelector('.ckload').addEventListener('click', function () { fileIn.value = ''; fileIn.click(); });
    fileIn.addEventListener('change', function () {
      var f = fileIn.files && fileIn.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var j; try { j = JSON.parse(rd.result); } catch (x) { j = null; }
        if (!j || j.app !== 'vanadb-check' || !j.data) { alert('ヴァナDBのチェックの記録ファイルではないようです。'); return; }
        var add = 0;
        Object.keys(j.data).forEach(function (ns) {
          if (!/^[\w-]+$/.test(ns)) return;
          var cur = store.get(ns), v = j.data[ns] || {};
          Object.keys(v).forEach(function (id) { if (!cur[id]) { cur[id] = 1; add++; } });
          store.set(ns, cur);
        });
        alert('チェックを ' + add + ' 件戻しました（もともと付いていた物はそのままです）。');
        location.reload();
      };
      rd.readAsText(f);
    });
    bar.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b || !b.hasAttribute('data-mode')) return; mode = b.getAttribute('data-mode'); try { localStorage.setItem('vanadb:ckmode', mode); } catch (x) {} apply(); });
  }

  // 名前で絞る（input.tfilter の data-for＝表の id）
  var tf = {};
  [].forEach.call(document.querySelectorAll('.tfilter'), function (inp) {
    inp.addEventListener('input', function () { tf[inp.getAttribute('data-for')] = inp.value.trim().toLowerCase(); apply(); });
  });
  function apply() {
    var bit = job ? (1 << Number(job)) : 0, shown = 0, total = 0, done = 0;
    [].forEach.call(document.querySelectorAll('.tbl .r:not(.h)'), function (r) {
      var okJob = !bit || !r.hasAttribute('data-j') || (Number(r.getAttribute('data-j')) & bit);
      var t = r.parentNode, q = t && t.id ? tf[t.id] : '';
      var okQ = !q || r.textContent.toLowerCase().indexOf(q) >= 0;
      var isDone = r.classList.contains('done');
      if (okJob && r.hasAttribute('data-id')) { total++; if (isDone) done++; }
      var okMode = mode === 'all' || !r.hasAttribute('data-id') || (mode === 'done' ? isDone : !isDone);
      r.hidden = !(okJob && okMode && okQ); if (!r.hidden) shown++;
    });
    // 帯ごとの件数と、空の帯を隠す
    [].forEach.call(document.querySelectorAll('.tbl .band'), function (b) {
      var n = 0, el = b.nextElementSibling;
      while (el && !el.classList.contains('band')) { if (!el.hidden && el.classList.contains('r')) n++; el = el.nextElementSibling; }
      b.hidden = !n; var sp = b.querySelector('span'); if (sp) sp.textContent = n + '件';
      [].forEach.call(document.querySelectorAll('.bands a'), function (a) { if (a.getAttribute('data-band') === b.getAttribute('data-band')) { a.hidden = !n; a.querySelector('span').textContent = n; } });
    });
    if (box) [].forEach.call(box.querySelectorAll('button'), function (x) { x.classList.toggle('on', x.getAttribute('data-job') === (job || '')); });
    if (bar) {
      bar.querySelector('.ckn').innerHTML = 'チェック済み <b>' + done + '</b> / ' + total + '件';
      [].forEach.call(bar.querySelectorAll('button'), function (x) { x.classList.toggle('on', x.getAttribute('data-mode') === mode); });
    }
    var none = document.querySelector('.none'); if (none) none.hidden = shown > 0;
  }
  if (box) box.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; job = b.getAttribute('data-job') || '';
    var u = new URL(location.href); if (job) u.searchParams.set('job', job); else u.searchParams.delete('job');
    history.replaceState(null, '', u.pathname + u.search + u.hash); apply();
  });
  job = new URLSearchParams(location.search).get('job') || '';
  apply();
})();
