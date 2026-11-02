/* Exit-Feedback: speichert auf diesem Gerät und schickt Einträge an das Smartboard, wenn es erreichbar ist. */
(function () {
  'use strict';
  var NA = window.NA;
  var $ = function (id) { return document.getElementById(id); };
  var INAKTIV_MS = 60000;

  var form = null, letzteEingabe = Date.now(), peer = null, sendetGerade = false, status = 'noch nicht versucht', panel = null;

  function eintraege() { return NA.lies(NA.K.exit, []); }
  function speichern(l) { return NA.schreib(NA.K.exit, l.slice(-5000)); }

  function neuesFormular() {
    form = NA.baueFeedbackFormular($('exit-fragen'), { idPrefix: 'exit', nichtGespielt: true, beiAenderung: function () { letzteEingabe = Date.now(); $('exit-meldung').textContent = ''; } });
    $('exit-fragen').querySelector('textarea').addEventListener('input', function () { letzteEingabe = Date.now(); });
    $('exit-form').hidden = false;
    $('exit-danke').hidden = true;
  }

  $('exit-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.hatEtwas()) { $('exit-meldung').textContent = 'Tippe mindestens einen Smiley an.'; return; }
    var d = form.daten();
    var l = eintraege();
    l.push({ id: NA.uid(), zeit: new Date().toISOString(), f1: d.f1, f2: d.f2, f3: d.f3, text: d.text, uebertragen: false });
    if (!speichern(l)) { $('exit-meldung').textContent = 'Speichern hat nicht geklappt. Bitte der Lehrkraft Bescheid sagen.'; return; }
    $('exit-form').hidden = true;
    $('exit-danke').hidden = false;
    window.scrollTo(0, 0);
    setTimeout(neuesFormular, 6000);
    weiterleiten();
  });

  /* ---------- Weiterleiten an den Host (fester Kanal) ---------- */
  function weiterleiten() {
    var offen = eintraege().filter(function (e) { return !e.uebertragen; });
    if (!offen.length || sendetGerade) return;
    sendetGerade = true;
    var fertig = function (s) { sendetGerade = false; status = s; zeichnePanel(); };
    NA.ladePeerJS().then(function (Peer) {
      var los = function () {
        var c = peer.connect(NA.FEEDBACK_ID, { reliable: true });
        var t = setTimeout(function () { try { c.close(); } catch (e) { /* egal */ } fertig('Smartboard nicht erreichbar (' + NA.datumDE(new Date().toISOString()) + ')'); }, 8000);
        c.on('open', function () {
          c.send({ t: 'exit-feedback', eintraege: offen.map(function (e) { return { id: e.id, zeit: e.zeit, f1: e.f1, f2: e.f2, f3: e.f3, text: e.text }; }) });
        });
        c.on('data', function (m) {
          if (!m || m.t !== 'ok' || !Array.isArray(m.ids)) return;
          clearTimeout(t);
          var l = eintraege();
          l.forEach(function (e) { if (m.ids.indexOf(e.id) >= 0) e.uebertragen = true; });
          speichern(l);
          try { c.close(); } catch (e) { /* egal */ }
          fertig('übertragen: ' + m.ids.length + ' Einträge (' + NA.datumDE(new Date().toISOString()) + ')');
        });
        c.on('error', function () { clearTimeout(t); fertig('Smartboard nicht erreichbar'); });
      };
      if (peer && !peer.destroyed && peer.open) { los(); return; }
      if (peer) { try { peer.destroy(); } catch (e) { /* egal */ } }
      peer = new Peer(NA.peerOptionen());
      var t0 = setTimeout(function () { fertig('Netz blockiert – nur lokal gespeichert'); }, 8000);
      peer.on('open', function () { clearTimeout(t0); los(); });
      peer.on('error', function (err) {
        clearTimeout(t0);
        fertig(err && err.type === 'peer-unavailable' ? 'Smartboard nicht erreichbar – nur lokal gespeichert' : 'Netz blockiert – nur lokal gespeichert');
      });
    }).catch(function () { fertig('PeerJS nicht ladbar – nur lokal gespeichert'); });
  }

  /* ---------- Lehrkraft ---------- */
  function zeichnePanel() {
    if (!panel) return;
    var l = eintraege();
    var ueb = l.filter(function (e) { return e.uebertragen; }).length;
    panel.querySelector('#ex-stand').innerHTML = '<dt>Einträge</dt><dd>' + l.length + '</dd><dt>davon ans Smartboard übertragen</dt><dd>' + ueb + '</dd><dt>Letzter Versuch</dt><dd>' + NA.esc(status) + '</dd>';
  }
  function panelZu() { if (panel) { panel.remove(); panel = null; } }
  function oeffnePanel() {
    panelZu();
    var o = document.createElement('div');
    o.className = 'overlay';
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'ex-titel');
    o.innerHTML = '<div class="karte lk-panel exit-panel"><h2 id="ex-titel">Lehrkraft-Bereich <button type="button" class="knopf" id="ex-zu">Schließen</button></h2>' +
      '<section><h3>Stand auf diesem Gerät</h3><dl id="ex-stand"></dl></section>' +
      '<section><h3>Aktionen</h3><button type="button" class="knopf" id="ex-csv">Feedback als CSV speichern</button>' +
      '<button type="button" class="knopf" id="ex-senden">Jetzt ans Smartboard senden</button>' +
      '<button type="button" class="knopf leise" id="ex-weg">Feedback auf diesem Gerät löschen</button>' +
      '<label>Neue PIN (4 Ziffern) <input id="ex-pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label>' +
      '<button type="button" class="knopf" id="ex-pin-ok">PIN speichern</button></section>' +
      '<p class="meldung" id="ex-meldung" role="status"></p></div>';
    document.body.appendChild(o);
    panel = o;
    zeichnePanel();
    var meld = function (t) { o.querySelector('#ex-meldung').textContent = t; };
    o.querySelector('#ex-zu').addEventListener('click', panelZu);
    o.addEventListener('keydown', function (e) { if (e.key === 'Escape') panelZu(); });
    o.querySelector('#ex-csv').addEventListener('click', function () {
      var l = eintraege().map(function (e) { return Object.assign({}, e, { herkunft: e.uebertragen ? 'Exit-Tablet (auch am Smartboard)' : 'Exit-Tablet (nur hier)' }); });
      NA.herunterladen('Nahost_ExitFeedback_' + NA.dateiStempel() + '.csv', NA.feedbackCsv(l));
      meld('CSV wird gespeichert (Ordner „Downloads“).');
    });
    o.querySelector('#ex-senden').addEventListener('click', function () { status = 'sende …'; zeichnePanel(); weiterleiten(); });
    var bereit = false;
    o.querySelector('#ex-weg').addEventListener('click', function (e) {
      if (!bereit) { bereit = true; e.currentTarget.textContent = 'Wirklich löschen?'; e.currentTarget.classList.add('warnung'); return; }
      speichern([]); bereit = false; e.currentTarget.textContent = 'Feedback auf diesem Gerät löschen'; e.currentTarget.classList.remove('warnung');
      zeichnePanel(); meld('Gelöscht.');
    });
    o.querySelector('#ex-pin-ok').addEventListener('click', function () {
      var v = o.querySelector('#ex-pin').value.trim();
      if (!/^\d{4}$/.test(v)) { meld('Bitte genau 4 Ziffern eingeben.'); return; }
      NA.schreib(NA.K.pin, v); o.querySelector('#ex-pin').value = ''; meld('Neue PIN gespeichert.');
    });
    o.querySelector('#ex-zu').focus();
  }

  NA.langDruck($('exit-kopf'), 3000, function () { NA.pinDialog(oeffnePanel); });
  document.addEventListener('keydown', function (e) {
    letzteEingabe = Date.now();
    if (e.ctrlKey && e.altKey && (e.key === 'l' || e.key === 'L')) NA.pinDialog(oeffnePanel);
  });
  document.addEventListener('pointerdown', function () { letzteEingabe = Date.now(); }, true);

  /* Unbeaufsichtigt: halb ausgefülltes Formular nach 60 s leeren, Lehrkraft-Bereich schließen */
  setInterval(function () {
    if (Date.now() - letzteEingabe > INAKTIV_MS) {
      if (form && form.hatEtwas() && !$('exit-form').hidden) neuesFormular();
      panelZu();
      var pd = document.getElementById('pin-dialog'); if (pd) pd.remove();
      letzteEingabe = Date.now();
    }
  }, 5000);
  setInterval(weiterleiten, 5 * 60000);

  neuesFormular();
  setTimeout(weiterleiten, 1500);
})();
