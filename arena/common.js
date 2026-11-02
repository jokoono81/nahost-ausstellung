/* Quiz-Arena „Konfliktanalyse Nahost“ – gemeinsame Bausteine für Host, Spieler und Exit-Feedback.
   Keine Namen, keine IP-Adressen: gespeichert werden nur Zahlenwerte, Zeitpunkte und kurze Freitexte. */
(function () {
  'use strict';

  var skript = document.currentScript;
  var ARENA_BASIS = new URL('.', skript ? skript.src : location.href).href;

  var NA = {};
  NA.PREFIX = 'meg-nahost-2026-';
  NA.FEEDBACK_ID = 'meg-nahost-2026-feedback';
  NA.SPIEL_URL = 'https://jokoono81.github.io/nahost-ausstellung/arena/spielen.html?raum=';
  NA.PEER_CDN = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
  NA.PEER_SRI = 'sha384-nlUQ8ZqCbvStErob+biJNzSgltf6urV3VGqhfIfzhmg9RXmpeRm76ELw0pYnKlTR';
  NA.PEER_LOKAL = ARENA_BASIS + 'vendor/peerjs.min.js';
  NA.ARENA_BASIS = ARENA_BASIS;

  NA.STATIONEN = {
    1: 'Konfliktinhalt',
    2: 'Konfliktverlauf',
    3: 'Konfliktstrukturen',
    4: 'Konfliktprognose',
    5: 'Wahrnehmung und Beurteilung'
  };

  /* ---------- Formen: eigene SVG, gleiche Strichstärke ---------- */
  var FORM_PFADE = [
    'M10 2.5 L18.6 17.4 Q10.2 18.4 1.6 17.1 Z',
    'M10 1.4 L18.4 10.3 L9.8 18.7 L1.7 9.8 Z',
    'M10 1.8 C15.2 1.6 18.4 5.4 18.2 10.3 C18 15.1 14.6 18.4 9.7 18.2 C4.9 18 1.6 14.7 1.8 9.9 C2 5.2 5.4 2 10 1.8 Z',
    'M2.4 2.6 L17.6 2.1 L17.9 17.6 L2.1 17.8 Z'
  ];
  NA.FORM_NAMEN = ['Dreieck', 'Raute', 'Kreis', 'Quadrat'];
  NA.FORM_KARTE = [
    { farbe: 'gelb', form: '' },
    { farbe: 'blau', form: 'oval' },
    { farbe: 'apricot', form: 'wolke' },
    { farbe: 'rose', form: '' }
  ];
  NA.formSvg = function (i, klasse) {
    return '<svg class="form ' + (klasse || '') + '" viewBox="0 0 20 20" aria-hidden="true" focusable="false">' +
      '<path d="' + FORM_PFADE[i] + '" fill="none" stroke="#1d1d1b" stroke-width="2.4" stroke-linejoin="round"/></svg>';
  };

  NA.formSvgInline = function (i) { return NA.formSvg(i, 'inline'); };

  var ICON = {
    haken: '<path d="M4 10.5 L8.2 14.6 L16.2 5.4"/>',
    kreuz: '<path d="M5 5 L15 15 M15 5 L5 15"/>',
    wuerfel: '<rect x="3" y="3" width="14" height="14" rx="3"/><circle cx="7" cy="7" r=".9" fill="currentColor"/><circle cx="13" cy="13" r=".9" fill="currentColor"/><circle cx="10" cy="10" r=".9" fill="currentColor"/>',
    pfeil: '<path d="M4 10 H16 M11 5 L16 10 L11 15"/>',
    zurueck: '<path d="M16 10 H4 M9 5 L4 10 L9 15"/>',
    tablet: '<rect x="4" y="2.5" width="12" height="15" rx="2"/><path d="M8.5 15 H11.5"/>',
    team: '<circle cx="7" cy="7" r="2.6"/><circle cx="13.5" cy="8" r="2.2"/><path d="M2.5 16.5 C3 12.8 5 11.5 7 11.5 C9 11.5 11 12.8 11.5 16.5 M11.5 12 C12.2 11.6 12.8 11.5 13.5 11.5 C15.5 11.5 17 12.8 17.5 16"/>',
    computer: '<rect x="3" y="3.5" width="14" height="10" rx="1.5"/><path d="M7 17 H13 M10 13.5 V17"/>',
    neu: '<path d="M15.5 8 A6 6 0 1 0 16 11.5"/><path d="M16 3.5 V8 H11.5"/>',
    pokal: '<path d="M6 3 H14 V7.5 C14 10 12.2 11.8 10 11.8 C7.8 11.8 6 10 6 7.5 Z M6 5 H3.5 C3.5 7.5 4.6 8.6 6.2 8.8 M14 5 H16.5 C16.5 7.5 15.4 8.6 13.8 8.8 M10 11.8 V14.5 M6.5 17 H13.5 L12.8 14.5 H7.2 Z"/>',
    stern: '<path d="M10 2.6 L12.2 7.4 L17.3 7.9 L13.4 11.3 L14.6 16.4 L10 13.7 L5.4 16.4 L6.6 11.3 L2.7 7.9 L7.8 7.4 Z"/>',
    quelle: '<path d="M5 2.5 H12 L15.5 6 V17.5 H5 Z M12 2.5 V6 H15.5 M7.5 10 H13 M7.5 13 H13"/>'
  };
  NA.icon = function (name, klasse) {
    return '<svg class="icon ' + (klasse || '') + '" viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICON[name] + '</svg>';
  };

  /* Smileys 1 (gar nicht) … 5 (sehr) – Mund und Augen, gleiche Strichstärke */
  var MUND = [
    'M6.2 14.6 C8 12.2 12 12.2 13.8 14.6',
    'M6.5 14 C8.5 12.9 11.5 12.9 13.5 14',
    'M6.5 13.4 H13.5',
    'M6.5 12.8 C8.5 14 11.5 14 13.5 12.8',
    'M6 12.2 C7.6 15.4 12.4 15.4 14 12.2'
  ];
  NA.smiley = function (wert) {
    return '<svg class="smiley" viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
      '<circle cx="10" cy="10" r="8.2"/><circle cx="7.2" cy="8" r=".8" fill="currentColor"/><circle cx="12.8" cy="8" r=".8" fill="currentColor"/>' +
      '<path d="' + MUND[wert - 1] + '"/></svg>';
  };
  NA.SKALA = ['gar nicht', 'wenig', 'teils', 'gut', 'sehr gut'];
  NA.FEEDBACK_FRAGEN = [
    'Hat dir die Ausstellung geholfen, den Konflikt besser zu verstehen?',
    'Waren beide Perspektiven fair dargestellt?',
    'Wie hat dir das Quiz gefallen?'
  ];

  /* ---------- Team-Namen: Adjektiv + Tier, grammatisch passend ---------- */
  var ADJ = ['blau', 'gelb', 'grün', 'rot', 'silbern', 'golden', 'braun', 'grau', 'bunt', 'flink', 'mutig', 'klug',
    'schlau', 'wach', 'munter', 'fröhlich', 'ruhig', 'schnell', 'neugierig', 'pfiffig'];
  var TIERE = [
    ['Delfin', 'm'], ['Fuchs', 'm'], ['Dachs', 'm'], ['Biber', 'm'], ['Igel', 'm'], ['Luchs', 'm'], ['Pinguin', 'm'],
    ['Otter', 'm'], ['Falke', 'm'], ['Hase', 'm'], ['Elch', 'm'], ['Wal', 'm'], ['Panda', 'm'], ['Koala', 'm'], ['Papagei', 'm'],
    ['Eule', 'f'], ['Robbe', 'f'], ['Möwe', 'f'], ['Schildkröte', 'f'], ['Giraffe', 'f'], ['Katze', 'f'], ['Hummel', 'f'], ['Libelle', 'f'],
    ['Eichhörnchen', 'n'], ['Zebra', 'n'], ['Lama', 'n'], ['Nashorn', 'n'], ['Erdmännchen', 'n'], ['Pony', 'n']
  ];
  var ENDUNG = { m: 'er', f: 'e', n: 'es' };
  NA.teamName = function (vergeben) {
    vergeben = vergeben || [];
    for (var v = 0; v < 60; v++) {
      var a = ADJ[Math.floor(Math.random() * ADJ.length)];
      var t = TIERE[Math.floor(Math.random() * TIERE.length)];
      var name = a.charAt(0).toUpperCase() + a.slice(1) + ENDUNG[t[1]] + ' ' + t[0];
      if (vergeben.indexOf(name) < 0) return name;
    }
    return 'Team ' + (vergeben.length + 1);
  };

  /* ---------- Hilfen ---------- */
  NA.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  NA.mischen = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  };
  NA.text200 = function (s) {
    return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 200);
  };
  NA.wert15 = function (v) {
    var n = parseInt(v, 10);
    return n >= 1 && n <= 5 ? n : null;
  };
  NA.uid = function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  };
  NA.datumDE = function (iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return z(d.getDate()) + '.' + z(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
  };

  /* ---------- Speicher (localStorage, robust) ---------- */
  NA.lies = function (key, standard) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : standard; } catch (e) { return standard; }
  };
  NA.schreib = function (key, wert) {
    try { localStorage.setItem(key, JSON.stringify(wert)); return true; } catch (e) { return false; }
  };
  NA.K = {
    feedback: 'nahost.feedback.v1',
    exit: 'nahost.exitfeedback.v1',
    highscore: 'nahost.highscore.v1',
    einstellungen: 'nahost.einstellungen.v1',
    pin: 'nahost.pin.v1',
    client: 'nahost.client.v1'
  };
  NA.pin = function () { return NA.lies(NA.K.pin, '2611'); };

  /* ---------- CSV für deutsches Excel: UTF-8 mit BOM, Semikolon, CRLF ---------- */
  NA.csvFeld = function (v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; /* keine Formeln einschleusen */
    return '"' + s.replace(/"/g, '""') + '"';
  };
  NA.csv = function (kopf, zeilen) {
    var out = [kopf.map(NA.csvFeld).join(';')];
    zeilen.forEach(function (z) { out.push(z.map(NA.csvFeld).join(';')); });
    return '\uFEFF' + out.join('\r\n') + '\r\n';
  };
  NA.herunterladen = function (dateiname, inhalt) {
    var blob = new Blob([inhalt], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = dateiname;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  };
  NA.feedbackCsv = function (eintraege) {
    var kopf = ['Zeitpunkt', 'Herkunft', 'Ausstellung hilfreich (1-5)', 'Beide Perspektiven fair (1-5)', 'Quiz gefallen (1-5)', 'Freitext'];
    return NA.csv(kopf, eintraege.map(function (e) {
      return [NA.datumDE(e.zeit), e.herkunft, e.f1 == null ? '' : e.f1, e.f2 == null ? '' : e.f2, e.f3 == null ? 'nicht gespielt' : e.f3, e.text || ''];
    }));
  };
  NA.dateiStempel = function () {
    var d = new Date();
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + '_' + z(d.getHours()) + z(d.getMinutes());
  };

  /* ---------- PeerJS laden: erst gepinnte CDN-Version, sonst lokale Kopie ---------- */
  function skriptLaden(src, sri, timeoutMs) {
    return new Promise(function (ok, fehler) {
      var s = document.createElement('script');
      var fertig = false;
      var t = setTimeout(function () { if (!fertig) { fertig = true; s.remove(); fehler(new Error('timeout')); } }, timeoutMs);
      s.src = src;
      if (sri) { s.integrity = sri; s.crossOrigin = 'anonymous'; }
      s.onload = function () { if (fertig) return; fertig = true; clearTimeout(t); ok(); };
      s.onerror = function () { if (fertig) return; fertig = true; clearTimeout(t); s.remove(); fehler(new Error('load')); };
      document.head.appendChild(s);
    });
  }
  NA.ladePeerJS = function () {
    if (window.Peer) return Promise.resolve(window.Peer);
    if (window.NAHOST_OHNE_NETZ) return Promise.reject(new Error('aus'));
    return skriptLaden(NA.PEER_CDN, NA.PEER_SRI, 4000)
      .catch(function () { return skriptLaden(NA.PEER_LOKAL, null, 4000); })
      .then(function () {
        if (!window.Peer) throw new Error('kein Peer');
        return window.Peer;
      });
  };
  NA.peerOptionen = function () {
    return { debug: 0 };
  };

  /* ---------- Fragen laden: fetch, sonst eingebettete Kopie ---------- */
  NA.pruefeFragen = function (d) {
    if (!d || !Array.isArray(d.fragen)) return null;
    var gut = d.fragen.filter(function (f) {
      return f && typeof f.frage === 'string' && f.frage.trim() && Array.isArray(f.antworten) && f.antworten.length === 4 &&
        f.antworten.every(function (a) { return typeof a === 'string' && a.trim(); }) &&
        [0, 1, 2, 3].indexOf(Number(f.richtig)) >= 0;
    }).map(function (f) {
      var st = parseInt(f.station, 10);
      var z = parseInt(f.zeit, 10);
      return {
        station: st >= 1 && st <= 5 ? st : 0,
        frage: f.frage.trim(),
        antworten: f.antworten.map(function (a) { return a.trim(); }),
        richtig: Number(f.richtig),
        erklaerung: String(f.erklaerung || '').trim(),
        quelle: String(f.quelle || '').trim(),
        zeit: z >= 5 && z <= 120 ? z : 20
      };
    });
    if (!gut.length) return null;
    return { titel: String(d.titel || 'Quiz'), fragen: gut };
  };
  NA.ladeFragen = function () {
    var eingebettet = function (grund) {
      var d = NA.pruefeFragen(window.NAHOST_FRAGEN_EINGEBETTET);
      if (!d) return Promise.reject(new Error('keine Fragen'));
      d.herkunft = 'eingebettete Kopie (' + grund + ')';
      return d;
    };
    if (location.protocol === 'file:') return Promise.resolve().then(function () { return eingebettet('file://'); });
    return fetch(NA.ARENA_BASIS + 'fragen.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        var d = NA.pruefeFragen(j);
        if (!d) throw new Error('Format');
        d.herkunft = 'fragen.json';
        return d;
      })
      .catch(function (e) { return eingebettet(e.message || 'Fehler'); });
  };

  /* ---------- QR-Code als SVG (qrcode-generator, MIT, lokal) ---------- */
  NA.qrSvg = function (text) {
    if (typeof window.qrcode !== 'function') return '';
    var q = window.qrcode(0, 'M');
    q.addData(text);
    q.make();
    var n = q.getModuleCount(), rand = 2, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + rand) + ' ' + (r + rand) + 'h1v1h-1z';
    var g = n + 2 * rand;
    return '<svg class="qr" viewBox="0 0 ' + g + ' ' + g + '" role="img" aria-label="QR-Code zum Mitspielen" shape-rendering="crispEdges">' +
      '<rect width="' + g + '" height="' + g + '" fill="#fbfaf6"/><path d="' + d + '" fill="#1d1d1b"/></svg>';
  };

  /* ---------- Feedback-Formular (Smileys + Freitext), wiederverwendbar ---------- */
  NA.baueFeedbackFormular = function (ziel, optionen) {
    optionen = optionen || {};
    var werte = [null, null, null];
    var html = '';
    NA.FEEDBACK_FRAGEN.forEach(function (frage, i) {
      if (i === 2 && optionen.ohneQuiz) return;
      html += '<fieldset class="fb-frage karte ' + (i % 2 ? 'nadel-blau' : '') + '"><legend class="fb-legende">' + NA.esc(frage) + '</legend><div class="fb-skala">';
      for (var w = 1; w <= 5; w++) {
        html += '<button type="button" class="fb-wahl" data-frage="' + i + '" data-wert="' + w + '" aria-pressed="false">' +
          NA.smiley(w) + '<span>' + NA.SKALA[w - 1] + '</span></button>';
      }
      if (i === 2 && optionen.nichtGespielt) {
        html += '<button type="button" class="fb-wahl fb-nicht" data-frage="2" data-wert="0" aria-pressed="false">' + NA.icon('kreuz') + '<span>nicht gespielt</span></button>';
      }
      html += '</div></fieldset>';
    });
    html += '<div class="fb-frei karte nadel-blau"><label class="fb-legende" for="' + (optionen.idPrefix || 'fb') + '-text">Möchtest du noch etwas sagen? <span class="hand">(freiwillig, keine Namen)</span></label>' +
      '<textarea id="' + (optionen.idPrefix || 'fb') + '-text" maxlength="200" rows="2" placeholder="Zum Beispiel: Was war spannend, was fehlt?"></textarea>' +
      '<div class="fb-zaehler hand" aria-live="polite">0 / 200</div></div>';
    ziel.innerHTML = html;
    var ta = ziel.querySelector('textarea');
    var zaehler = ziel.querySelector('.fb-zaehler');
    ta.addEventListener('input', function () { zaehler.textContent = ta.value.length + ' / 200'; });
    ziel.addEventListener('click', function (ev) {
      var b = ev.target.closest('.fb-wahl');
      if (!b) return;
      var i = +b.dataset.frage;
      werte[i] = +b.dataset.wert;
      ziel.querySelectorAll('.fb-wahl[data-frage="' + i + '"]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      if (optionen.beiAenderung) optionen.beiAenderung();
    });
    return {
      daten: function () {
        return {
          f1: werte[0], f2: werte[1],
          f3: optionen.ohneQuiz ? null : (werte[2] === 0 ? null : werte[2]),
          text: NA.text200(ta.value)
        };
      },
      hatEtwas: function () { return werte.some(function (w) { return w !== null; }) || ta.value.trim().length > 0; }
    };
  };

  /* ---------- Lehrkraft-Zugang: Logo 3 s lang drücken, dann PIN ---------- */
  NA.langDruck = function (el, ms, fn) {
    var t = null;
    function weg() { if (t) { clearTimeout(t); t = null; } el.classList.remove('drueckt'); }
    el.addEventListener('pointerdown', function () { weg(); el.classList.add('drueckt'); t = setTimeout(function () { weg(); fn(); }, ms); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { el.addEventListener(n, weg); });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  /* PIN-Dialog mit Ziffernfeld; ruft beiErfolg() auf. Die PIN wird nie angezeigt. */
  NA.pinDialog = function (beiErfolg) {
    var alt = document.getElementById('pin-dialog');
    if (alt) alt.remove();
    var fehlversuche = NA._pinFehler || 0;
    var sperreBis = NA._pinSperre || 0;
    var d = document.createElement('div');
    d.id = 'pin-dialog';
    d.className = 'overlay';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.setAttribute('aria-labelledby', 'pin-titel');
    var tasten = '';
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (z) { tasten += '<button type="button" class="pin-taste" data-z="' + z + '">' + z + '</button>'; });
    tasten += '<button type="button" class="pin-taste pin-weg" data-z="x">Abbrechen</button><button type="button" class="pin-taste" data-z="0">0</button><button type="button" class="pin-taste pin-loeschen" data-z="&lt;" aria-label="Ziffer löschen">' + NA.icon('zurueck') + '</button>';
    d.innerHTML = '<div class="pin-karte karte"><h2 id="pin-titel">Bereich für die Lehrkraft</h2>' +
      '<div class="pin-anzeige" aria-live="polite"><span></span><span></span><span></span><span></span></div>' +
      '<p class="pin-hinweis hand" aria-live="polite"></p><div class="pin-feld">' + tasten + '</div></div>';
    document.body.appendChild(d);
    var eingabe = '';
    var punkte = d.querySelectorAll('.pin-anzeige span');
    var hinweis = d.querySelector('.pin-hinweis');
    function zeigen() { punkte.forEach(function (p, i) { p.classList.toggle('voll', i < eingabe.length); }); }
    function schliessen() { d.remove(); document.removeEventListener('keydown', taste); }
    function pruefen() {
      if (Date.now() < (NA._pinSperre || 0)) { hinweis.textContent = 'Kurz warten …'; eingabe = ''; zeigen(); return; }
      if (eingabe === String(NA.pin())) { NA._pinFehler = 0; schliessen(); beiErfolg(); return; }
      NA._pinFehler = (NA._pinFehler || 0) + 1;
      if (NA._pinFehler >= 3) { NA._pinSperre = Date.now() + 30000; NA._pinFehler = 0; hinweis.textContent = 'Falsch. 30 Sekunden gesperrt.'; }
      else hinweis.textContent = 'Falsch, bitte noch einmal.';
      eingabe = ''; zeigen();
    }
    function druecke(z) {
      if (z === 'x') { schliessen(); return; }
      if (z === '<') { eingabe = eingabe.slice(0, -1); zeigen(); return; }
      if (eingabe.length < 4) { eingabe += z; zeigen(); }
      if (eingabe.length === 4) setTimeout(pruefen, 120);
    }
    function taste(e) {
      if (/^[0-9]$/.test(e.key)) druecke(e.key);
      else if (e.key === 'Backspace') druecke('<');
      else if (e.key === 'Escape') druecke('x');
    }
    d.addEventListener('click', function (e) { var b = e.target.closest('.pin-taste'); if (b) druecke(b.dataset.z); });
    document.addEventListener('keydown', taste);
    if (Date.now() < sperreBis) hinweis.textContent = 'Kurz warten …';
    void fehlversuche;
    d.querySelector('.pin-taste').focus();
    return { schliessen: schliessen };
  };

  window.NA = NA;
})();
