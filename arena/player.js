/* Quiz-Arena – SPIELER (Tablet / Handy). Zeigt nur an und schickt Tipps; Punkte rechnet der Host. */
(function () {
  'use strict';
  var NA = window.NA;
  var $ = function (id) { return document.getElementById(id); };
  var screen = $('sp-screen');

  var params = new URLSearchParams(location.search);
  var raum = (params.get('raum') || '').replace(/\D/g, '').slice(0, 4);
  var clientId = (function () {
    var k = 'nahost.spieler.id';
    var id = null;
    try { id = sessionStorage.getItem(k); } catch (e) { /* privat */ }
    if (!id) { id = NA.uid(); try { sessionStorage.setItem(k, id); } catch (e) { /* egal */ } }
    return id;
  })();

  var peer = null, conn = null, verbunden = false, wachhund = null, neuTimer = null, versuche = 0;
  var name = '', phase = 'start', aktuelleFrage = null, countdown = null, fbRunde = null, fbForm = null;

  function kopf(n, unter, wuerfeln) {
    if (n) $('sp-name').textContent = n;
    $('sp-unterzeile').textContent = unter || '';
    $('sp-wuerfeln').hidden = !wuerfeln;
  }
  function info(html, klasse) {
    stoppCountdown();
    screen.innerHTML = '<div class="karte sp-info ' + (klasse || '') + '">' + html + '</div>';
  }
  function stoppCountdown() { if (countdown) { clearInterval(countdown); countdown = null; } }
  function sende(m) { if (conn && conn.open) { try { conn.send(m); } catch (e) { /* weg */ } } }

  /* ---------- Raum eingeben (falls ohne QR-Code geöffnet) ---------- */
  function raumEingabe(hinweis) {
    phase = 'raum';
    kopf('Quiz-Arena', 'Raum-Nummer vom Smartboard eingeben', false);
    var eingabe = '';
    var tasten = '';
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (z) { tasten += '<button type="button" class="pin-taste" data-z="' + z + '">' + z + '</button>'; });
    tasten += '<span></span><button type="button" class="pin-taste" data-z="0">0</button><button type="button" class="pin-taste" data-z="&lt;" aria-label="Ziffer löschen">' + NA.icon('zurueck') + '</button>';
    screen.innerHTML = '<div class="karte sp-info"><p>' + (hinweis ? NA.esc(hinweis) : 'Welche Raum-Nummer steht am Smartboard?') + '</p>' +
      '<div class="sp-raum-feld"><div class="sp-raum-anzeige" aria-live="polite"><span></span><span></span><span></span><span></span></div>' +
      '<div class="sp-ziffern">' + tasten + '</div></div></div>';
    var felder = screen.querySelectorAll('.sp-raum-anzeige span');
    function zeig() { felder.forEach(function (f, i) { f.textContent = eingabe[i] || ''; }); }
    screen.querySelector('.sp-ziffern').addEventListener('click', function (e) {
      var b = e.target.closest('.pin-taste');
      if (!b) return;
      if (b.dataset.z === '<') eingabe = eingabe.slice(0, -1);
      else if (eingabe.length < 4) eingabe += b.dataset.z;
      zeig();
      if (eingabe.length === 4) {
        raum = eingabe;
        try { history.replaceState(null, '', '?raum=' + raum); } catch (err) { /* egal */ }
        setTimeout(verbinden, 200);
      }
    });
  }

  /* ---------- Verbindung ---------- */
  function verbinden() {
    clearTimeout(neuTimer);
    phase = 'verbinde';
    kopf('Quiz-Arena', 'Raum ' + raum, false);
    info('<p class="gross">Verbinde …</p><p>Mit dem Smartboard in Raum ' + NA.esc(raum) + '.</p>');
    clearTimeout(wachhund);
    wachhund = setTimeout(function () { if (!verbunden) keineVerbindung(); }, 9000);
    NA.ladePeerJS().then(function (Peer) {
      if (peer && !peer.destroyed && peer.open) { verbindeHost(); return; }
      if (peer) { try { peer.destroy(); } catch (e) { /* egal */ } }
      peer = new Peer(NA.peerOptionen());
      peer.on('open', verbindeHost);
      peer.on('error', function (err) {
        if (err && err.type === 'peer-unavailable') { raumFehlt(); return; }
        if (!verbunden) keineVerbindung();
      });
      peer.on('disconnected', function () {
        setTimeout(function () { if (peer && !peer.destroyed && peer.disconnected) { try { peer.reconnect(); } catch (e) { /* egal */ } } }, 2000);
      });
    }).catch(keineVerbindung);
  }

  function verbindeHost() {
    if (conn) { try { conn.close(); } catch (e) { /* egal */ } }
    var c = peer.connect(NA.PREFIX + raum, { reliable: true });
    conn = c;
    c.on('open', function () {
      if (c !== conn) return;
      verbunden = true; versuche = 0;
      clearTimeout(wachhund);
      sende({ t: 'hallo', id: clientId });
    });
    c.on('data', function (m) { if (c === conn) empfang(m); });
    c.on('close', function () { if (c === conn) verbindungWeg(); });
    c.on('error', function () { if (c === conn) verbindungWeg(); });
  }

  function verbindungWeg() {
    verbunden = false;
    if (phase === 'raum' || phase === 'fehler') return;
    versuche++;
    if (versuche > 40) { keineVerbindung(); return; }
    kopf(name || 'Quiz-Arena', 'Verbindung weg – verbinde neu …', false);
    clearTimeout(neuTimer);
    neuTimer = setTimeout(function () {
      if (verbunden) return;
      if (peer && !peer.destroyed && peer.open) verbindeHost(); else verbinden();
    }, 2500);
  }

  function keineVerbindung() {
    if (verbunden) return;
    phase = 'fehler';
    kopf('Quiz-Arena', 'Raum ' + raum, false);
    info(NA.icon('tablet', 'gross-icon') + '<p class="gross">Keine Verbindung zum Smartboard.</p>' +
      '<p>Das WLAN lässt die Verbindung gerade nicht zu. Ihr könnt direkt am Smartboard spielen: dort auf „Gegen den Computer“ oder „Teams gegeneinander“ tippen.</p>' +
      '<div class="sp-aktionen"><button type="button" class="knopf haupt" id="sp-nochmal">Nochmal versuchen</button></div>');
    $('sp-nochmal').addEventListener('click', function () { versuche = 0; verbinden(); });
  }

  function raumFehlt() {
    clearTimeout(wachhund);
    phase = 'fehler';
    verbunden = false;
    kopf('Quiz-Arena', '', false);
    info('<p class="gross">Raum ' + NA.esc(raum) + ' nicht gefunden.</p><p>Bitte den QR-Code am Smartboard neu scannen oder die Raum-Nummer eingeben.</p>' +
      '<div class="sp-aktionen"><button type="button" class="knopf haupt" id="sp-nochmal">Nochmal versuchen</button><button type="button" class="knopf" id="sp-raum">Raum-Nummer eingeben</button></div>');
    $('sp-nochmal').addEventListener('click', function () { versuche = 0; verbinden(); });
    $('sp-raum').addEventListener('click', function () { raumEingabe(); });
  }

  /* ---------- Nachrichten vom Host ---------- */
  function empfang(m) {
    if (!m || typeof m.t !== 'string') return;
    if (m.name) name = String(m.name);
    switch (m.t) {
      case 'willkommen': case 'lobby': lobby(m); break;
      case 'name': name = m.name; if (phase === 'lobby') kopf(name, 'Euer Team-Name', true); break;
      case 'warten':
        phase = 'warten';
        kopf(name || 'Quiz-Arena', 'Raum ' + raum, false);
        info(m.grund === 'smartboard'
          ? '<p class="gross">Am Smartboard läuft gerade ein Spiel ohne Tablets.</p><p class="hand">Danach seid ihr automatisch dabei.</p>'
          : '<p class="gross">Gerade läuft eine Runde.</p><p class="hand">Ihr seid in der nächsten Runde automatisch dabei.</p>');
        break;
      case 'voll': phase = 'fehler'; info('<p class="gross">Der Raum ist voll.</p><p>Es können höchstens 10 Teams mitspielen. Bitte wartet auf die nächste Runde.</p>'); break;
      case 'frage': frage(m); break;
      case 'eingeloggt': gesperrt(m.a); break;
      case 'ergebnis': ergebnis(m); break;
      case 'ende': ende(m); break;
      case 'feedback-bitte': if (m.schon) danke(); else feedback(m); break;
      case 'danke': danke(); break;
      case 'reset': if (phase !== 'feedback') danke(true); else fbRunde = null; break;
      default: break;
    }
  }

  function lobby(m) {
    phase = 'lobby';
    kopf(name, 'Euer Team-Name', true);
    var n = m.teams || 1;
    info(NA.icon('team', 'gross-icon') + '<p class="gross">Ihr seid dabei!</p><p>' + n + (n === 1 ? ' Team ist' : ' Teams sind') + ' im Raum.</p>' +
      '<p class="hand">Schaut auf das Smartboard. Gleich geht es los.</p>' +
      '<div class="sp-aktionen"><button type="button" class="knopf haupt" id="sp-los">Alle da – los!</button></div>');
    $('sp-los').addEventListener('click', function () { sende({ t: 'start' }); });
  }

  function frage(m) {
    phase = 'frage';
    aktuelleFrage = m;
    kopf(name, 'Frage ' + m.nr + ' von ' + m.von, false);
    stoppCountdown();
    var h = '<p class="sp-timer" aria-hidden="true"><span id="sp-zeit">' + m.zeit + '</span> s</p><div class="sp-pad" id="sp-pad">';
    m.antworten.forEach(function (a, i) {
      var k = NA.FORM_KARTE[i];
      h += '<button type="button" class="karte sp-taste ' + k.farbe + ' ' + k.form + (i % 2 ? ' nadel-blau' : '') + '" data-i="' + i + '">' +
        NA.formSvg(i) + '<span class="a-text"><span class="nur-sr">' + NA.FORM_NAMEN[i] + ': </span>' + NA.esc(a) + '</span></button>';
    });
    h += '</div>';
    screen.innerHTML = h;
    var ende = Date.now() + m.zeit * 1000;
    countdown = setInterval(function () {
      var el = $('sp-zeit');
      if (!el) { stoppCountdown(); return; }
      el.textContent = Math.max(0, Math.ceil((ende - Date.now()) / 1000));
    }, 250);
    $('sp-pad').addEventListener('click', function (e) {
      var b = e.target.closest('.sp-taste');
      if (!b || $('sp-pad').classList.contains('gesperrt')) return;
      sende({ t: 'antwort', q: m.q, a: +b.dataset.i });
      gesperrt(+b.dataset.i);
    });
    if (m.schon) gesperrt(null);
  }

  function gesperrt(a) {
    var pad = $('sp-pad');
    if (!pad || pad.classList.contains('gesperrt')) return;
    pad.classList.add('gesperrt');
    pad.querySelectorAll('.sp-taste').forEach(function (b) { b.disabled = true; b.classList.toggle('gewaehlt', +b.dataset.i === a); });
    kopf(name, 'Antwort eingeloggt. Warte auf die anderen …', false);
  }

  function ergebnis(m) {
    phase = 'ergebnis';
    kopf(name, 'Platz ' + m.platz + ' von ' + m.von, false);
    var richtig = NA.formSvg(m.richtigeAntwort) + ' ' + NA.esc(m.richtigText);
    if (m.richtig) info(NA.icon('haken', 'gross-icon') + '<p class="gross">Richtig! +' + m.plus + '</p><p>Ihr habt jetzt ' + m.punkte + ' Punkte.</p>', 'gelb');
    else if (!m.beantwortet) info(NA.icon('kreuz', 'gross-icon') + '<p class="gross">Zu spät.</p><p>Richtig war: <b>' + richtig + '</b></p><p>Ihr habt ' + m.punkte + ' Punkte.</p>');
    else info(NA.icon('kreuz', 'gross-icon') + '<p class="gross">Leider falsch.</p><p>Richtig war: <b>' + richtig + '</b></p><p>Ihr habt ' + m.punkte + ' Punkte.</p>', 'blau');
    var f = screen.querySelector('p b svg.form');
    if (f) { f.style.width = '1.2em'; f.style.height = '1.2em'; f.style.verticalAlign = '-0.2em'; }
  }

  function ende(m) {
    phase = 'ende';
    kopf(name, 'Runde beendet', false);
    info(NA.icon('pokal', 'gross-icon') + '<p class="gross">Platz ' + m.platz + ' von ' + m.von + '</p><p>' + m.punkte + ' Punkte</p>' +
      (m.bestenliste ? '<p class="hand">Ihr steht in der Bestenliste!</p>' : '<p class="hand">Gleich kommen noch drei kurze Fragen.</p>'), m.platz === 1 ? 'gelb' : '');
  }

  function feedback(m) {
    phase = 'feedback';
    fbRunde = m.runde;
    kopf(name, 'Kurze Rückmeldung – anonym', false);
    stoppCountdown();
    screen.innerHTML = '<div class="sp-fb" id="sp-fb"></div><div class="sp-aktionen">' +
      '<button type="button" class="knopf haupt" id="sp-fb-senden">Absenden</button><button type="button" class="knopf leise" id="sp-fb-weg">Überspringen</button></div>';
    fbForm = NA.baueFeedbackFormular($('sp-fb'), { idPrefix: 'spfb' });
    $('sp-fb-senden').addEventListener('click', function () {
      if (!fbForm.hatEtwas()) { danke(); return; }
      sende({ t: 'feedback', id: clientId, runde: fbRunde, daten: fbForm.daten() });
      danke();
    });
    $('sp-fb-weg').addEventListener('click', function () { danke(); });
  }

  function danke(nachReset) {
    phase = 'danke';
    kopf(name || 'Quiz-Arena', 'Danke fürs Mitspielen!', false);
    info('<p class="gross">Danke!</p><p>' + (nachReset ? 'Die Runde ist vorbei.' : 'Eure Rückmeldung hilft dem Kurs.') + '</p>' +
      '<div class="sp-aktionen"><button type="button" class="knopf haupt" id="sp-wieder">Nochmal mitspielen</button></div>');
    $('sp-wieder').addEventListener('click', function () {
      if (conn && conn.open) sende({ t: 'hallo', id: clientId }); else verbinden();
    });
  }

  $('sp-wuerfeln').addEventListener('click', function () { sende({ t: 'wuerfeln' }); });
  $('sp-wuerfeln').innerHTML = NA.icon('wuerfel') + 'neu würfeln';

  /* Seite wieder sichtbar (Tablet aus dem Standby): Verbindung prüfen */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && raum && !verbunden && phase !== 'raum') { versuche = 0; verbinden(); }
  });

  if (/^\d{4}$/.test(raum)) verbinden(); else raumEingabe();

  window.NAHOST_SPIELER = { zustand: function () { return { phase: phase, name: name, verbunden: verbunden }; } };
})();
