/* The Journey of the Soul. Vanilla JS, no dependencies. */
(function () {
  'use strict';
  var root = document.documentElement;
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lang() { return root.lang === 'ur' ? 'ur' : 'en'; }
  var hooks = [];
  function applyLang() {
    var l = lang();
    document.querySelectorAll('[data-label-en]').forEach(function (el) {
      el.setAttribute('aria-label', el.getAttribute('data-label-' + l));
    });
    hooks.forEach(function (f) { f(); });
  }
  var langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.addEventListener('click', function () {
    var next = lang() === 'ur' ? 'en' : 'ur';
    root.lang = next; root.dir = next === 'ur' ? 'rtl' : 'ltr';
    store('ak-lang', next); applyLang();
  });
  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next); store('ak-theme', next);
  });
  var menuBtn = document.getElementById('menuBtn'), nav = document.getElementById('siteNav');
  if (menuBtn && nav) menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // ---------- Timeline (ARIA tabs) ----------
  var tl = document.getElementById('timeline');
  if (tl) {
    var tabs = [].slice.call(tl.querySelectorAll('[role="tab"]'));
    var panels = [].slice.call(tl.querySelectorAll('[role="tabpanel"]'));
    var bar = tl.querySelector('.tl-progress span');
    var count = tl.querySelector('.tl-count');
    var allBtn = tl.querySelector('[data-tl="all"]');
    var cur = 0;
    var update = function () {
      if (count) count.textContent = lang() === 'ur' ? ('مرحلہ ' + (cur + 1) + ' از ' + tabs.length) : ('Stage ' + (cur + 1) + ' of ' + tabs.length);
    };
    hooks.push(update);
    var select = function (i, focus, push) {
      cur = Math.max(0, Math.min(tabs.length - 1, i));
      tabs.forEach(function (t, j) {
        var on = j === cur;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (j <= cur) t.classList.add('seen');
      });
      if (!tl.classList.contains('all')) panels.forEach(function (p, j) { p.hidden = j !== cur; });
      if (bar) bar.style.width = ((cur + 1) / tabs.length * 100) + '%';
      update();
      if (focus) tabs[cur].focus();
      var tr = tl.querySelector('.tl-track'), t = tabs[cur];
      if (tr && tr.scrollWidth > tr.clientWidth) {
        var l = t.offsetLeft - tr.offsetLeft - (tr.clientWidth - t.offsetWidth) / 2;
        tr.scrollTo({ left: root.dir === 'rtl' ? -(tr.scrollWidth - tr.clientWidth - l) : l, behavior: 'smooth' });
      }
      if (push && history.replaceState) history.replaceState(null, '', '#' + tabs[cur].getAttribute('data-id'));
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, false, true); });
      t.addEventListener('keydown', function (e) {
        var rtl = root.dir === 'rtl', k = e.key;
        if (k === 'ArrowRight') { select(cur + (rtl ? -1 : 1), true, true); e.preventDefault(); }
        else if (k === 'ArrowLeft') { select(cur + (rtl ? 1 : -1), true, true); e.preventDefault(); }
        else if (k === 'Home') { select(0, true, true); e.preventDefault(); }
        else if (k === 'End') { select(tabs.length - 1, true, true); e.preventDefault(); }
      });
    });
    tl.querySelector('[data-tl="prev"]').addEventListener('click', function () { select(cur - 1, false, true); });
    tl.querySelector('[data-tl="next"]').addEventListener('click', function () { select(cur + 1, false, true); });
    allBtn.addEventListener('click', function () {
      var on = tl.classList.toggle('all');
      allBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      panels.forEach(function (p, j) { p.hidden = on ? false : j !== cur; });
    });
    var h = location.hash.replace('#', ''), start = 0;
    tabs.forEach(function (t, i) { if (t.getAttribute('data-id') === h) start = i; });
    select(start, false, false);
    window.addEventListener('hashchange', function () {
      var hh = location.hash.replace('#', '');
      tabs.forEach(function (t, i) { if (t.getAttribute('data-id') === hh && i !== cur) select(i, false, false); });
    });
  }

  // ---------- Pickers: one control set shows one pane; sets data-cur ----------
  document.querySelectorAll('.picker').forEach(function (pk) {
    var ctrls = [].slice.call(pk.querySelectorAll('[data-pick]')).filter(function (c) { return c.closest('.picker') === pk; });
    var panes = [].slice.call(pk.querySelectorAll('[data-pane]')).filter(function (c) { return c.closest('.picker') === pk; });
    var marks = pk.querySelectorAll('[data-mark]');
    function show(id) {
      pk.setAttribute('data-cur', id);
      panes.forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== id; });
      ctrls.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-pick') === id ? 'true' : 'false'); });
      marks.forEach(function (m) {
        var ids = (m.getAttribute('data-mark') || '').split(' ');
        m.classList.toggle('on', ids.indexOf(id) !== -1);
      });
    }
    ctrls.forEach(function (c) {
      c.addEventListener('click', function () { show(c.getAttribute('data-pick')); });
      if (c.tagName.toLowerCase() === 'g') c.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(c.getAttribute('data-pick')); }
      });
    });
    if (ctrls.length) show(pk.getAttribute('data-start') || ctrls[0].getAttribute('data-pick'));
  });

  // ---------- Steppers: layered diagrams ----------
  document.querySelectorAll('.stepper').forEach(function (sp) {
    var max = parseInt(sp.getAttribute('data-max'), 10);
    var range = sp.querySelector('input[type="range"]');
    var dots = sp.querySelectorAll('[data-go]');
    var infos = sp.querySelectorAll('[data-info]');
    var live = sp.querySelector('.step-live');
    var cur = 0, timer = null;
    function vis(el, n) {
      var f = el.getAttribute('data-from'), t = el.getAttribute('data-to'), o = el.getAttribute('data-only');
      if (o !== null) return o.split(' ').indexOf(String(n)) !== -1;
      var ok = true;
      if (f !== null) ok = ok && n >= parseInt(f, 10);
      if (t !== null) ok = ok && n <= parseInt(t, 10);
      return ok;
    }
    function go(n) {
      cur = Math.max(0, Math.min(max, n));
      sp.querySelectorAll('[data-from],[data-to],[data-only]').forEach(function (el) { el.classList.toggle('off', !vis(el, cur)); });
      infos.forEach(function (p) { p.hidden = parseInt(p.getAttribute('data-info'), 10) !== cur; });
      dots.forEach(function (d) { if (parseInt(d.getAttribute('data-go'), 10) === cur) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
      if (range) range.value = cur;
      sp.setAttribute('data-step', cur);
      if (live) { var p = sp.querySelector('[data-info="' + cur + '"] h3:not([hidden])'); var hs = sp.querySelectorAll('[data-info="' + cur + '"] h3'); var txt = ''; hs.forEach(function (x) { if (x.offsetParent !== null) txt = x.textContent; }); live.textContent = txt || (p ? p.textContent : ''); }
    }
    if (range) range.addEventListener('input', function () { go(parseInt(range.value, 10)); });
    dots.forEach(function (d) { d.addEventListener('click', function () { go(parseInt(d.getAttribute('data-go'), 10)); }); });
    var prev = sp.querySelector('[data-step-prev]'), next = sp.querySelector('[data-step-next]'), play = sp.querySelector('[data-step-play]');
    if (prev) prev.addEventListener('click', function () { go(cur - 1); });
    if (next) next.addEventListener('click', function () { go(cur + 1); });
    if (play) play.addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; play.setAttribute('aria-pressed', 'false'); return; }
      play.setAttribute('aria-pressed', 'true');
      if (cur >= max) go(0);
      timer = setInterval(function () {
        if (cur >= max) { clearInterval(timer); timer = null; play.setAttribute('aria-pressed', 'false'); return; }
        go(cur + 1);
      }, 2400);
    });
    go(0);
  });

  // ---------- Stone drop (Hell depth) ----------
  var dropBtn = document.getElementById('dropBtn');
  if (dropBtn) dropBtn.addEventListener('click', function () {
    var s = document.getElementById('shaft');
    if (s.classList.contains('drop')) { s.classList.remove('drop'); dropBtn.setAttribute('aria-pressed', 'false'); return; }
    s.classList.add('drop'); dropBtn.setAttribute('aria-pressed', 'true');
  });

  // ---------- Quran translation toggle ----------
  var hideTr = document.getElementById('hideTr');
  if (hideTr) hideTr.addEventListener('change', function () {
    document.getElementById('verses').classList.toggle('hide-tr', hideTr.checked);
  });

  // ---------- Reference filter ----------
  var f = document.getElementById('refFilter');
  if (f) f.addEventListener('input', function () {
    var q = f.value.trim().toLowerCase(), n = 0;
    document.querySelectorAll('#refTable tbody tr').forEach(function (tr) {
      var hide = q && tr.textContent.toLowerCase().indexOf(q) === -1;
      tr.hidden = !!hide; if (!hide) n++;
    });
    var c = document.getElementById('refCount');
    if (c) c.textContent = n;
  });
  document.querySelectorAll('[data-src-filter]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-src-filter'), n = 0;
      document.querySelectorAll('[data-src-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      if (f) f.value = '';
      document.querySelectorAll('#refTable tbody tr').forEach(function (tr) {
        var hide = v !== 'all' && tr.getAttribute('data-col') !== v;
        tr.hidden = hide; if (!hide) n++;
      });
      var c = document.getElementById('refCount'); if (c) c.textContent = n;
    });
  });

  applyLang();
})();
