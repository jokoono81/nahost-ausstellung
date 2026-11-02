/* Station 5 – Echt oder Fake? (beschriebene Posts, geprüft von Faktencheck-Redaktionen) */
(function () {
  'use strict';
  var NA = window.NahostStation;
  var URTEILE = [
    { id: 'echt', name: 'Echt', form: 'kreis', farbe: 'blau' },
    { id: 'gefaelscht', name: 'Gefälscht oder erfunden', form: 'dreieck', farbe: 'rose' },
    { id: 'kontext', name: 'Aus dem Zusammenhang gerissen', form: 'quadrat', farbe: 'gelb' }
  ];
  var NAME = { echt: 'Echt', gefaelscht: 'Gefälscht oder erfunden', kontext: 'Aus dem Zusammenhang gerissen' };

  NA.start(function (d) {
    var spiel = document.getElementById('spiel');
    var faelle = (d.faelle || []).filter(function (f) { return f && f.beschreibung && NAME[f.urteil]; });
    var tipps = (d.tipps || []).filter(Boolean);
    var reihe, pos, versuche, ersteRichtig;

    function tippKarte() {
      if (!tipps.length) return '';
      return '<aside class="karte tipps nadel-blau" aria-labelledby="h-tipps"><h2 id="h-tipps">' + NA.icon('lupe') + ' So prüfst du selbst</h2><ol>' +
        tipps.map(function (t) { return '<li>' + NA.esc(t) + '</li>'; }).join('') + '</ol></aside>';
    }

    function neu() { reihe = NA.mischen(faelle); pos = 0; ersteRichtig = 0; zeigen(); }

    function zeigen() {
      versuche = 0;
      var f = reihe[pos];
      spiel.innerHTML = '<div class="s5"><div>' +
        '<article class="karte fall angesteckt" aria-live="polite">' +
        '<p class="plattform">Fall ' + (pos + 1) + ' von ' + reihe.length + ' · ' + NA.esc(f.plattform || 'Soziale Medien') + '</p>' +
        '<p class="beschr"><b>Was man sieht:</b> ' + NA.esc(f.beschreibung) + '</p>' +
        '<p class="behauptung">' + NA.esc(f.behauptung) + '</p>' +
        '</article>' +
        '<div class="urteile" role="group" aria-label="Dein Urteil">' +
        URTEILE.map(function (u, k) {
          return '<button type="button" class="karte urteil ' + u.farbe + (k % 2 ? ' nadel-blau' : '') + '" data-u="' + u.id + '">' + NA.icon(u.form, 'form') + '<span>' + u.name + '</span></button>';
        }).join('') + '</div><div id="aufl"></div></div>' + tippKarte() + '</div>';
      spiel.querySelectorAll('.urteil').forEach(function (b) { b.addEventListener('click', function () { urteilen(b); }); });
    }

    function urteilen(btn) {
      var f = reihe[pos];
      var id = btn.getAttribute('data-u');
      versuche++;
      var box = document.getElementById('aufl');
      var richtig = id === f.urteil;
      if (!richtig && versuche < 2) {
        btn.disabled = true;
        btn.classList.add('falsch-markiert', 'wackelt');
        box.innerHTML = '<section class="karte aufloesung angesteckt"><p class="status-rueck">' + NA.icon('kreuz') +
          '<span>Noch nicht. Schau noch einmal genau hin: Passt das, was man sieht, wirklich zur Behauptung? Du hast noch einen Versuch.</span></p></section>';
        NA.ansage(box.textContent);
        return;
      }
      if (richtig && versuche === 1) ersteRichtig++;
      spiel.querySelectorAll('.urteil').forEach(function (b) {
        b.disabled = true;
        if (b.getAttribute('data-u') === f.urteil) b.classList.add('ist-loesung');
      });
      if (!richtig) btn.classList.add('falsch-markiert');
      var url = NA.sicherUrl(f.url);
      var letzte = pos === reihe.length - 1;
      box.innerHTML = '<section class="karte gelb aufloesung angesteckt">' +
        '<p class="status-rueck">' + NA.icon(richtig ? 'haken' : 'kreuz') + '<span>' + (richtig ? 'Richtig! ' : 'Leider nicht. ') + 'Ergebnis des Faktenchecks: ' + NAME[f.urteil] + '</span></p>' +
        '<p>' + NA.esc(f.aufloesung) + '</p>' +
        '<p class="pruefer">Geprüft von: ' + NA.esc(f.pruefer) + (f.datum ? ', ' + NA.esc(f.datum) : '') +
        (url ? ' · <a href="' + NA.esc(url) + '" target="_blank" rel="noopener">Faktencheck lesen ' + NA.icon('extern') + '</a>' : '') + '</p>' +
        '<div class="knopfreihe"><button type="button" class="knopf haupt" id="weiter">' + (letzte ? 'Auswertung' : 'Nächster Fall') + NA.icon('weiter') + '</button></div></section>';
      document.getElementById('weiter').addEventListener('click', function () {
        if (letzte) ende(); else { pos++; zeigen(); }
        spiel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      document.getElementById('weiter').focus({ preventScroll: true });
      NA.ansage(box.textContent);
    }

    function ende() {
      spiel.innerHTML = '<div class="s5"><section class="karte gelb fertig angesteckt" aria-live="polite">' +
        '<h2>Alle ' + reihe.length + ' Fälle geprüft</h2>' +
        '<p>Beim ersten Versuch richtig: ' + ersteRichtig + ' von ' + reihe.length + '.</p>' +
        '<p>Falschmeldungen gibt es von beiden Seiten. Oft ist das Bild echt – nur die Geschichte dazu stimmt nicht.</p>' +
        '<div class="knopfreihe"><button type="button" class="knopf" id="nochmal">' + NA.icon('neu') + 'Noch einmal</button></div></section>' + tippKarte() + '</div>';
      document.getElementById('nochmal').addEventListener('click', neu);
    }

    if (!faelle.length) {
      spiel.innerHTML = '<div class="karte fehler-karte"><h2>Noch keine Fälle</h2><p>Bitte im Baukasten Fälle ergänzen.</p></div>';
      return;
    }
    neu();
  });
})();
