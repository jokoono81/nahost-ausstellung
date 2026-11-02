/* Station 2 – Zeitstrahl sortieren, danach zwei Sichten je Ereignis */
(function () {
  'use strict';
  var NA = window.NahostStation;

  NA.start(function (d) {
    var spiel = document.getElementById('spiel');
    var ev = (d.ereignisse || []).filter(function (e) { return e && e.titel && e.datum; });
    var n = ev.length;
    var richtig = ev.map(function (e, i) { return i; }).sort(function (a, b) {
      return String(ev[a].datum).localeCompare(String(ev[b].datum));
    });
    var slots, fest, stapel, pruefungen, aufgeloest, mitHilfe;

    function neu() {
      slots = new Array(n).fill(null);
      fest = new Array(n).fill(false);
      stapel = NA.mischen(ev.map(function (e, i) { return i; }));
      pruefungen = 0; aufgeloest = false; mitHilfe = false;
      zeichnen();
    }

    function karte(i, inSlot) {
      var e = ev[i];
      return '<button type="button" class="karte ohne-nadel ereignis ziehbar" data-e="' + i + '" aria-pressed="false">' +
        '<b>' + NA.esc(e.titel) + '</b><span>' + NA.esc(e.beschreibung) + '</span></button>';
    }
    function festeKarte(i, k) {
      var e = ev[i];
      var sichten = aufgeloest ?
        '<div class="sichten"><div><h4>Israelische Sicht</h4><p>' + NA.esc(e.israelisch) + '</p></div>' +
        '<div><h4>Palästinensische Sicht</h4><p>' + NA.esc(e.palaestinensisch) + '</p></div></div>' +
        (e.quelle ? '<p class="q" style="font-size:.78em;font-style:italic;margin-top:6px">Quelle: ' + NA.esc(e.quelle) + '</p>' : '') : '';
      return '<div class="karte ereignis fest' + (k % 2 ? ' nadel-blau' : '') + '">' +
        '<span class="datum">' + NA.icon('haken') + NA.esc(e.anzeige || e.datum) + '</span>' +
        '<b>' + NA.esc(e.titel) + '</b><span>' + NA.esc(e.beschreibung) + '</span>' + sichten + '</div>';
    }

    function zeichnen(fokusSlot) {
      var alleBelegt = slots.every(function (s) { return s !== null; });
      var html = '<div class="s2">' +
        '<section aria-labelledby="h-stapel"><div class="spalte-kopf"><h2 id="h-stapel">Ereignis-Karten</h2>' +
        '<p class="karte ohne-nadel fortschritt">' + fest.filter(Boolean).length + ' von ' + n + ' fest</p></div>' +
        '<div class="stapel ziel" id="stapel" data-slot="-1" aria-label="Kartenstapel">' +
        (stapel.length ? stapel.map(function (i) { return karte(i); }).join('') : '<p class="hand" style="color:var(--ink);padding:8px">' + (aufgeloest ? 'Alle Karten liegen richtig.' : 'Alle Karten liegen am Zeitstrahl.') + '</p>') +
        '</div></section>' +
        '<section aria-labelledby="h-strahl"><div class="spalte-kopf"><h2 id="h-strahl">Zeitstrahl</h2></div>' +
        '<p class="richtung">' + NA.icon('pfeil-hoch') + 'früher</p><ol class="strahl">' +
        slots.map(function (s, k) {
          var inhalt = fest[k] ? festeKarte(s, k) : (s === null ? '<div class="ablage">Platz ' + (k + 1) + ' – Karte hier ablegen</div>' : karte(s, true));
          return '<li class="slot"><span class="punkt" aria-hidden="true">' + (k + 1) + '</span>' +
            '<div class="platz ziel' + (fest[k] ? ' fest' : '') + '" data-slot="' + k + '"' + (fest[k] ? '' : ' role="button" tabindex="0" aria-label="Platz ' + (k + 1) + ' von ' + n + '"') + '>' + inhalt + '</div></li>';
        }).join('') +
        '</ol><p class="richtung unten">' + NA.icon('pfeil-runter') + 'später</p>' +
        '<div class="knopfreihe s2-knoepfe">' +
        (aufgeloest ? '<button type="button" class="knopf haupt" id="nochmal">' + NA.icon('neu') + 'Noch einmal</button>' :
          '<button type="button" class="knopf haupt" id="pruefen"' + (alleBelegt ? '' : ' disabled') + '>' + NA.icon('haken') + 'Prüfen</button>' +
          (pruefungen > 0 ? '<button type="button" class="knopf" id="loesung">' + NA.icon('auge') + 'Lösung zeigen</button>' : '') +
          (alleBelegt ? '' : '<span class="hand" style="color:var(--ink)">Erst alle Plätze belegen, dann prüfen.</span>')) +
        '</div><div id="s2-meldung"></div></section></div>';
      spiel.innerHTML = html;
      var b = document.getElementById('pruefen'); if (b) b.addEventListener('click', pruefen);
      var l = document.getElementById('loesung'); if (l) l.addEventListener('click', loesen);
      var m = document.getElementById('nochmal'); if (m) m.addEventListener('click', function () { neu(); spiel.scrollIntoView({ behavior: 'smooth' }); });
      if (fokusSlot != null) {
        var z = spiel.querySelector('.platz[data-slot="' + fokusSlot + '"]');
        if (z && z.getAttribute('tabindex')) z.focus({ preventScroll: true });
      }
    }

    function wo(i) { return slots.indexOf(i); }

    function ablegen(kartenEl, zielEl) {
      var i = Number(kartenEl.getAttribute('data-e'));
      var nach = Number(zielEl.getAttribute('data-slot'));
      var von = wo(i);
      if (nach === -1) {
        if (von >= 0) { slots[von] = null; stapel.push(i); }
        zeichnen();
        return;
      }
      if (fest[nach]) return;
      var alt = slots[nach];
      if (von >= 0) { slots[von] = alt; }
      else {
        stapel.splice(stapel.indexOf(i), 1);
        if (alt !== null) stapel.push(alt);
      }
      slots[nach] = i;
      zeichnen(nach);
      NA.ansage('„' + ev[i].titel + '“ liegt auf Platz ' + (nach + 1) + '.');
    }

    function pruefen() {
      pruefungen++;
      var neuRichtig = 0, falsch = [];
      slots.forEach(function (s, k) {
        if (fest[k]) return;
        if (s === richtig[k]) { fest[k] = true; neuRichtig++; }
        else if (s !== null) { falsch.push(s); slots[k] = null; }
      });
      stapel = stapel.concat(falsch);
      var anzahl = fest.filter(Boolean).length;
      if (anzahl === n) { aufloesen(false); return; }
      zeichnen();
      var box = document.getElementById('s2-meldung');
      box.innerHTML = '<div class="karte s2-meldung angesteckt"><p class="status-rueck">' + NA.icon('kreuz') +
        '<span>' + anzahl + ' von ' + n + ' Karten liegen richtig und stecken jetzt fest. ' + falsch.length +
        ' Karten liegen wieder auf dem Stapel – versuch es noch einmal.</span></p></div>';
      NA.ansage(box.textContent);
    }

    function loesen() {
      mitHilfe = true;
      slots = richtig.slice();
      stapel = [];
      aufloesen(true);
    }

    function aufloesen(hilfe) {
      fest = fest.map(function () { return true; });
      aufgeloest = true;
      zeichnen();
      var box = document.getElementById('s2-meldung');
      box.innerHTML = '<div class="karte gelb s2-meldung angesteckt"><p class="status-rueck">' + NA.icon('haken') + '<span>' +
        (hilfe ? 'Hier ist die richtige Reihenfolge.' : 'Geschafft! Alle Ereignisse liegen richtig' + (pruefungen > 1 ? ' (nach ' + pruefungen + ' Versuchen).' : ' – gleich beim ersten Versuch.')) +
        ' Jetzt siehst du bei jedem Ereignis die israelische und die palästinensische Sicht.</span></p></div>';
      NA.ansage(box.textContent);
    }

    neu();
    NA.ziehen({ wurzel: spiel, item: '.ereignis.ziehbar', ziel: '.ziel', ablegen: ablegen });
  });
})();
