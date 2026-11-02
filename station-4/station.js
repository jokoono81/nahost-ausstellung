/* Station 4 – Szenario wählen, Folgen sehen (Denkmodelle, keine Vorhersagen) */
(function () {
  'use strict';
  var NA = window.NahostStation;
  var FARBEN = ['blau', 'apricot', 'weiss', 'rose'];
  var FORMEN = ['kreis', 'dreieck', 'quadrat', 'raute'];
  var SKALA = ['sehr unwahr&shy;scheinlich', 'eher unwahr&shy;scheinlich', 'offen', 'eher wahr&shy;scheinlich', 'sehr wahr&shy;scheinlich'];

  NA.start(function (d) {
    var spiel = document.getElementById('spiel');
    var sz = (d.szenarien || []).filter(function (s) { return s && s.titel; });
    var punkte = {};
    try { punkte = JSON.parse(sessionStorage.getItem('nahost-s4-punkte') || '{}'); } catch (e) { punkte = {}; }

    spiel.innerHTML =
      '<div class="s4-hinweis"><p class="karte rose prognose-notiz">Szenarien sind Denkmodelle – keine Vorhersagen.' +
      (d.stand ? ' Stand: ' + NA.esc(d.stand) : '') + '</p></div>' +
      '<section aria-labelledby="h-wahl"><h2 id="h-wahl" class="sr-only">Szenario wählen</h2><div class="szenario-wahl">' +
      sz.map(function (s, k) {
        var form = s.form || FORMEN[k % 4];
        return '<button type="button" class="karte szenario ' + FARBEN[k % 4] + (k % 2 ? ' nadel-blau' : '') + '" data-k="' + k + '" aria-pressed="false" aria-controls="ergebnis">' +
          NA.icon(form, 'form') + '<span>' + NA.esc(s.titel) + '</span></button>';
      }).join('') + '</div></section>' +
      '<div id="ergebnis" class="szenario-ergebnis" aria-live="polite"><p class="karte leer-hinweis">Wähle oben ein Szenario. Dann siehst du, was es für die Beteiligten bedeuten würde.</p></div>';

    var knoepfe = spiel.querySelectorAll('.szenario');
    knoepfe.forEach(function (b) { b.addEventListener('click', function () { zeigen(Number(b.getAttribute('data-k'))); }); });

    function zeigen(k) {
      var s = sz[k];
      knoepfe.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-k')) === k)); });
      var form = s.form || FORMEN[k % 4];
      var erg = document.getElementById('ergebnis');
      erg.innerHTML =
        '<section class="karte szenario-kopf angesteckt"><h2>' + NA.icon(form, 'form') + 'Szenario: ' + NA.esc(s.titel) + '</h2><p>' + NA.esc(s.kurz) + '</p></section>' +
        '<section aria-labelledby="h-folgen"><div class="spalte-kopf"><h2 id="h-folgen">Mögliche Folgen für …</h2></div><div class="folgen">' +
        (s.folgen || []).filter(function (f) { return f && (f.akteur || f.text); }).map(function (f, i) {
          return '<div class="karte folge' + (i % 2 ? ' nadel-blau' : '') + '"><h3>' + NA.esc(f.akteur) + '</h3><p>' + NA.esc(f.text) + '</p></div>';
        }).join('') + '</div></section>' +
        '<section class="karte gelb bedingungen" aria-labelledby="h-bed"><h3 id="h-bed">Was müsste dafür passieren?</h3><ul>' +
        (s.bedingungen || []).filter(Boolean).map(function (b) { return '<li>' + NA.icon('nadel') + '<span>' + NA.esc(b) + '</span></li>'; }).join('') +
        '</ul>' + (s.quelle ? '<p class="q" style="font-size:.8em;font-style:italic;margin-top:14px">Grundlage: ' + NA.esc(s.quelle) + '</p>' : '') + '</section>' +
        '<section class="karte klebepunkt nadel-blau" aria-labelledby="h-punkt"><h3 id="h-punkt">Dein Klebepunkt: Wie wahrscheinlich findest du dieses Szenario?</h3>' +
        '<div class="skala" role="group" aria-labelledby="h-punkt">' +
        SKALA.map(function (t, i) {
          var an = punkte[k] === i;
          return '<button type="button" data-p="' + i + '" aria-pressed="' + an + '">' + (an ? '<span class="dot" aria-hidden="true"></span>' : '') + '<span>' + t + '</span></button>';
        }).join('') + '</div><p class="hand" style="color:var(--tinte)">Begründe deinen Punkt kurz im Gespräch – an der Urteils-Wand kannst du ihn analog kleben.</p></section>';
      erg.querySelectorAll('.skala button').forEach(function (b) {
        b.addEventListener('click', function () {
          punkte[k] = Number(b.getAttribute('data-p'));
          try { sessionStorage.setItem('nahost-s4-punkte', JSON.stringify(punkte)); } catch (e) { /* egal */ }
          erg.querySelectorAll('.skala button').forEach(function (x) {
            var an = x === b;
            x.setAttribute('aria-pressed', String(an));
            var dot = x.querySelector('.dot');
            if (an && !dot) x.insertAdjacentHTML('afterbegin', '<span class="dot" aria-hidden="true"></span>');
            if (!an && dot) dot.remove();
          });
          NA.ansage('Dein Punkt: ' + b.textContent);
        });
      });
      erg.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
})();
