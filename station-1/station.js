/* Station 1 – Akteur ↔ Interesse zuordnen */
(function () {
  'use strict';
  var NA = window.NahostStation;

  NA.start(function (d) {
    var spiel = document.getElementById('spiel');
    var paare = (d.paare || []).filter(function (p) { return p && p.akteur && p.interesse; });
    var fehler = 0, geschafft = 0;

    function aufbauen() {
      fehler = 0; geschafft = 0;
      var akteure = NA.mischen(paare.map(function (p, i) { return { p: p, i: i }; }));
      var interessen = NA.mischen(paare.map(function (p, i) { return { p: p, i: i }; }));
      spiel.innerHTML =
        '<div class="s1">' +
        '<section aria-labelledby="h-akteure">' +
        '<div class="spalte-kopf"><h2 id="h-akteure">Akteure</h2><p class="karte ohne-nadel fortschritt" id="fortschritt"></p></div>' +
        '<div class="akteure" id="akteure">' +
        akteure.map(function (a, k) {
          return '<button type="button" class="karte oval gelb ohne-nadel akteur ziehbar" data-i="' + a.i + '" aria-pressed="false">' + NA.esc(a.p.akteur) + '</button>';
        }).join('') +
        '</div></section>' +
        '<section aria-labelledby="h-interessen">' +
        '<div class="spalte-kopf"><h2 id="h-interessen">Interessen</h2></div>' +
        '<div class="interessen" id="interessen">' +
        interessen.map(function (x, k) {
          return '<div class="karte interesse ziel' + (k % 2 ? ' nadel-blau' : '') + '" data-i="' + x.i + '" role="button" tabindex="0" aria-label="Interesse: ' + NA.esc(x.p.interesse) + ' – Akteur hier anstecken">' +
            '<p>' + NA.esc(x.p.interesse) + '</p>' +
            '<div class="ablage">' + NA.icon('nadel') + 'Akteur hier anstecken</div></div>';
        }).join('') +
        '</div></section></div>' +
        '<div id="fertig-box"></div>';
      zaehle();
    }

    function zaehle() {
      var f = document.getElementById('fortschritt');
      if (f) f.textContent = geschafft + ' von ' + paare.length + ' zugeordnet';
    }

    function ablegen(akteurEl, zielEl) {
      var ai = Number(akteurEl.getAttribute('data-i'));
      var zi = Number(zielEl.getAttribute('data-i'));
      var p = paare[ai];
      if (ai === zi) {
        geschafft++;
        akteurEl.remove();
        zielEl.classList.add('fest', 'angesteckt');
        zielEl.removeAttribute('role');
        zielEl.removeAttribute('tabindex');
        zielEl.setAttribute('aria-label', 'Richtig zugeordnet: ' + p.akteur + ' – ' + p.interesse);
        zielEl.querySelector('.ablage').outerHTML =
          '<div class="angeheftet">' +
          '<span class="mini-oval">' + NA.icon('haken') + NA.esc(p.akteur) + '</span>' +
          '<p class="status-rueck ist-richtig rueck">' + NA.esc(p.rueckmeldung || 'Richtig.') + '</p>' +
          (p.quelle ? '<p class="q">Quelle: ' + NA.esc(p.quelle) + '</p>' : '') +
          '</div>';
        NA.meldung(NA.icon('haken') + '<span><b>Richtig:</b> ' + NA.esc(p.akteur) + '</span>');
        zaehle();
        if (geschafft === paare.length) fertig();
      } else {
        fehler++;
        zielEl.classList.remove('wackelt');
        void zielEl.offsetWidth;
        zielEl.classList.add('wackelt', 'falsch-markiert');
        setTimeout(function () { zielEl.classList.remove('falsch-markiert'); }, 1600);
        NA.meldung(NA.icon('kreuz') + '<span><b>Noch nicht:</b> „' + NA.esc(p.akteur) + '“ passt nicht zu diesem Interesse. Lies noch einmal genau – wer würde das sagen?</span>', 5200);
        akteurEl.focus();
      }
    }

    function fertig() {
      var box = document.getElementById('fertig-box');
      box.innerHTML = '<section class="karte gelb fertig angesteckt" aria-live="polite">' +
        '<h2>Alle ' + paare.length + ' Akteure zugeordnet</h2>' +
        '<p>Fehlversuche: ' + fehler + '. Schau dir jetzt unten an, wo sich die Erzählungen widersprechen.</p>' +
        '<div class="knopfreihe"><button type="button" class="knopf" id="nochmal">' + NA.icon('neu') + 'Noch einmal</button></div></section>';
      document.getElementById('nochmal').addEventListener('click', function () { aufbauen(); window.scrollTo({ top: spiel.offsetTop - 20, behavior: 'smooth' }); });
      var leer = document.getElementById('akteure');
      if (leer) leer.innerHTML = '<p class="leer">Alle Karten hängen an der Wand.</p>';
    }

    aufbauen();
    NA.ziehen({ wurzel: spiel, item: '.akteur', ziel: '.interesse', ablegen: ablegen });
  });
})();
