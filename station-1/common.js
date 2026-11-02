/* Gemeinsamer Rahmen aller Stations-Exponate (Laden, Kopf, Widerspruch, Quellen, Ziehen/Tippen). */
(function () {
  'use strict';
  var NA = (window.NahostStation = {});
  NA.station = Number(document.body.getAttribute('data-station'));

  NA.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  NA.icon = function (name, cls) {
    return '<svg class="ic ' + (cls || '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  };
  NA.mischen = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  NA.sicherUrl = function (u) {
    u = String(u || '').trim();
    return /^https?:\/\//i.test(u) ? u : '';
  };

  var ansageEl = null;
  NA.ansage = function (text) {
    if (!ansageEl) ansageEl = document.getElementById('ansage');
    if (!ansageEl) return;
    ansageEl.textContent = '';
    setTimeout(function () { ansageEl.textContent = text; }, 30);
  };

  var meldungTimer = null;
  NA.meldung = function (html, dauer) {
    var m = document.getElementById('meldung');
    if (!m) return;
    m.innerHTML = '<p>' + html + '</p>';
    m.classList.remove('zeigt');
    void m.offsetWidth;
    m.classList.add('zeigt');
    clearTimeout(meldungTimer);
    meldungTimer = setTimeout(function () { m.classList.remove('zeigt'); }, dauer || 4200);
    NA.ansage(m.textContent);
  };

  NA.ladeInhalt = function () {
    var p = new URLSearchParams(location.search);
    if (p.get('vorschau') === '1') {
      try {
        var s = localStorage.getItem('nahost-vorschau-' + NA.station);
        if (s) { var v = JSON.parse(s); v._vorschau = true; return Promise.resolve(v); }
      } catch (e) { /* weiter mit Datei */ }
    }
    var fallback = function () {
      var d = JSON.parse(document.getElementById('inhalt-fallback').textContent);
      d._fallback = true;
      return d;
    };
    if (location.protocol === 'file:') return Promise.resolve(fallback());
    return fetch('inhalt.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { if (!d || Number(d.station) !== NA.station) throw new Error('falsche Station'); return d; })
      .catch(fallback);
  };

  function setzeText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }

  NA.rahmen = function (d) {
    setzeText('titel', d.titel);
    setzeText('leitfrage', d.leitfrage);
    setzeText('anleitung-text', d.anleitung);
    document.title = 'Station ' + NA.station + ' – ' + (d.titel || 'Nahost-Ausstellung');
    var muster = document.getElementById('muster');
    if (muster) {
      if (d._vorschau) {
        muster.hidden = false;
        muster.classList.add('vorschau-hinweis');
        muster.textContent = 'Vorschau aus dem Baukasten – noch nicht veröffentlicht';
      } else {
        muster.hidden = !d.muster;
      }
    }
    var w = d.widerspruch || {};
    setzeText('w-isr', w.israelisch);
    setzeText('w-pal', w.palaestinensisch);
    setzeText('w-einordnung', w.einordnung);
    var ein = document.getElementById('w-einordnung-box');
    if (ein) ein.hidden = !w.einordnung;

    var ol = document.getElementById('quellen-liste');
    if (ol) {
      ol.innerHTML = (d.quellen || []).filter(function (q) { return q && (q.titel || q.url); }).map(function (q) {
        var url = NA.sicherUrl(q.url);
        var titel = NA.esc(q.titel || q.url);
        var link = url ? '<a href="' + NA.esc(url) + '" target="_blank" rel="noopener">' + titel + '</a>' : titel;
        var meta = [q.herausgeber, q.datum].filter(Boolean).map(NA.esc).join(', ');
        return '<li>' + link + (meta ? '<span>' + meta + '</span>' : '') + '</li>';
      }).join('');
    }
    var eq = d.eigeneQuelle || {};
    var box = document.getElementById('eigene-quelle');
    if (box) {
      if (eq.titel || eq.url) {
        var u = NA.sicherUrl(eq.url);
        box.hidden = false;
        box.innerHTML = '<b>Eigene Quelle der Gruppe</b>' +
          '<span>' + (u ? '<a href="' + NA.esc(u) + '" target="_blank" rel="noopener">' + NA.esc(eq.titel || u) + '</a>' : NA.esc(eq.titel)) + '</span>' +
          (eq.begruendung ? '<span class="hand">Warum vertrauenswürdig? ' + NA.esc(eq.begruendung) + '</span>' : '');
      } else {
        box.hidden = true;
      }
    }
  };

  /* Ziehen ODER Antippen: cfg = {wurzel, item, ziel, ablegen(itemEl, zielEl)} */
  NA.ziehen = function (cfg) {
    var wurzel = cfg.wurzel;
    var gewaehlt = null;
    var zug = null;
    var klickSperre = false;

    function waehle(el) {
      if (gewaehlt) { gewaehlt.classList.remove('gewaehlt'); gewaehlt.setAttribute('aria-pressed', 'false'); }
      gewaehlt = el && el !== gewaehlt ? el : null;
      if (gewaehlt) {
        gewaehlt.classList.add('gewaehlt');
        gewaehlt.setAttribute('aria-pressed', 'true');
        wurzel.classList.add('hat-auswahl');
        NA.ansage('Ausgewählt: ' + gewaehlt.textContent.trim().slice(0, 80) + '. Tippe jetzt auf einen Platz.');
      } else {
        wurzel.classList.remove('hat-auswahl');
      }
    }
    function zielUnter(x, y) {
      var el = document.elementFromPoint(x, y);
      var z = el && el.closest(cfg.ziel);
      return z && wurzel.contains(z) && !z.classList.contains('fest') ? z : null;
    }
    function markiere(z) {
      if (zug.ziel === z) return;
      if (zug.ziel) zug.ziel.classList.remove('ziel-aktiv');
      zug.ziel = z;
      if (z) z.classList.add('ziel-aktiv');
    }
    function aufraeumen() {
      if (!zug) return;
      if (zug.geist) zug.geist.remove();
      zug.it.classList.remove('wird-gezogen');
      if (zug.ziel) zug.ziel.classList.remove('ziel-aktiv');
      zug = null;
    }
    wurzel.addEventListener('pointerdown', function (e) {
      var it = e.target.closest(cfg.item);
      if (!it || !wurzel.contains(it) || it.disabled || e.button > 0) return;
      zug = { it: it, x: e.clientX, y: e.clientY, id: e.pointerId, aktiv: false, geist: null, ziel: null, dx: 0, dy: 0 };
    });
    window.addEventListener('pointermove', function (e) {
      if (!zug || e.pointerId !== zug.id) return;
      if (!zug.aktiv) {
        if (Math.hypot(e.clientX - zug.x, e.clientY - zug.y) < 8) return;
        zug.aktiv = true;
        if (gewaehlt) waehle(null);
        var r = zug.it.getBoundingClientRect();
        zug.dx = zug.x - r.left; zug.dy = zug.y - r.top;
        var g = zug.it.cloneNode(true);
        g.classList.add('geist'); g.classList.remove('gewaehlt');
        g.removeAttribute('id');
        g.setAttribute('aria-hidden', 'true');
        g.style.width = r.width + 'px';
        document.body.appendChild(g);
        zug.geist = g;
        zug.it.classList.add('wird-gezogen');
      }
      e.preventDefault();
      zug.geist.style.transform = 'translate(' + (e.clientX - zug.dx) + 'px,' + (e.clientY - zug.dy) + 'px) rotate(3deg)';
      markiere(zielUnter(e.clientX, e.clientY));
    }, { passive: false });
    window.addEventListener('pointerup', function (e) {
      if (!zug || e.pointerId !== zug.id) return;
      if (!zug.aktiv) { zug = null; return; }
      var it = zug.it, z = zielUnter(e.clientX, e.clientY);
      aufraeumen();
      klickSperre = true;
      setTimeout(function () { klickSperre = false; }, 60);
      if (z && !(it.parentElement && it.parentElement.closest(cfg.ziel) === z)) cfg.ablegen(it, z);
    });
    window.addEventListener('pointercancel', aufraeumen);

    wurzel.addEventListener('click', function (e) {
      if (klickSperre) { e.preventDefault(); return; }
      var it = e.target.closest(cfg.item);
      var z = e.target.closest(cfg.ziel);
      if (z && !wurzel.contains(z)) z = null;
      var heimat = gewaehlt && gewaehlt.parentElement ? gewaehlt.parentElement.closest(cfg.ziel) : null;
      if (z && heimat === z) z = null;
      if (it && wurzel.contains(it)) {
        if (gewaehlt && gewaehlt !== it && z && !z.classList.contains('fest')) {
          var g0 = gewaehlt; waehle(null); cfg.ablegen(g0, z);
        } else {
          waehle(it);
        }
        return;
      }
      if (z && gewaehlt && !z.classList.contains('fest')) {
        var g = gewaehlt; waehle(null); cfg.ablegen(g, z);
      } else if (z && !gewaehlt && !z.classList.contains('fest') && z.id !== 'stapel') {
        NA.ansage('Wähle zuerst eine Karte aus.');
      }
    });
    wurzel.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var z = e.target.closest(cfg.ziel);
      if (z && e.target === z && z.tagName !== 'BUTTON') { e.preventDefault(); z.click(); }
      if (e.key === 'Escape') waehle(null);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') waehle(null); });
    return { abwaehlen: function () { waehle(null); } };
  };

  NA.start = function (init) {
    NA.ladeInhalt().then(function (d) {
      NA.rahmen(d);
      init(d);
    }).catch(function (err) {
      var s = document.getElementById('spiel');
      if (s) s.innerHTML = '<div class="karte fehler-karte"><h2>Inhalt konnte nicht geladen werden</h2><p>Bitte die Datei inhalt.json prüfen (' + NA.esc(err && err.message) + ').</p></div>';
    });
  };
})();
