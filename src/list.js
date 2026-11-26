// 一覧ページ：ジョブで絞る（?job=番号 でも開ける）
(function () {
  var box = document.querySelector('.jfilter');
  if (!box) return;
  var rows = [].slice.call(document.querySelectorAll('.tbl .r:not(.h)'));
  var bands = [].slice.call(document.querySelectorAll('.tbl .band'));
  var navs = [].slice.call(document.querySelectorAll('.bands a'));
  var none = document.querySelector('.none');
  function apply(job) {
    var bit = job ? (1 << Number(job)) : 0, shown = 0;
    rows.forEach(function (r) { var ok = !bit || (Number(r.getAttribute('data-j')) & bit); r.hidden = !ok; if (ok) shown++; });
    // 帯ごとの件数と、空の帯を隠す
    bands.forEach(function (b) {
      var n = 0, el = b.nextElementSibling;
      while (el && !el.classList.contains('band')) { if (!el.hidden) n++; el = el.nextElementSibling; }
      b.hidden = !n; b.querySelector('span').textContent = n + '件';
      navs.forEach(function (a) { if (a.getAttribute('data-band') === b.getAttribute('data-band')) { a.hidden = !n; a.querySelector('span').textContent = n; } });
    });
    [].forEach.call(box.querySelectorAll('button'), function (x) { x.classList.toggle('on', x.getAttribute('data-job') === (job || '')); });
    if (none) none.hidden = shown > 0;
    var u = new URL(location.href);
    if (job) u.searchParams.set('job', job); else u.searchParams.delete('job');
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  }
  box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) apply(b.getAttribute('data-job')); });
  var p = new URLSearchParams(location.search).get('job');
  if (p) apply(p);
})();
