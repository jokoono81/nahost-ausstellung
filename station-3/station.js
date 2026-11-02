/* Station 3 – Welche Theorie-Brille? */
(function () {
  'use strict';
  var NA = window.NahostStation;
  var STANDARD = [
    { id: 'realismus', name: 'Realismus', form: 'quadrat', kurz: 'Macht und Sicherheit; jeder verlässt sich auf die eigene Stärke.' },
    { id: 'liberalismus', name: 'Idealismus / Liberalismus', form: 'kreis', kurz: 'Zusammenarbeit, Regeln, Handel und internationale Organisationen.' },
    { id: 'hexagon', name: 'Senghaas-Hexagon', form: 'sechseck', kurz: 'Sechs Bausteine für inneren Frieden.' },
    { id: 'galtung', name: 'Galtung: Gewalt und Frieden', form: 'dreieck', kurz: 'Negativer und positiver Frieden, strukturelle Gewalt.' }
  ];
  var FARBEN = { realismus: 'blau', liberalismus: 'gelb', hexagon: 'rose', galtung: 'apricot' };

  NA.start(function (d) {
    var spiel = document.getElementById('spiel');
    var brillen = (d.brillen && d.brillen.length === 4 ? d.brillen : STANDARD);
    var nachId = {};
    brillen.forEach(function (b) { nachId[b.id] = b; });
    var aussagen = (d.aussagen || []).filter(function (a) { return a && a.aussage && nachId[a.brille]; });
    var reihe, pos, versuche, ersteRichtig;

    function neu() {
      reihe = NA.mischen(aussagen);
      pos = 0; ersteRichtig = 0;
      zeigen();
    }

    function zeigen() {
      versuche = 0;
      var a = reihe[pos];
      spiel.innerHTML = '<div class="s3">' +
        '<article class="karte aussage angesteckt" aria-live="polite">' +
        '<p class="zaehler">Aussage ' + (pos + 1) + ' von ' + reihe.length + '</p>' +
        '<blockquote>' + NA.esc(a.aussage) + '</blockquote>' +
        (a.herkunft ? '<p class="herkunft">' + NA.esc(a.herkunft) + '</p>' : '') +
        '</article>' +
        '<section aria-labelledby="h-brillen"><h2 id="h-brillen" class="sr-only">Theorie-Brillen</h2><div class="brillen">' +
        brillen.map(function (b, k) {
          return '<button type="button" class="karte brille ' + (FARBEN[b.id] || '') + (k % 2 ? ' nadel-blau' : '') + '" data-b="' + NA.esc(b.id) + '">' +
            NA.icon(b.form || 'kreis', 'form') + '<b>' + NA.esc(b.name) + '</b><span>' + NA.esc(b.kurz) + '</span></button>';
        }).join('') +
        '</div></section><div id="rueck"></div></div>';
      spiel.querySelectorAll('.brille').forEach(function (btn) {
        btn.addEventListener('click', function () { waehlen(btn); });
      });
    }

    function waehlen(btn) {
      var a = reihe[pos];
      var id = btn.getAttribute('data-b');
      versuche++;
      var rueck = document.getElementById('rueck');
      if (id === a.brille) {
        if (versuche === 1) ersteRichtig++;
        spiel.querySelectorAll('.brille').forEach(function (b) { b.disabled = true; });
        btn.classList.add('ist-loesung');
        var letzte = pos === reihe.length - 1;
        rueck.innerHTML = '<section class="karte gelb rueckkarte angesteckt">' +
          '<p class="status-rueck">' + NA.icon('haken') + '<span>Richtig: ' + NA.esc(nachId[id].name) + '</span></p>' +
          '<p>' + NA.esc(a.erklaerung) + '</p>' +
          (a.quelle ? '<p class="q">Quelle: ' + NA.esc(a.quelle) + '</p>' : '') +
          '<div class="knopfreihe"><button type="button" class="knopf haupt" id="weiter">' +
          (letzte ? 'Auswertung' : 'Nächste Aussage') + NA.icon('weiter') + '</button></div></section>';
        document.getElementById('weiter').addEventListener('click', function () {
          if (letzte) ende(); else { pos++; zeigen(); }
          spiel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        document.getElementById('weiter').focus({ preventScroll: true });
        rueck.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        btn.disabled = true;
        btn.classList.add('falsch-markiert', 'wackelt');
        rueck.innerHTML = '<section class="karte rueckkarte angesteckt">' +
          '<p class="status-rueck">' + NA.icon('kreuz') + '<span>Noch nicht. Die Brille „' + NA.esc(nachId[id].name) + '“ achtet auf etwas anderes.</span></p>' +
          '<p>Lies die Aussage noch einmal: Geht es um Macht, um Zusammenarbeit, um Bausteine einer friedlichen Gesellschaft – oder um Gerechtigkeit und versteckte Gewalt?</p></section>';
        NA.ansage(rueck.textContent);
      }
    }

    function ende() {
      spiel.innerHTML = '<div class="s3"><section class="karte gelb fertig angesteckt" aria-live="polite">' +
        '<h2>Alle ' + reihe.length + ' Aussagen eingeordnet</h2>' +
        '<p>Beim ersten Versuch richtig: ' + ersteRichtig + ' von ' + reihe.length + '.</p>' +
        '<p>Manche Aussagen passen zu mehr als einer Brille. Gezählt hat hier die Brille, die am besten passt.</p>' +
        '<div class="knopfreihe"><button type="button" class="knopf" id="nochmal">' + NA.icon('neu') + 'Noch einmal</button></div></section></div>';
      document.getElementById('nochmal').addEventListener('click', neu);
    }

    if (!aussagen.length) {
      spiel.innerHTML = '<div class="karte fehler-karte"><h2>Noch keine Aussagen</h2><p>Bitte im Baukasten Aussagen ergänzen.</p></div>';
      return;
    }
    neu();
  });
})();
