/* Quiz-Baukasten: Fragen eingeben, prüfen, mehrere fragen.json zusammenführen, fragen.json exportieren. */
(function () {
  'use strict';
  var ENTWURF = 'nahost-baukasten-quiz';
  var FORM = [
    { name: 'Dreieck', icon: 'dreieck', farbe: 'gelb' },
    { name: 'Raute', icon: 'raute', farbe: 'blau' },
    { name: 'Kreis', icon: 'kreis', farbe: 'apricot' },
    { name: 'Quadrat', icon: 'quadrat', farbe: 'rose' }
  ];
  var STATION = { 0: 'ohne Station', 1: '1 Konfliktinhalt', 2: '2 Konfliktverlauf', 3: '3 Konfliktstrukturen', 4: '4 Konfliktprognose', 5: '5 Wahrnehmung' };
  var ZEITEN = [10, 15, 20, 25, 30, 45, 60];

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var icon = function (n, cls) { return '<svg class="ic ' + (cls || '') + '" aria-hidden="true" focusable="false"><use href="#i-' + n + '"></use></svg>'; };
  var $ = function (id) { return document.getElementById(id); };

  var daten = { version: 1, titel: '', fragen: [] };
  var aktiv = 0;
  var filter = 0;

  function leereFrage() {
    return { station: filter || 1, frage: '', antworten: ['', '', '', ''], richtig: -1, erklaerung: '', quelle: '', zeit: 20 };
  }
  function normFrage(f) {
    f = f || {};
    var a = Array.isArray(f.antworten) ? f.antworten.slice(0, 4).map(function (x) { return String(x == null ? '' : x); }) : [];
    while (a.length < 4) a.push('');
    var r = parseInt(f.richtig, 10);
    var z = parseInt(f.zeit, 10);
    var st = parseInt(f.station, 10);
    return {
      station: st >= 1 && st <= 5 ? st : 0,
      frage: String(f.frage || ''),
      antworten: a,
      richtig: r >= 0 && r <= 3 ? r : -1,
      erklaerung: String(f.erklaerung || ''),
      quelle: String(f.quelle || ''),
      zeit: z >= 5 && z <= 120 ? z : 20
    };
  }
  function schluessel(f) { return String(f.frage || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim(); }

  /* ---------- Speichern ---------- */
  var timer = null;
  function speichern() {
    clearTimeout(timer);
    $('speicherstatus').textContent = 'Änderungen …';
    timer = setTimeout(function () {
      try {
        localStorage.setItem(ENTWURF, JSON.stringify({ daten: daten, aktiv: aktiv }));
        $('speicherstatus').textContent = 'Entwurf gespeichert ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      } catch (e) { $('speicherstatus').textContent = 'Entwurf konnte nicht gespeichert werden.'; }
    }, 350);
  }

  /* ---------- Prüfen ---------- */
  function woerter(s) { return String(s).trim().split(/\s+/).filter(Boolean).length; }
  function pruefeFrage(f, i) {
    var p = [];
    function m(stufe, feld, text) { p.push({ stufe: stufe, feld: feld, text: text, i: i }); }
    var fr = f.frage.trim();
    if (!fr) m('fehler', 'frage', 'Die Frage fehlt.');
    else {
      if (fr.length > 140) m('hinweis', 'frage', 'Die Frage ist ' + fr.length + ' Zeichen lang. Am Smartboard lieber unter 120.');
      if (!/\?\s*$/.test(fr) && !/…|\.\.\.|_{2,}/.test(fr)) m('hinweis', 'frage', 'Die Frage endet nicht mit einem Fragezeichen.');
      if (/\b(nicht|kein|keine|keiner|keinen)\b/i.test(fr) && !/\b(NICHT|KEIN|KEINE|KEINER|KEINEN)\b/.test(fr)) m('hinweis', 'frage', 'Verneinung in der Frage: Schreibt „NICHT“/„KEIN“ groß, sonst wird es überlesen.');
      if (fr.split(/(?<=[.!?])\s+/).some(function (s) { return woerter(s) > 22; })) m('hinweis', 'frage', 'Ein Satz hat mehr als 22 Wörter – für Klasse 9 teilen.');
    }
    var leer = 0;
    f.antworten.forEach(function (a, k) {
      var t = a.trim();
      if (!t) { leer++; m('fehler', 'a' + k, 'Antwort ' + FORM[k].name + ' fehlt.'); return; }
      if (t.length > 70) m('hinweis', 'a' + k, 'Antwort ' + FORM[k].name + ' ist lang (' + t.length + ' Zeichen). Kürzer = besser lesbar.');
      if (/^(alle|keine) (der|davon|genannten)|^beide|alle antworten/i.test(t)) m('hinweis', 'a' + k, '„Alle/keine der genannten“ vermeiden – das ist oft geraten statt gewusst.');
    });
    var gesehen = {};
    f.antworten.forEach(function (a, k) {
      var t = a.trim().toLowerCase();
      if (!t) return;
      if (gesehen[t] != null) m('fehler', 'a' + k, 'Antwort ' + FORM[k].name + ' ist gleich wie Antwort ' + FORM[gesehen[t]].name + '.');
      gesehen[t] = k;
    });
    if (f.richtig < 0) m('fehler', 'richtig', 'Bitte die richtige Antwort markieren.');
    else if (!leer) {
      var lr = f.antworten[f.richtig].trim().length;
      var andere = f.antworten.filter(function (x, k) { return k !== f.richtig; }).map(function (x) { return x.trim().length; });
      var schnitt = andere.reduce(function (s, x) { return s + x; }, 0) / andere.length;
      if (lr > 25 && lr > schnitt * 1.6) m('hinweis', 'a' + f.richtig, 'Die richtige Antwort ist viel länger als die anderen – das verrät sie.');
    }
    if (!f.station) m('fehler', 'station', 'Bitte eine Station wählen.');
    if (!f.quelle.trim()) m('fehler', 'quelle', 'Die Quelle fehlt. Jede Tatsache braucht einen Beleg.');
    else if (f.quelle.trim().length < 8) m('hinweis', 'quelle', 'Quelle genauer angeben: Wer? Welcher Text? Wann?');
    if (!f.erklaerung.trim()) m('hinweis', 'erklaerung', 'Ohne Erklärung lernen die Besucher nichts dazu. 1–2 Sätze reichen.');
    else {
      if (f.erklaerung.trim().length > 300) m('hinweis', 'erklaerung', 'Die Erklärung ist lang. Am Smartboard lieber unter 300 Zeichen.');
      if (f.erklaerung.split(/(?<=[.!?])\s+/).some(function (s) { return woerter(s) > 22; })) m('hinweis', 'erklaerung', 'Ein Satz der Erklärung hat mehr als 22 Wörter.');
    }
    return p;
  }
  function pruefeAlle() {
    var alle = [];
    var gesehen = {};
    daten.fragen.forEach(function (f, i) {
      alle = alle.concat(pruefeFrage(f, i));
      var k = schluessel(f);
      if (k) {
        if (gesehen[k] != null) alle.push({ stufe: 'fehler', feld: 'frage', i: i, text: 'Diese Frage gibt es schon (Frage ' + (gesehen[k] + 1) + ').' });
        else gesehen[k] = i;
      }
    });
    return alle;
  }
  function gesamtHinweise() {
    var h = [];
    var n = daten.fragen.length;
    if (!n) return h;
    for (var s = 1; s <= 5; s++) {
      var c = daten.fragen.filter(function (f) { return f.station === s; }).length;
      if (c < 2) h.push('Station ' + s + ' hat nur ' + c + ' Frage' + (c === 1 ? '' : 'n') + ' – mindestens 2 je Station.');
    }
    if (n >= 6) {
      var pos = [0, 0, 0, 0];
      daten.fragen.forEach(function (f) { if (f.richtig >= 0) pos[f.richtig]++; });
      pos.forEach(function (c, k) { if (c > n * 0.45) h.push('Die richtige Antwort ist auffällig oft „' + FORM[k].name + '“ (' + c + ' von ' + n + '). Besser mischen.'); });
    }
    return h;
  }

  /* ---------- Zeichnen ---------- */
  function liste(probleme) {
    var counts = [0, 0, 0, 0, 0, 0];
    daten.fragen.forEach(function (f) { counts[f.station]++; });
    $('filter').innerHTML = [0, 1, 2, 3, 4, 5].map(function (s) {
      var anz = s === 0 ? daten.fragen.length : counts[s];
      return '<button type="button" data-filter="' + s + '" aria-pressed="' + (filter === s) + '">' + (s === 0 ? 'Alle' : 'St. ' + s) + ' (' + anz + ')</button>';
    }).join('');
    var html = daten.fragen.map(function (f, i) {
      if (filter && f.station !== filter) return '';
      var fe = probleme.filter(function (p) { return p.i === i && p.stufe === 'fehler'; }).length;
      var hi = probleme.filter(function (p) { return p.i === i && p.stufe === 'hinweis'; }).length;
      return '<li><button type="button" data-i="' + i + '"' + (i === aktiv ? ' aria-current="true"' : '') + '>' +
        '<span class="st">' + (i + 1) + '.</span><span>' + (f.frage.trim() ? esc(f.frage.trim().slice(0, 70)) : '<i>(noch leer)</i>') + '</span>' +
        '<span class="zust' + (fe ? ' f' : '') + '">' + (fe ? icon('kreuz') + fe + ' Fehler' : icon('haken') + 'ok') + (hi ? ' · ' + hi + ' Tipp' + (hi > 1 ? 's' : '') : '') + ' · St. ' + (f.station || '–') + '</span></button></li>';
    }).join('');
    $('fl').innerHTML = html || '<li class="hand">Keine Fragen' + (filter ? ' für Station ' + filter : '') + '.</li>';
  }

  function feldMeldungen(probleme) {
    var form = $('frage-form');
    form.querySelectorAll('.feldmeldung').forEach(function (el) { el.textContent = ''; el.className = 'feldmeldung'; });
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    probleme.filter(function (p) { return p.i === aktiv; }).forEach(function (p) {
      var m = $('m-' + p.feld);
      if (m && !m.textContent) { m.textContent = p.text; m.className = 'feldmeldung ' + p.stufe; }
      var el = $('q-' + p.feld);
      if (el && p.stufe === 'fehler') el.setAttribute('aria-invalid', 'true');
    });
  }

  function formular() {
    var f = daten.fragen[aktiv];
    var box = $('frage-form');
    if (!f) {
      box.innerHTML = '<p class="karte leer-hinweis">Noch keine Fragen. Klickt auf „Neue Frage“ oder ladet eine fragen.json.</p>';
      return;
    }
    box.innerHTML =
      '<fieldset class="karte block"><legend>Frage ' + (aktiv + 1) + ' von ' + daten.fragen.length + '</legend>' +
      '<div class="zwei-spalten">' +
      '<div class="feld"><label for="q-station">Station</label><select id="q-station" data-k="station">' +
      [1, 2, 3, 4, 5, 0].map(function (s) { return '<option value="' + s + '"' + (f.station === s ? ' selected' : '') + '>' + STATION[s] + '</option>'; }).join('') +
      '</select><p class="feldmeldung" id="m-station" aria-live="polite"></p></div>' +
      '<div class="feld"><label for="q-zeit">Zeit zum Antworten</label><select id="q-zeit" data-k="zeit">' +
      ZEITEN.concat(ZEITEN.indexOf(f.zeit) < 0 ? [f.zeit] : []).map(function (z) { return '<option value="' + z + '"' + (f.zeit === z ? ' selected' : '') + '>' + z + ' Sekunden</option>'; }).join('') +
      '</select></div></div>' +
      '<div class="feld"><label for="q-frage">Frage</label><p class="hinweis" id="h-frage">Kurz, eindeutig, eine Sache pro Frage. Für Klasse 9 verständlich.</p>' +
      '<textarea id="q-frage" data-k="frage" rows="2" aria-describedby="h-frage">' + esc(f.frage) + '</textarea><p class="feldmeldung" id="m-frage" aria-live="polite"></p></div>' +
      '<fieldset class="unterliste" id="q-richtig"><legend>Vier Antworten – die richtige anklicken</legend>' +
      '<p class="hinweis">Falsche Antworten sollen plausibel klingen. Alle ungefähr gleich lang.</p>' +
      f.antworten.map(function (a, k) {
        return '<div class="antwort-feld"><input type="radio" name="richtig" id="r-' + k + '" value="' + k + '"' + (f.richtig === k ? ' checked' : '') + ' aria-label="' + FORM[k].name + ' ist richtig">' +
          icon(FORM[k].icon, 'form') +
          '<label class="sr-only" for="q-a' + k + '">Antwort ' + FORM[k].name + '</label><input type="text" id="q-a' + k + '" data-a="' + k + '" value="' + esc(a) + '" placeholder="Antwort ' + FORM[k].name + '">' +
          '<p class="feldmeldung" id="m-a' + k + '" aria-live="polite"></p></div>';
      }).join('') +
      '<p class="feldmeldung" id="m-richtig" aria-live="polite"></p></fieldset>' +
      '<div class="feld"><label for="q-erklaerung">Erklärung nach der Auflösung</label><textarea id="q-erklaerung" data-k="erklaerung" rows="3">' + esc(f.erklaerung) + '</textarea><p class="feldmeldung" id="m-erklaerung" aria-live="polite"></p></div>' +
      '<div class="feld"><label for="q-quelle">Quelle</label><p class="hinweis" id="h-quelle">z. B. „bpb.de, Hintergrund aktuell, 10.10.2025“ – aus eurem Quellenpool.</p><input type="text" id="q-quelle" data-k="quelle" value="' + esc(f.quelle) + '" aria-describedby="h-quelle"><p class="feldmeldung" id="m-quelle" aria-live="polite"></p></div>' +
      '<div class="knopfreihe" style="display:flex;flex-wrap:wrap;gap:10px">' +
      '<button type="button" class="knopf" id="f-hoch"' + (aktiv === 0 ? ' disabled' : '') + '>' + icon('pfeil-hoch') + 'nach oben</button>' +
      '<button type="button" class="knopf" id="f-runter"' + (aktiv === daten.fragen.length - 1 ? ' disabled' : '') + '>' + icon('pfeil-runter') + 'nach unten</button>' +
      '<button type="button" class="knopf" id="f-kopie">' + icon('plus') + 'Kopie anlegen</button>' +
      '<button type="button" class="knopf warnung" id="f-weg">' + icon('muell') + 'Frage löschen</button></div>' +
      '</fieldset>';
  }

  function vorschau() {
    var f = daten.fragen[aktiv];
    var v = $('vorschau-box');
    if (!f) { v.innerHTML = ''; return; }
    v.innerHTML = '<h2>So sieht es in der Arena aus</h2><p class="v-frage">' + (esc(f.frage) || '<span class="hand">Frage …</span>') + '</p><div class="v-antw">' +
      f.antworten.map(function (a, k) {
        return '<div class="' + FORM[k].farbe + (f.richtig === k ? ' richtig' : '') + '">' + icon(FORM[k].icon, 'form') + '<span>' + (esc(a) || '…') + (f.richtig === k ? '<span class="sr-only"> (richtig)</span>' : '') + '</span></div>';
      }).join('') + '</div>' +
      (f.erklaerung ? '<p class="v-erkl"><b>Erklärung:</b> ' + esc(f.erklaerung) + '</p>' : '') +
      (f.quelle ? '<p class="v-erkl"><i>Quelle: ' + esc(f.quelle) + '</i></p>' : '');
  }

  function bilanz(probleme) {
    var fe = probleme.filter(function (p) { return p.stufe === 'fehler'; });
    var hi = probleme.filter(function (p) { return p.stufe === 'hinweis'; });
    var ges = gesamtHinweise();
    $('pruefliste').innerHTML =
      '<p class="bilanz">' + (fe.length ? icon('kreuz') + fe.length + ' Fehler – Export gesperrt' : (daten.fragen.length ? icon('haken') + 'Keine Fehler – bereit zum Export' : 'Noch keine Fragen')) + '</p>' +
      '<ul>' + fe.concat(hi).slice(0, 40).map(function (p) {
        return '<li class="' + p.stufe + '"><button type="button" class="sprung" data-i="' + p.i + '" data-feld="' + p.feld + '">' + icon(p.stufe === 'fehler' ? 'kreuz' : 'hinweis') + '<span>Frage ' + (p.i + 1) + ': ' + esc(p.text) + '</span></button></li>';
      }).join('') +
      ges.map(function (t) { return '<li class="hinweis"><span class="sprung" style="cursor:default">' + icon('hinweis') + '<span>' + esc(t) + '</span></span></li>'; }).join('') + '</ul>';
    $('export').setAttribute('aria-describedby', 'pruefliste');
    var counts = [0, 0, 0, 0, 0, 0];
    daten.fragen.forEach(function (f) { counts[f.station]++; });
    $('statistik').innerHTML = '<h2>Fragen je Station</h2><table><tbody>' + [1, 2, 3, 4, 5].map(function (s) {
      return '<tr><th scope="row">' + esc(STATION[s]) + '</th><td>' + counts[s] + '</td></tr>';
    }).join('') + (counts[0] ? '<tr><th scope="row">ohne Station</th><td>' + counts[0] + '</td></tr>' : '') + '</tbody></table>';
    return fe.length;
  }

  function allesZeichnen() {
    if (aktiv >= daten.fragen.length) aktiv = Math.max(0, daten.fragen.length - 1);
    $('titel-feld').value = daten.titel;
    formular();
    aktualisieren();
  }
  function aktualisieren() {
    var pr = pruefeAlle();
    liste(pr);
    if (daten.fragen[aktiv]) feldMeldungen(pr);
    vorschau();
    return bilanz(pr);
  }

  /* ---------- Ereignisse ---------- */
  document.addEventListener('input', function (e) {
    var t = e.target, f = daten.fragen[aktiv];
    if (t.id === 'titel-feld') { daten.titel = t.value; speichern(); return; }
    if (!f || !t.closest('#frage-form')) return;
    if (t.hasAttribute('data-a')) f.antworten[Number(t.getAttribute('data-a'))] = t.value;
    else if (t.getAttribute('data-k') === 'frage' || t.getAttribute('data-k') === 'erklaerung' || t.getAttribute('data-k') === 'quelle') f[t.getAttribute('data-k')] = t.value;
    else return;
    speichern(); aktualisieren();
  });
  document.addEventListener('change', function (e) {
    var t = e.target, f = daten.fragen[aktiv];
    if (!f || !t.closest('#frage-form')) return;
    if (t.name === 'richtig') f.richtig = Number(t.value);
    else if (t.getAttribute('data-k') === 'station') f.station = Number(t.value);
    else if (t.getAttribute('data-k') === 'zeit') f.zeit = Number(t.value);
    else return;
    speichern(); aktualisieren();
  });
  function waehle(i, feld) {
    aktiv = i;
    formular(); aktualisieren(); speichern();
    var el = $('q-' + (feld || 'frage'));
    if (feld === 'richtig') el = $('r-0');
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
  $('fl').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]');
    if (b) waehle(Number(b.getAttribute('data-i')));
  });
  $('filter').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-filter]');
    if (!b) return;
    filter = Number(b.getAttribute('data-filter'));
    var erste = -1;
    daten.fragen.forEach(function (f, i) { if (erste < 0 && (!filter || f.station === filter)) erste = i; });
    if (filter && daten.fragen[aktiv] && daten.fragen[aktiv].station !== filter && erste >= 0) { aktiv = erste; formular(); }
    aktualisieren();
  });
  $('pruefliste').addEventListener('click', function (e) {
    var b = e.target.closest('button.sprung');
    if (b) waehle(Number(b.getAttribute('data-i')), b.getAttribute('data-feld'));
  });
  $('frage-form').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var fr = daten.fragen;
    if (b.id === 'f-hoch' && aktiv > 0) { fr.splice(aktiv - 1, 0, fr.splice(aktiv, 1)[0]); aktiv--; }
    else if (b.id === 'f-runter' && aktiv < fr.length - 1) { fr.splice(aktiv + 1, 0, fr.splice(aktiv, 1)[0]); aktiv++; }
    else if (b.id === 'f-kopie') { var k = JSON.parse(JSON.stringify(fr[aktiv])); k.frage = k.frage + ' (Kopie)'; fr.splice(aktiv + 1, 0, k); aktiv++; }
    else if (b.id === 'f-weg') { if (!confirm('Frage ' + (aktiv + 1) + ' wirklich löschen?')) return; fr.splice(aktiv, 1); }
    else return;
    allesZeichnen(); speichern();
  });
  $('neu').addEventListener('click', function () {
    daten.fragen.push(leereFrage());
    aktiv = daten.fragen.length - 1;
    allesZeichnen(); speichern();
    $('q-frage').focus();
  });

  function meldung(html, art) {
    var m = $('aktion-meldung');
    m.className = 'aktion-meldung ' + (art || '');
    m.innerHTML = html;
  }

  function zusammenfuehren(liste, herkunft) {
    var vorhanden = {};
    daten.fragen.forEach(function (f) { vorhanden[schluessel(f)] = true; });
    var neu = 0, doppelt = 0;
    liste.forEach(function (f) {
      var n = normFrage(f);
      var k = schluessel(n);
      if (k && vorhanden[k]) { doppelt++; return; }
      vorhanden[k] = true;
      daten.fragen.push(n); neu++;
    });
    return { neu: neu, doppelt: doppelt, herkunft: herkunft };
  }

  $('datei').addEventListener('change', function (e) {
    var dateien = Array.prototype.slice.call(e.target.files || []);
    if (!dateien.length) return;
    var ergebnisse = [], fehler = [];
    var offen = dateien.length;
    dateien.forEach(function (datei) {
      var r = new FileReader();
      r.onload = function () {
        try {
          var j = JSON.parse(r.result);
          var arr = Array.isArray(j) ? j : j.fragen;
          if (!Array.isArray(arr)) throw new Error('kein Feld „fragen“');
          if (!daten.titel && j.titel) daten.titel = String(j.titel);
          ergebnisse.push(zusammenfuehren(arr, datei.name));
        } catch (err) { fehler.push(datei.name + ' (' + err.message + ')'); }
        if (--offen === 0) fertig();
      };
      r.onerror = function () { fehler.push(datei.name); if (--offen === 0) fertig(); };
      r.readAsText(datei);
    });
    function fertig() {
      e.target.value = '';
      allesZeichnen(); speichern();
      var text = ergebnisse.map(function (x) { return '„' + esc(x.herkunft) + '“: ' + x.neu + ' neu' + (x.doppelt ? ', ' + x.doppelt + ' doppelt übersprungen' : ''); }).join('; ');
      if (fehler.length) meldung(icon('kreuz') + '<span>' + (text ? text + '. ' : '') + 'Nicht lesbar: ' + esc(fehler.join(', ')) + '</span>', 'fehler');
      else meldung(icon('haken') + '<span>Zusammengeführt – ' + text + '. Jetzt ' + daten.fragen.length + ' Fragen.</span>', 'ok');
    }
  });

  $('arena-laden').addEventListener('click', function () {
    var fertig = function (j, woher) {
      var x = zusammenfuehren((j && j.fragen) || [], woher);
      if (!daten.titel && j && j.titel) daten.titel = j.titel;
      allesZeichnen(); speichern();
      meldung(icon('haken') + '<span>Aus ' + esc(woher) + ': ' + x.neu + ' Fragen übernommen' + (x.doppelt ? ', ' + x.doppelt + ' schon vorhanden' : '') + '.</span>', 'ok');
    };
    var notfall = function () {
      if (window.NAHOST_FRAGEN_EINGEBETTET) fertig(window.NAHOST_FRAGEN_EINGEBETTET, 'der eingebetteten Arena-Kopie');
      else meldung(icon('kreuz') + '<span>Die Arena-Fragen konnten nicht geladen werden.</span>', 'fehler');
    };
    if (location.protocol === 'file:') return notfall();
    fetch('../arena/fragen.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (j) { fertig(j, 'arena/fragen.json'); })
      .catch(notfall);
  });

  $('leeren').addEventListener('click', function () {
    if (!confirm('Alle Fragen in diesem Entwurf löschen? (Vorher besser exportieren.)')) return;
    daten = { version: 1, titel: '', fragen: [] }; aktiv = 0;
    allesZeichnen(); speichern();
    meldung(icon('haken') + '<span>Entwurf geleert.</span>', 'ok');
  });

  $('export').addEventListener('click', function () {
    var fe = aktualisieren();
    if (!daten.fragen.length) { meldung(icon('kreuz') + '<span>Es gibt noch keine Fragen.</span>', 'fehler'); return; }
    if (fe > 0) {
      meldung(icon('kreuz') + '<span>Export gesperrt: ' + fe + ' Fehler. Klickt in der Prüfliste auf einen Eintrag, um ihn zu beheben.</span>', 'fehler');
      var erster = $('pruefliste').querySelector('li.fehler .sprung');
      if (erster) erster.click();
      return;
    }
    var aus = {
      version: 1,
      titel: daten.titel.trim() || 'Quiz Konfliktanalyse Nahost',
      fragen: daten.fragen.map(function (f) {
        return { station: f.station, frage: f.frage.trim(), antworten: f.antworten.map(function (a) { return a.trim(); }), richtig: f.richtig, erklaerung: f.erklaerung.trim(), quelle: f.quelle.trim(), zeit: f.zeit };
      })
    };
    var blob = new Blob([JSON.stringify(aus, null, 2) + '\n'], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'fragen.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    meldung(icon('haken') + '<span>fragen.json mit ' + aus.fragen.length + ' Fragen gespeichert. Die Datei ersetzt <b>arena/fragen.json</b> auf der Website.</span>', 'ok');
  });

  /* ---------- Start ---------- */
  try {
    var g = JSON.parse(localStorage.getItem(ENTWURF) || 'null');
    if (g && g.daten && Array.isArray(g.daten.fragen)) {
      daten = { version: 1, titel: String(g.daten.titel || ''), fragen: g.daten.fragen.map(normFrage) };
      aktiv = Number(g.aktiv) || 0;
      $('speicherstatus').textContent = 'Entwurf aus diesem Browser geladen (' + daten.fragen.length + ' Fragen).';
    }
  } catch (e) { /* neu anfangen */ }
  allesZeichnen();
  window.NahostQuizBaukasten = { daten: function () { return daten; } };
})();
