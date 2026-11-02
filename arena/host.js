/* Quiz-Arena – HOST (Smartboard). Der Host ist die einzige Autorität: Fragen, Zeit und Punkte entstehen hier. */
(function () {
  'use strict';
  var NA = window.NA;
  var $ = function (id) { return document.getElementById(id); };

  var INAKTIV_MS = 90000;
  var PEER_WARTEZEIT_MS = 8000;
  var AUFLOESUNG_MS = 12000;
  var RANG_MS = 5500;
  var PODEST_MS = 12000;
  var FEEDBACK_MS = 45000;

  var EIN = Object.assign({ anzahl: 10, zeit: 0, station: 0 }, NA.lies(NA.K.einstellungen, {}));

  var S = {
    phase: 'start', modus: 'netz', netz: 'verbinde', raum: null, peer: null, fbPeer: null, PeerKlasse: null,
    teams: [], wartend: new Map(), fragen: null, runde: [], idx: -1, frageStart: 0, frageDauer: 20000,
    aktiv: Date.now(), leer: 0, rundeNr: 0, tick: null, fbGesehen: {},
    lokal: { bot: false, anzahl: 2, staerke: 0.65, namen: [] }, panel: null
  };

  /* ---------- Zeitsteuerung ---------- */
  var timer = [];
  function nach(ms, fn) { var t = setTimeout(fn, ms); timer.push(t); return t; }
  function timerStopp() { timer.forEach(clearTimeout); timer = []; if (S.tick) { clearInterval(S.tick); S.tick = null; } }
  function aktivitaet() { S.aktiv = Date.now(); }

  /* ---------- Bühne auf Bildschirm einpassen ---------- */
  function skalieren() {
    var s = Math.min(innerWidth / 1920, innerHeight / 1080);
    $('buehne').style.transform = 'translate(' + Math.round((innerWidth - 1920 * s) / 2) + 'px,' + Math.round((innerHeight - 1080 * s) / 2) + 'px) scale(' + s + ')';
  }
  addEventListener('resize', skalieren);

  function zeige(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.hidden = s.id !== id; });
  }

  /* ---------- Bestenliste ---------- */
  function bestenliste() { return NA.lies(NA.K.highscore, []); }
  function zeichneBestenliste() {
    var liste = bestenliste();
    var h = '<h2>' + NA.icon('pokal') + 'Bestenliste – Top 10</h2>';
    if (!liste.length) h += '<p class="leer hand">Noch leer. Wer spielt die erste Runde?</p>';
    else {
      h += '<ol>';
      liste.forEach(function (e, i) {
        h += '<li><span class="platz">' + (i + 1) + '.</span><span>' + NA.esc(e.name) + '</span><span class="pkt">' + e.punkte + '</span></li>';
      });
      h += '</ol>';
    }
    $('bestenliste-start').innerHTML = h;
  }
  function inBestenliste(teams) {
    var liste = bestenliste();
    var neu = [];
    var modus = S.modus === 'netz' ? 'Tablets' : (S.modus === 'computer' ? 'Gegen den Computer' : 'Smartboard');
    teams.forEach(function (t) {
      if (t.bot || t.punkte <= 0) return;
      var e = { name: t.name, punkte: t.punkte, zeit: new Date().toISOString(), modus: modus, _neu: NA.uid() };
      liste.push(e); neu.push(e._neu);
    });
    liste.sort(function (a, b) { return b.punkte - a.punkte; });
    liste = liste.slice(0, 10);
    var drin = liste.filter(function (e) { return neu.indexOf(e._neu) >= 0; }).map(function (e) { return e.name; });
    liste.forEach(function (e) { delete e._neu; });
    NA.schreib(NA.K.highscore, liste);
    return drin;
  }

  /* ---------- Feedback speichern ---------- */
  function speichereFeedback(e) {
    var liste = NA.lies(NA.K.feedback, []);
    if (e.id && liste.some(function (x) { return x.id === e.id; })) return true;
    liste.push(e);
    if (liste.length > 5000) liste = liste.slice(-5000);
    return NA.schreib(NA.K.feedback, liste);
  }
  function feedbackEintrag(d, herkunft, id) {
    return {
      id: id || NA.uid(), zeit: new Date().toISOString(), herkunft: herkunft,
      f1: NA.wert15(d.f1), f2: NA.wert15(d.f2), f3: NA.wert15(d.f3), text: NA.text200(d.text)
    };
  }

  /* ---------- Netzwerk (PeerJS) ---------- */
  function raumNeu() { return String(1000 + Math.floor(Math.random() * 9000)); }
  function zeigeRaum() {
    $('raum-start').textContent = S.raum; $('raum-lobby').textContent = S.raum;
    var qr = NA.qrSvg(NA.SPIEL_URL + S.raum);
    $('qr-start').innerHTML = qr; $('qr-lobby').innerHTML = qr;
  }
  function status(text, warn) { var el = $('status-start'); el.textContent = text; el.classList.toggle('warn', !!warn); }

  function netzStart() {
    S.netz = 'verbinde';
    status('Verbindung wird aufgebaut …');
    $('qr-karte').hidden = false; $('netz-weg').hidden = true; $('ohne-tablet').classList.remove('betont');
    var wachhund = setTimeout(function () { if (S.netz !== 'bereit') netzWeg(); }, PEER_WARTEZEIT_MS);
    NA.ladePeerJS().then(function (Peer) {
      S.PeerKlasse = Peer;
      erzeugePeer();
    }).catch(function () { clearTimeout(wachhund); netzWeg(); });
  }
  function erzeugePeer() {
    var Peer = S.PeerKlasse;
    if (S.peer) { try { S.peer.destroy(); } catch (e) { /* egal */ } }
    if (!S.raum) S.raum = raumNeu();
    zeigeRaum();
    var p;
    try { p = new Peer(NA.PREFIX + S.raum, NA.peerOptionen()); } catch (e) { netzWeg(); return; }
    S.peer = p;
    p.on('open', function () { if (p !== S.peer) return; S.netz = 'bereit'; netzOk(); feedbackKanal(); });
    p.on('connection', neueVerbindung);
    p.on('disconnected', function () {
      if (p !== S.peer || p.destroyed) return;
      status('Verbindung unterbrochen – verbinde neu …', true);
      setTimeout(function () { if (p === S.peer && !p.destroyed && p.disconnected) { try { p.reconnect(); } catch (e) { /* nächster Versuch im Wächter */ } } }, 3000);
    });
    p.on('error', function (err) {
      if (p !== S.peer) return;
      if (err && err.type === 'unavailable-id') { S.raum = raumNeu(); erzeugePeer(); return; }
      if (err && err.type === 'peer-unavailable') return;
      if (S.netz !== 'bereit') { netzWeg(); return; }
      status('Verbindung gestört – neuer Versuch …', true);
    });
    p.on('open', function () { status('Bereit. Teams können beitreten.'); });
  }
  function netzOk() {
    $('qr-karte').hidden = false; $('netz-weg').hidden = true; $('ohne-tablet').classList.remove('betont');
    status('Bereit. Teams können beitreten.');
  }
  function netzWeg() {
    if (S.netz === 'bereit') return;
    S.netz = 'weg';
    $('qr-karte').hidden = true; $('netz-weg').hidden = false; $('ohne-tablet').classList.add('betont');
  }

  /* Fester Kanal für das Exit-Feedback (feedback/): Einträge kommen hier an und werden bestätigt. */
  function feedbackKanal() {
    if (!S.PeerKlasse || (S.fbPeer && !S.fbPeer.destroyed)) return;
    var fp;
    try { fp = new S.PeerKlasse(NA.FEEDBACK_ID, NA.peerOptionen()); } catch (e) { return; }
    S.fbPeer = fp;
    fp.on('connection', function (c) {
      c.on('data', function (m) {
        if (!m || m.t !== 'exit-feedback' || !Array.isArray(m.eintraege)) return;
        var ok = [];
        m.eintraege.slice(0, 100).forEach(function (e) {
          if (!e || typeof e.id !== 'string') return;
          var eintrag = feedbackEintrag(e, 'Exit-Tablet', e.id.slice(0, 40));
          if (typeof e.zeit === 'string' && !isNaN(new Date(e.zeit))) eintrag.zeit = new Date(e.zeit).toISOString();
          if (speichereFeedback(eintrag)) ok.push(eintrag.id);
        });
        try { c.send({ t: 'ok', ids: ok }); } catch (e) { /* Exit-Gerät versucht es später erneut */ }
      });
    });
    fp.on('error', function (err) {
      if (err && err.type === 'unavailable-id') {
        try { fp.destroy(); } catch (e) { /* egal */ }
        S.fbPeer = null;
        setTimeout(feedbackKanal, 120000);
      }
    });
    fp.on('disconnected', function () { setTimeout(function () { if (!fp.destroyed && fp.disconnected) { try { fp.reconnect(); } catch (e) { /* egal */ } } }, 5000); });
  }

  function neueVerbindung(conn) {
    conn.on('data', function (m) { empfang(conn, m); });
    conn.on('close', function () { verbindungWeg(conn); });
    conn.on('error', function () { verbindungWeg(conn); });
  }
  function an(conn, msg) { if (conn && conn.open) { try { conn.send(msg); } catch (e) { /* Gerät weg */ } } }
  function sende(t, msg) { if (!t.lokal && !t.bot) an(t.conn, msg); }
  function anAlle(msg) { S.teams.forEach(function (t) { sende(t, msg); }); }
  function teamVon(conn) { for (var i = 0; i < S.teams.length; i++) if (S.teams[i].conn === conn) return S.teams[i]; return null; }
  function namen() { return S.teams.map(function (t) { return t.name; }); }

  function empfang(conn, m) {
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
    var id = String(m.id || '').slice(0, 40);
    var t = teamVon(conn);
    switch (m.t) {
      case 'hallo': aktivitaet(); hallo(conn, id); break;
      case 'wuerfeln':
        aktivitaet();
        if (t && S.phase === 'lobby') { t.name = NA.teamName(namen()); sende(t, { t: 'name', name: t.name }); zeichneLobby(); }
        break;
      case 'start': aktivitaet(); if (S.phase === 'lobby' && S.teams.length) spielStarten(); break;
      case 'antwort': if (t) antwortEin(t, m.q, m.a); break;
      case 'feedback': feedbackVonSpieler(conn, id, m); break;
      default: break;
    }
  }

  function hallo(conn, id) {
    if (!id) return;
    var t = null;
    S.teams.forEach(function (x) { if (x.id === id) t = x; });
    if (t) {
      if (t.conn && t.conn !== conn) { try { t.conn.close(); } catch (e) { /* egal */ } }
      t.conn = conn; t.online = true; t.wegSeit = 0;
      sende(t, zustandFuer(t));
      if (S.phase === 'lobby') zeichneLobby();
      if (S.phase === 'frage') zeigeGeantwortet();
      return;
    }
    if (S.modus === 'netz' && (S.phase === 'start' || S.phase === 'lobby')) {
      if (S.teams.length >= 10) { an(conn, { t: 'voll' }); return; }
      t = { id: id, name: NA.teamName(namen()), punkte: 0, delta: 0, conn: conn, online: true, antwort: null };
      S.teams.push(t);
      if (S.phase === 'start') zuLobby();
      sende(t, { t: 'willkommen', name: t.name, raum: S.raum });
      zeichneLobby();
      anAlle({ t: 'lobby', teams: S.teams.length });
      return;
    }
    S.wartend.set(id, conn);
    an(conn, { t: 'warten', grund: S.modus === 'netz' ? 'runde' : 'smartboard' });
  }

  function zustandFuer(t) {
    var f = S.runde[S.idx];
    switch (S.phase) {
      case 'lobby': return { t: 'willkommen', name: t.name, raum: S.raum, teams: S.teams.length };
      case 'frage': return frageNachricht(f, t.antwort !== null, t.name);
      case 'aufloesung': case 'rang': return t.letztesErgebnis || { t: 'willkommen', name: t.name };
      case 'podest': return t.ende || { t: 'willkommen', name: t.name };
      case 'feedback': return { t: 'feedback-bitte', runde: S.rundeNr, name: t.name, schon: !!t.feedback };
      default: return { t: 'reset' };
    }
  }

  function verbindungWeg(conn) {
    S.wartend.forEach(function (c, id) { if (c === conn) S.wartend.delete(id); });
    var t = teamVon(conn);
    if (!t) return;
    t.online = false; t.wegSeit = Date.now();
    if (S.phase === 'lobby') zeichneLobby();
    if (S.phase === 'frage') zeigeGeantwortet();
  }

  /* ---------- Lobby ---------- */
  function zuLobby() {
    timerStopp();
    S.phase = 'lobby'; aktivitaet();
    zeige('s-lobby');
    zeichneLobby();
  }
  var FARBEN = ['gelb', 'blau', 'apricot', 'rose', ''];
  function zeichneLobby() {
    if (S.phase !== 'lobby') return;
    $('lobby-anzahl').textContent = S.teams.length;
    var h = '';
    S.teams.forEach(function (t, i) {
      h += '<div class="karte team-karte ' + FARBEN[i % 5] + (i % 2 ? ' nadel-blau schief-r' : ' schief-l') + (t.online ? '' : ' offline') + '">' +
        NA.esc(t.name) + (t.online ? '' : '<span class="hand">Verbindung weg …</span>') + '</div>';
    });
    if (!S.teams.length) h = '<p class="karte team-leer">Noch kein Team da.</p>';
    $('lobby-teams').innerHTML = h;
    $('knopf-start').disabled = !S.teams.length;
  }

  /* ---------- Runde ---------- */
  function auswahl(pool, n) {
    var gruppen = {};
    NA.mischen(pool).forEach(function (f) { (gruppen[f.station] = gruppen[f.station] || []).push(f); });
    var keys = NA.mischen(Object.keys(gruppen));
    var out = [];
    var rest = true;
    while (out.length < n && rest) {
      rest = false;
      keys.forEach(function (k) {
        if (out.length < n && gruppen[k].length) { out.push(gruppen[k].shift()); rest = true; }
      });
    }
    return NA.mischen(out).map(function (f) {
      var ord = NA.mischen([0, 1, 2, 3]);
      return Object.assign({}, f, { antworten: ord.map(function (i) { return f.antworten[i]; }), richtig: ord.indexOf(f.richtig) });
    });
  }

  function spielStarten() {
    if (!S.fragen || !S.fragen.fragen.length) { status('Keine Fragen gefunden. Bitte fragen.json prüfen.', true); return; }
    timerStopp();
    var pool = S.fragen.fragen;
    if (EIN.station) {
      var nur = pool.filter(function (f) { return f.station === EIN.station; });
      if (nur.length) pool = nur;
    }
    S.runde = auswahl(pool, EIN.anzahl);
    S.idx = -1; S.leer = 0; S.rundeNr++;
    S.teams.forEach(function (t) { t.punkte = 0; t.delta = 0; t.feedback = false; t.ende = null; t.letztesErgebnis = null; });
    aktivitaet();
    naechsteFrage();
  }

  function frageNachricht(f, schon, name) {
    var restMs = Math.max(0, S.frageDauer - (Date.now() - S.frageStart));
    return { t: 'frage', q: S.idx, nr: S.idx + 1, von: S.runde.length, antworten: f.antworten, zeit: Math.ceil(restMs / 1000), schon: !!schon, name: name };
  }

  function antwortKarte(i, text, tag) {
    var k = NA.FORM_KARTE[i];
    return '<' + tag + (tag === 'button' ? ' type="button"' : '') + ' class="karte antwort anstecken ' + k.farbe + ' ' + k.form + (i % 2 ? ' nadel-blau' : '') +
      '" data-i="' + i + '">' + NA.formSvg(i) + '<span class="a-text"><span class="nur-sr">' + NA.FORM_NAMEN[i] + ': </span>' + NA.esc(text) +
      '</span><span class="richtig-marke">' + NA.icon('haken') + 'richtig</span></' + tag + '>';
  }

  function menschen() { return S.teams.filter(function (t) { return !t.bot; }); }

  function naechsteFrage() {
    timerStopp();
    S.idx++;
    if (S.idx >= S.runde.length) { podest(); return; }
    var f = S.runde[S.idx];
    S.phase = 'frage';
    S.frageDauer = (EIN.zeit || f.zeit) * 1000;
    S.frageStart = Date.now();
    S.teams.forEach(function (t) { t.antwort = null; t.antwortMs = null; });

    var fk = $('frage-text');
    fk.textContent = f.frage;
    fk.classList.toggle('lang', f.frage.length > 95);
    var lokalMehr = S.modus !== 'netz' && menschen().length > 1;
    var lokalEins = S.modus !== 'netz' && menschen().length === 1;
    var ant = $('antworten');
    ant.className = 'antworten' + (lokalMehr ? ' klein' : '');
    ant.innerHTML = f.antworten.map(function (a, i) { return antwortKarte(i, a, lokalEins ? 'button' : 'div'); }).join('');
    $('aufloesung').hidden = true;
    $('knopf-weiter').hidden = true;
    var z = $('zonen');
    z.hidden = !lokalMehr;
    if (lokalMehr) zeichneZonen();
    $('fortschritt').textContent = 'Frage ' + (S.idx + 1) + ' / ' + S.runde.length;
    $('station-info').innerHTML = f.station ? 'Station ' + f.station + '<br><span class="gross">' + NA.esc(NA.STATIONEN[f.station]) + '</span>' : 'Alle Stationen';
    zeigeGeantwortet();
    zeige('s-frage');

    S.teams.forEach(function (t) { sende(t, frageNachricht(f, false, t.name)); });

    S.teams.forEach(function (t) {
      if (!t.bot) return;
      var ms = 2500 + Math.random() * S.frageDauer * 0.55;
      nach(ms, function () {
        var a = Math.random() < S.lokal.staerke ? f.richtig : [0, 1, 2, 3].filter(function (x) { return x !== f.richtig; })[Math.floor(Math.random() * 3)];
        antwortEin(t, S.idx, a);
      });
    });

    var tk = $('timer-karte');
    function ticken() {
      var rest = Math.max(0, Math.ceil((S.frageDauer - (Date.now() - S.frageStart)) / 1000));
      $('timer-zahl').textContent = rest;
      tk.classList.toggle('knapp', rest <= 5);
      if (rest <= 0) aufloesen();
    }
    ticken();
    S.tick = setInterval(ticken, 250);
  }

  function zeichneZonen() {
    var hs = menschen();
    var z = $('zonen');
    z.style.gridTemplateColumns = 'repeat(' + hs.length + ', minmax(0, 1fr))';
    z.innerHTML = hs.map(function (t, n) {
      var knoepfe = [0, 1, 2, 3].map(function (i) {
        return '<button type="button" class="z-knopf ' + NA.FORM_KARTE[i].farbe + '" data-team="' + t.id + '" data-i="' + i + '" aria-label="' +
          NA.esc(t.name) + ': ' + NA.FORM_NAMEN[i] + '">' + NA.formSvg(i) + '</button>';
      }).join('');
      return '<div class="karte zone ' + (n % 2 ? 'nadel-blau' : '') + '" data-team="' + t.id + '"><div class="z-name">' + NA.esc(t.name) + '</div>' +
        '<div class="z-knoepfe">' + knoepfe + '</div><div class="z-status">' + NA.icon('haken') + 'Antwort gesperrt</div></div>';
    }).join('');
  }

  function zeigeGeantwortet() {
    var aktiv = S.teams.filter(function (t) { return t.online || t.bot || t.lokal; });
    var fertig = aktiv.filter(function (t) { return t.antwort !== null; }).length;
    $('geantwortet').textContent = fertig + ' von ' + aktiv.length + ' Teams haben geantwortet';
  }

  function antwortEin(t, q, a) {
    if (S.phase !== 'frage' || q !== S.idx || t.antwort !== null) return;
    a = parseInt(a, 10);
    if (!(a >= 0 && a <= 3)) return;
    if (!t.bot) aktivitaet();
    t.antwort = a;
    t.antwortMs = Date.now() - S.frageStart;
    sende(t, { t: 'eingeloggt', q: q, a: a });
    if (t.lokal) {
      var zone = document.querySelector('.zone[data-team="' + t.id + '"]');
      if (zone) zone.classList.add('fertig');
      if (menschen().length === 1) {
        var b = document.querySelector('#antworten .antwort[data-i="' + a + '"]');
        document.querySelectorAll('#antworten button.antwort').forEach(function (x) { x.disabled = true; });
        if (b) b.classList.add('gewaehlt');
      }
    }
    zeigeGeantwortet();
    var aktiv = S.teams.filter(function (x) { return x.online || x.bot || x.lokal; });
    if (aktiv.every(function (x) { return x.antwort !== null; })) nach(700, aufloesen);
  }

  function platzieren() {
    var sortiert = S.teams.slice().sort(function (a, b) { return b.punkte - a.punkte; });
    sortiert.forEach(function (t, i) {
      t.platz = i > 0 && sortiert[i - 1].punkte === t.punkte ? sortiert[i - 1].platz : i + 1;
    });
    return sortiert;
  }

  function aufloesen() {
    if (S.phase !== 'frage') return;
    timerStopp();
    S.phase = 'aufloesung';
    var f = S.runde[S.idx];
    var mitgemacht = 0, richtige = 0;
    S.teams.forEach(function (t) {
      var r = t.antwort === f.richtig;
      var plus = 0;
      if (r) plus = Math.round(500 + 500 * Math.max(0, 1 - t.antwortMs / S.frageDauer));
      t.delta = plus; t.punkte += plus; t.letztRichtig = r;
      if (!t.bot && t.antwort !== null) mitgemacht++;
      if (r) richtige++;
    });
    S.leer = mitgemacht ? 0 : S.leer + 1;
    platzieren();
    S.teams.forEach(function (t) {
      t.letztesErgebnis = {
        t: 'ergebnis', q: S.idx, richtig: t.letztRichtig, beantwortet: t.antwort !== null, plus: t.delta, punkte: t.punkte,
        platz: t.platz, von: S.teams.length, richtigeAntwort: f.richtig, richtigText: f.antworten[f.richtig], name: t.name
      };
      sende(t, t.letztesErgebnis);
    });

    var ant = $('antworten');
    ant.classList.add('aufgedeckt', 'klein');
    document.querySelectorAll('#antworten .antwort').forEach(function (k) {
      k.classList.toggle('ist-richtig', +k.dataset.i === f.richtig);
      if (k.tagName === 'BUTTON') k.disabled = true;
    });
    $('zonen').hidden = true;
    var bilanz = '';
    if (S.modus === 'netz') bilanz = richtige + ' von ' + S.teams.length + (S.teams.length === 1 ? ' Team' : ' Teams') + ' richtig';
    else bilanz = S.teams.map(function (t) { return NA.esc(t.name) + ': ' + (t.letztRichtig ? '+' + t.delta : (t.antwort === null ? 'keine Antwort' : 'falsch')); }).join('<br>');
    $('aufloesung').innerHTML = '<p class="erkl"><b>' + NA.formSvgInline(f.richtig) + ' ' + NA.esc(f.antworten[f.richtig]) + '.</b> ' + NA.esc(f.erklaerung) + '</p>' +
      (f.quelle ? '<p class="quelle">' + NA.icon('quelle') + '<span>Quelle: ' + NA.esc(f.quelle) + '</span></p>' : '') +
      '<p class="bilanz">' + bilanz + '</p>';
    $('aufloesung').hidden = false;
    $('knopf-weiter').hidden = false;
    $('timer-zahl').textContent = '0';
    $('timer-karte').classList.remove('knapp');

    if (S.leer >= 2) { nach(6000, zurueckZumStart); return; }
    nach(AUFLOESUNG_MS, rangliste);
  }

  function rangliste() {
    timerStopp();
    S.phase = 'rang';
    var sortiert = platzieren();
    var letzte = S.idx + 1 >= S.runde.length;
    $('rang-info').textContent = letzte ? 'Gleich kommt die Siegerehrung.' : 'Nach Frage ' + (S.idx + 1) + ' von ' + S.runde.length;
    $('rang-liste').innerHTML = sortiert.slice(0, 6).map(function (t, i) {
      return '<li class="karte rang-zeile anstecken ' + (t.platz === 1 ? 'gelb' : '') + (i % 2 ? ' nadel-blau schief-r' : ' schief-l') + '"><span class="platz">' + t.platz + '.</span><span>' +
        NA.esc(t.name) + '</span><span class="plus">' + (t.delta ? '+' + t.delta : '') + '</span><span class="pkt">' + t.punkte + '</span></li>';
    }).join('');
    zeige('s-rang');
    nach(RANG_MS, naechsteFrage);
  }

  function podest() {
    timerStopp();
    S.phase = 'podest';
    var sortiert = platzieren();
    var drin = inBestenliste(S.teams);
    var spalten = [1, 0, 2].map(function (i) {
      var t = sortiert[i];
      if (!t) return '<div></div>';
      return '<div class="podest-spalte platz-' + (i + 1) + '"><div class="karte ' + (i === 0 ? 'gelb' : i === 1 ? 'blau nadel-blau' : 'apricot') + ' anstecken">' +
        NA.esc(t.name) + '<span class="pkt">' + t.punkte + ' Punkte</span></div><div class="sockel">' + (i === 0 ? NA.icon('pokal') : (i + 1) + '.') + '</div></div>';
    }).join('');
    $('podest').innerHTML = spalten;
    var rest = sortiert.slice(3).map(function (t) { return t.platz + '. ' + NA.esc(t.name) + ' – ' + t.punkte; }).join(' · ');
    $('podest-rest').innerHTML = rest;
    var alt = document.querySelector('.neuer-rekord');
    if (alt) alt.remove();
    if (drin.length) {
      var r = document.createElement('p');
      r.className = 'karte neuer-rekord rose';
      r.innerHTML = NA.icon('stern') + '<span>Neu in der Bestenliste: ' + drin.map(NA.esc).join(', ') + '</span>';
      $('s-podest').appendChild(r);
    }
    S.teams.forEach(function (t) {
      t.ende = { t: 'ende', platz: t.platz, von: S.teams.length, punkte: t.punkte, bestenliste: drin.indexOf(t.name) >= 0, name: t.name };
      sende(t, t.ende);
    });
    zeige('s-podest');
    nach(PODEST_MS, feedbackPhase);
  }

  /* ---------- Feedback nach der Runde ---------- */
  var fbForm = null;
  function feedbackPhase() {
    timerStopp();
    S.phase = 'feedback';
    aktivitaet();
    var netz = S.modus === 'netz';
    $('fb-warten').hidden = !netz;
    $('fb-host').hidden = netz;
    $('knopf-fb-senden').hidden = netz;
    $('knopf-fb-fertig').textContent = netz ? 'Fertig' : 'Überspringen';
    if (netz) {
      S.fbEingang = 0;
      $('fb-eingang').textContent = 'Noch keine Antworten.';
      S.teams.forEach(function (t) { sende(t, { t: 'feedback-bitte', runde: S.rundeNr, name: t.name }); });
    } else {
      fbForm = NA.baueFeedbackFormular($('fb-host-form'), { idPrefix: 'fbh', beiAenderung: aktivitaet });
      $('fb-host-form').querySelector('textarea').addEventListener('input', aktivitaet);
    }
    zeige('s-feedback');
    var ende = Date.now() + (netz ? FEEDBACK_MS : INAKTIV_MS);
    function ticken() {
      var rest = Math.max(0, Math.ceil((ende - Date.now()) / 1000));
      $('fb-rest').textContent = 'Zurück zum Start in ' + rest + ' s';
      if (!netz) { var bisInaktiv = Math.ceil((S.aktiv + INAKTIV_MS - Date.now()) / 1000); $('fb-rest').textContent = 'Zurück zum Start in ' + Math.max(0, bisInaktiv) + ' s, wenn niemand tippt'; if (bisInaktiv <= 0) zurueckZumStart(); }
      else if (rest <= 0) zurueckZumStart();
    }
    ticken();
    S.tick = setInterval(ticken, 500);
  }

  function feedbackVonSpieler(conn, id, m) {
    var schluessel = id + '#' + m.runde;
    if (!id || S.fbGesehen[schluessel]) { an(conn, { t: 'danke' }); return; }
    var d = m.daten || {};
    var e = feedbackEintrag(d, 'Quiz (Tablet)');
    if (e.f1 === null && e.f2 === null && e.f3 === null && !e.text) { an(conn, { t: 'danke' }); return; }
    S.fbGesehen[schluessel] = 1;
    speichereFeedback(e);
    an(conn, { t: 'danke' });
    var t = teamVon(conn);
    if (t) t.feedback = true;
    if (S.phase === 'feedback' && S.modus === 'netz') {
      S.fbEingang = (S.fbEingang || 0) + 1;
      $('fb-eingang').textContent = S.fbEingang + ' von ' + S.teams.length + ' Teams haben geantwortet. Danke!';
      var offen = S.teams.filter(function (x) { return x.online && !x.feedback; });
      if (!offen.length) nach(2500, zurueckZumStart);
    }
  }

  /* ---------- Zurück zum Anfang ---------- */
  function zurueckZumStart() {
    timerStopp();
    lehrkraftZu();
    var pin = document.getElementById('pin-dialog'); if (pin) pin.remove();
    S.teams.forEach(function (t) { sende(t, { t: 'reset' }); });
    S.teams = [];
    S.runde = []; S.idx = -1;
    S.modus = 'netz';
    S.phase = 'start';
    aktivitaet();
    zeichneBestenliste();
    zeige('s-start');
    if (S.netz === 'weg') netzWeg();
    var warten = [];
    S.wartend.forEach(function (c, id) { warten.push([c, id]); });
    S.wartend.clear();
    warten.forEach(function (w) { if (w[0].open) hallo(w[0], w[1]); });
  }

  /* ---------- Spiel am Smartboard (ohne Tablets) ---------- */
  var STAERKEN = [[0.4, 'leicht'], [0.65, 'mittel'], [0.85, 'schwer']];
  function oeffneSetup(bot) {
    timerStopp();
    S.phase = 'setup'; aktivitaet();
    S.lokal.bot = bot;
    S.lokal.anzahl = bot ? 1 : 2;
    S.lokal.namen = [];
    for (var i = 0; i < 4; i++) S.lokal.namen.push(NA.teamName(S.lokal.namen));
    $('setup-untertitel').textContent = bot ? 'Ihr spielt gegen den Computer.' : 'Teams spielen gegeneinander, jedes Team hat ein eigenes Feld.';
    $('setup-bot-block').hidden = !bot;
    zeichneSetup();
    zeige('s-setup');
  }
  function zeichneSetup() {
    var min = S.lokal.bot ? 1 : 2;
    var h = '';
    for (var n = min; n <= 4; n++) h += '<button type="button" class="knopf" data-anzahl="' + n + '" aria-pressed="' + (n === S.lokal.anzahl) + '">' + n + '</button>';
    $('setup-anzahl').innerHTML = h;
    $('setup-bot').innerHTML = STAERKEN.map(function (s) {
      return '<button type="button" class="knopf" data-staerke="' + s[0] + '" aria-pressed="' + (s[0] === S.lokal.staerke) + '">' + s[1] + '</button>';
    }).join('');
    var nl = '';
    for (var i = 0; i < S.lokal.anzahl; i++) {
      nl += '<div class="n-zeile"><span>' + NA.esc(S.lokal.namen[i]) + '</span><button type="button" class="knopf leise" data-wuerfeln="' + i + '">' + NA.icon('wuerfel') + 'neu würfeln</button></div>';
    }
    if (S.lokal.bot) nl += '<div class="n-zeile"><span>Computer</span><span class="hand">' + STAERKEN.filter(function (s) { return s[0] === S.lokal.staerke; })[0][1] + '</span></div>';
    $('setup-namen').innerHTML = nl;
  }
  $('s-setup').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.anzahl) { S.lokal.anzahl = +b.dataset.anzahl; zeichneSetup(); }
    else if (b.dataset.staerke) { S.lokal.staerke = +b.dataset.staerke; zeichneSetup(); }
    else if (b.dataset.wuerfeln) { var i = +b.dataset.wuerfeln; var andere = S.lokal.namen.filter(function (_, j) { return j !== i; }); S.lokal.namen[i] = NA.teamName(andere); zeichneSetup(); }
  });
  function lokalStarten() {
    S.modus = S.lokal.bot ? 'computer' : 'hotseat';
    S.teams = [];
    for (var i = 0; i < S.lokal.anzahl; i++) S.teams.push({ id: 'lokal-' + i, name: S.lokal.namen[i], punkte: 0, delta: 0, lokal: true, online: true, antwort: null });
    if (S.lokal.bot) S.teams.push({ id: 'bot', name: 'Computer', punkte: 0, delta: 0, bot: true, online: true, antwort: null });
    spielStarten();
  }

  /* Eingaben am Smartboard: pointerdown für gleichzeitiges Tippen mehrerer Teams, click für Tastatur */
  function lokaleAntwort(e) {
    var z = e.target.closest('.z-knopf');
    if (z) {
      var t = S.teams.filter(function (x) { return x.id === z.dataset.team; })[0];
      if (t) antwortEin(t, S.idx, +z.dataset.i);
      return;
    }
    var k = e.target.closest('button.antwort');
    if (k && S.modus !== 'netz') {
      var m = menschen();
      if (m.length === 1) antwortEin(m[0], S.idx, +k.dataset.i);
    }
  }
  $('s-frage').addEventListener('pointerdown', lokaleAntwort);
  $('s-frage').addEventListener('click', lokaleAntwort);

  /* ---------- Lehrkraft-Bereich ---------- */
  function lehrkraftZu() {
    if (S.panel) { S.panel.remove(); S.panel = null; document.removeEventListener('keydown', panelTaste); }
  }
  function panelTaste(e) { if (e.key === 'Escape') lehrkraftZu(); }
  function zweiStufen(knopf, frage, aktion) {
    var bereit = false, alt = knopf.textContent, t = null;
    knopf.addEventListener('click', function () {
      if (!bereit) { bereit = true; knopf.textContent = frage; knopf.classList.add('warnung'); t = setTimeout(function () { bereit = false; knopf.textContent = alt; knopf.classList.remove('warnung'); }, 5000); return; }
      clearTimeout(t); bereit = false; knopf.textContent = alt; knopf.classList.remove('warnung'); aktion();
    });
  }
  function oeffneLehrkraft() {
    lehrkraftZu();
    aktivitaet();
    var fb = NA.lies(NA.K.feedback, []);
    var hs = bestenliste();
    var proStation = [1, 2, 3, 4, 5].map(function (s) { return 'S' + s + ': ' + S.fragen.fragen.filter(function (f) { return f.station === s; }).length; }).join(' · ');
    var opt = function (werte, aktuell) {
      return werte.map(function (w) { return '<option value="' + w[0] + '"' + (String(w[0]) === String(aktuell) ? ' selected' : '') + '>' + w[1] + '</option>'; }).join('');
    };
    var o = document.createElement('div');
    o.className = 'overlay';
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'lk-titel');
    o.innerHTML = '<div class="karte lk-panel">' +
      '<h2 id="lk-titel">Lehrkraft-Bereich <button type="button" class="knopf" id="lk-zu">Schließen</button></h2>' +
      '<section><h3>Runde einstellen</h3>' +
      '<label>Fragen pro Runde <select id="lk-anzahl">' + opt([[5, 5], [8, 8], [10, 10], [12, 12], [15, 15]], EIN.anzahl) + '</select></label>' +
      '<label>Zeit pro Frage <select id="lk-zeit">' + opt([[0, 'wie in fragen.json'], [10, '10 s'], [15, '15 s'], [20, '20 s'], [30, '30 s'], [45, '45 s']], EIN.zeit) + '</select></label>' +
      '<label>Fragen von <select id="lk-station">' + opt([[0, 'allen Stationen']].concat([1, 2, 3, 4, 5].map(function (s) { return [s, 'nur Station ' + s + ' – ' + NA.STATIONEN[s]]; })), EIN.station) + '</select></label>' +
      '<p class="klein">Gilt ab der nächsten Runde.</p></section>' +
      '<section><h3>Fragen</h3><dl><dt>Titel</dt><dd>' + NA.esc(S.fragen.titel) + '</dd><dt>Quelle</dt><dd>' + NA.esc(S.fragen.herkunft) + '</dd><dt>Anzahl</dt><dd>' +
      S.fragen.fragen.length + ' (' + proStation + ')</dd></dl></section>' +
      '<section><h3>Feedback (' + fb.length + ' Einträge)</h3>' +
      '<button type="button" class="knopf" id="lk-fb-csv">Feedback als CSV speichern</button>' +
      '<button type="button" class="knopf leise" id="lk-fb-weg">Feedback löschen</button></section>' +
      '<section><h3>Bestenliste (' + hs.length + ' Einträge)</h3>' +
      '<button type="button" class="knopf" id="lk-hs-csv">Bestenliste als CSV speichern</button>' +
      '<button type="button" class="knopf leise" id="lk-hs-weg">Bestenliste zurücksetzen</button></section>' +
      '<section><h3>PIN ändern</h3><label>Neue PIN (4 Ziffern) <input id="lk-pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label>' +
      '<button type="button" class="knopf" id="lk-pin-ok">PIN speichern</button></section>' +
      '<section><h3>Verbindung</h3><dl><dt>Raum</dt><dd>' + (S.raum || '–') + '</dd><dt>Tablets</dt><dd>' +
      (S.netz === 'bereit' ? 'verbunden' : S.netz === 'weg' ? 'nicht möglich (Ausweichmodus)' : 'wird aufgebaut') + '</dd><dt>Exit-Feedback</dt><dd>' +
      (S.fbPeer && S.fbPeer.open ? 'empfangsbereit' : 'nicht verbunden') + '</dd></dl>' +
      '<button type="button" class="knopf leise" id="lk-neu">Seite neu laden</button></section>' +
      '<p class="meldung" id="lk-meldung" role="status"></p></div>';
    document.body.appendChild(o);
    S.panel = o;
    document.addEventListener('keydown', panelTaste);
    var meld = function (t) { o.querySelector('#lk-meldung').textContent = t; aktivitaet(); };
    o.querySelector('#lk-zu').addEventListener('click', lehrkraftZu);
    ['anzahl', 'zeit', 'station'].forEach(function (k) {
      o.querySelector('#lk-' + k).addEventListener('change', function (e) {
        EIN[k] = parseInt(e.target.value, 10) || 0;
        if (k === 'anzahl' && !EIN.anzahl) EIN.anzahl = 10;
        NA.schreib(NA.K.einstellungen, EIN);
        meld('Gespeichert.');
      });
    });
    o.querySelector('#lk-fb-csv').addEventListener('click', function () {
      NA.herunterladen('Nahost_Feedback_' + NA.dateiStempel() + '.csv', NA.feedbackCsv(NA.lies(NA.K.feedback, [])));
      meld('CSV wird gespeichert (Ordner „Downloads“).');
    });
    o.querySelector('#lk-hs-csv').addEventListener('click', function () {
      var l = bestenliste();
      NA.herunterladen('Nahost_Bestenliste_' + NA.dateiStempel() + '.csv',
        NA.csv(['Platz', 'Team', 'Punkte', 'Datum', 'Modus'], l.map(function (e, i) { return [i + 1, e.name, e.punkte, NA.datumDE(e.zeit), e.modus || '']; })));
      meld('CSV wird gespeichert (Ordner „Downloads“).');
    });
    zweiStufen(o.querySelector('#lk-fb-weg'), 'Wirklich alles Feedback löschen?', function () { NA.schreib(NA.K.feedback, []); meld('Feedback gelöscht.'); });
    zweiStufen(o.querySelector('#lk-hs-weg'), 'Wirklich die Bestenliste leeren?', function () { NA.schreib(NA.K.highscore, []); zeichneBestenliste(); meld('Bestenliste geleert.'); });
    o.querySelector('#lk-pin-ok').addEventListener('click', function () {
      var v = o.querySelector('#lk-pin').value.trim();
      if (!/^\d{4}$/.test(v)) { meld('Bitte genau 4 Ziffern eingeben.'); return; }
      NA.schreib(NA.K.pin, v); o.querySelector('#lk-pin').value = ''; meld('Neue PIN gespeichert. Bitte merken.');
    });
    o.querySelector('#lk-neu').addEventListener('click', function () { location.reload(); });
    o.querySelector('#lk-zu').focus();
  }

  /* ---------- Bedienelemente ---------- */
  $('knopf-start').addEventListener('click', function () { if (S.teams.length) spielStarten(); });
  $('knopf-lobby-abbruch').addEventListener('click', zurueckZumStart);
  $('knopf-computer').addEventListener('click', function () { oeffneSetup(true); });
  $('knopf-hotseat').addEventListener('click', function () { oeffneSetup(false); });
  $('knopf-setup-zurueck').addEventListener('click', zurueckZumStart);
  $('knopf-setup-los').addEventListener('click', lokalStarten);
  $('knopf-neu-verbinden').addEventListener('click', function () { S.netz = 'verbinde'; if (S.PeerKlasse) { erzeugePeer(); setTimeout(function () { if (S.netz !== 'bereit') netzWeg(); }, PEER_WARTEZEIT_MS); } else netzStart(); status('Verbindung wird aufgebaut …'); $('qr-karte').hidden = false; $('netz-weg').hidden = true; });
  $('knopf-weiter').addEventListener('click', function () { if (S.phase === 'aufloesung') rangliste(); });
  $('knopf-fb-fertig').addEventListener('click', zurueckZumStart);
  $('knopf-fb-senden').addEventListener('click', function () {
    if (fbForm && fbForm.hatEtwas()) speichereFeedback(feedbackEintrag(fbForm.daten(), 'Quiz (Smartboard)'));
    $('fb-host').hidden = true; $('knopf-fb-senden').hidden = true;
    $('fb-warten').hidden = false;
    $('fb-warten').innerHTML = '<p>Danke für eure Rückmeldung!</p>';
    timerStopp();
    nach(2500, zurueckZumStart);
  });

  NA.langDruck($('logo'), 3000, function () { NA.pinDialog(oeffneLehrkraft); });
  document.addEventListener('keydown', function (e) {
    aktivitaet();
    if (e.ctrlKey && e.altKey && (e.key === 'l' || e.key === 'L')) NA.pinDialog(oeffneLehrkraft);
  });
  document.addEventListener('pointerdown', aktivitaet, true);

  /* ---------- Wächter: Inaktivität, verlorene Teams, Verbindung ---------- */
  var letzterNetzCheck = Date.now();
  setInterval(function () {
    var jetzt = Date.now();
    var still = jetzt - S.aktiv;
    if ((S.phase === 'lobby' || S.phase === 'setup') && still > INAKTIV_MS) zurueckZumStart();
    if (S.phase === 'lobby') {
      var vorher = S.teams.length;
      S.teams = S.teams.filter(function (t) { return t.online || jetzt - t.wegSeit < 20000; });
      if (S.teams.length !== vorher) { zeichneLobby(); anAlle({ t: 'lobby', teams: S.teams.length }); }
      if (!S.teams.length) zurueckZumStart();
    }
    if (S.phase === 'start' && S.panel && still > INAKTIV_MS) lehrkraftZu();
    if (['frage', 'aufloesung', 'rang', 'podest'].indexOf(S.phase) >= 0 && still > 10 * 60000) zurueckZumStart();
    if (jetzt - letzterNetzCheck > 30000) {
      letzterNetzCheck = jetzt;
      if (S.peer && !S.peer.destroyed && S.peer.disconnected) { try { S.peer.reconnect(); } catch (e) { /* nächster Versuch */ } }
      if (S.peer && S.peer.destroyed && S.netz === 'bereit') { S.netz = 'verbinde'; erzeugePeer(); }
      if (S.netz === 'weg' && S.phase === 'start' && S.PeerKlasse && jetzt - (S.letzterVersuch || 0) > 120000) {
        S.letzterVersuch = jetzt; erzeugePeer();
      }
      if (S.fbPeer && !S.fbPeer.destroyed && S.fbPeer.disconnected) { try { S.fbPeer.reconnect(); } catch (e) { /* egal */ } }
    }
  }, 1000);

  /* ---------- Start ---------- */
  skalieren();
  zeichneBestenliste();
  zeige('s-start');
  NA.ladeFragen().then(function (d) {
    S.fragen = d;
    if (/muster/i.test(d.titel)) { $('muster-hinweis').hidden = false; $('muster-hinweis').textContent = d.titel; }
  }).catch(function () {
    S.fragen = { titel: 'Keine Fragen gefunden', herkunft: 'Fehler', fragen: [] };
    status('Keine Fragen gefunden. Bitte fragen.json prüfen.', true);
  });
  netzStart();

  /* Für die Qualitätsprüfung (keine Funktion für Besucher) */
  window.NAHOST_HOST = { zustand: function () { return { phase: S.phase, modus: S.modus, raum: S.raum, netz: S.netz, teams: S.teams.length, idx: S.idx }; } };
})();
