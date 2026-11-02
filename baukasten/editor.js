/* Baukasten: Stations-Editor (eine Seite, Station per ?nr=1…5). Exportiert inhalt.json. */
(function () {
  'use strict';
  var BK = (window.NahostBaukasten = window.NahostBaukasten || {});
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var icon = function (n) { return '<svg class="ic" aria-hidden="true" focusable="false"><use href="#i-' + n + '"></use></svg>'; };

  var nr = Number(new URLSearchParams(location.search).get('nr')) || 1;
  if (nr < 1 || nr > 5) nr = 1;
  var ENTWURF = 'nahost-baukasten-station-' + nr;
  var TYP = { 1: 'zuordnen', 2: 'zeitstrahl', 3: 'theoriebrille', 4: 'szenarien', 5: 'echtoderfake' };

  var Q = { k: 'quelle', l: 'Quelle (kurz)', t: 'text', req: true, max: 120, hint: 'z. B. „tagesschau.de, 08/2026“. Die Quelle muss auch unten in der Quellenliste stehen.' };
  var LISTEN = {
    1: [{ k: 'paare', l: 'Akteure und ihre Interessen', min: 4, max: 12, einzel: 'Paar',
      titel: function (x) { return x.akteur; },
      neu: function () { return { akteur: '', interesse: '', rueckmeldung: '', quelle: '' }; },
      felder: [
        { k: 'akteur', l: 'Akteur', t: 'text', req: true, max: 50, hint: 'Wer? Z. B. „Hamas“, „USA (Regierung Trump)“.' },
        { k: 'interesse', l: 'Interesse', t: 'area', req: true, max: 180, hint: 'Vorsichtig und belegbar formulieren. Nicht verraten, wer es ist.' },
        { k: 'rueckmeldung', l: 'Rückmeldung, wenn richtig zugeordnet', t: 'area', req: true, max: 220, hint: 'Ein bis zwei Sätze mit Beleg.' },
        Q] }],
    2: [{ k: 'ereignisse', l: 'Ereignisse auf dem Zeitstrahl', min: 5, max: 10, einzel: 'Ereignis',
      titel: function (x) { return (x.anzeige ? x.anzeige + ' – ' : '') + (x.titel || ''); },
      neu: function () { return { datum: '', anzeige: '', titel: '', beschreibung: '', israelisch: '', palaestinensisch: '', quelle: '' }; },
      felder: [
        { k: 'datum', l: 'Datum zum Sortieren (JJJJ-MM-TT)', t: 'text', req: true, muster: /^\d{4}-\d{2}-\d{2}$/, musterText: 'Bitte als JJJJ-MM-TT schreiben, z. B. 1948-05-14.', hint: 'Wird Besuchern erst nach dem Sortieren gezeigt.' },
        { k: 'anzeige', l: 'Datum, wie Besucher es sehen', t: 'text', req: true, max: 30, hint: 'z. B. „14. Mai 1948“ oder „Juni 1967“' },
        { k: 'titel', l: 'Titel des Ereignisses', t: 'text', req: true, max: 60 },
        { k: 'beschreibung', l: 'Kurze Beschreibung (ohne Jahreszahl!)', t: 'area', req: true, max: 170 },
        { k: 'israelisch', l: 'Israelische Sicht', t: 'area', req: true, max: 160, paar: 'a' },
        { k: 'palaestinensisch', l: 'Palästinensische Sicht', t: 'area', req: true, max: 160, paar: 'b' },
        Q] }],
    3: [{ k: 'aussagen', l: 'Aussagen für die Theorie-Brillen', min: 4, max: 12, einzel: 'Aussage',
      titel: function (x) { return x.aussage; },
      neu: function () { return { aussage: '', herkunft: '', brille: '', erklaerung: '', quelle: '' }; },
      felder: [
        { k: 'aussage', l: 'Aussage oder Zitat', t: 'area', req: true, max: 260, hint: 'Englische Originalzitate nicht übersetzen.' },
        { k: 'herkunft', l: 'Wer sagt das? Wann?', t: 'text', req: true, max: 80 },
        { k: 'brille', l: 'Passende Theorie-Brille', t: 'select', req: true, optionen: [['', '– bitte wählen –'], ['realismus', 'Realismus'], ['liberalismus', 'Idealismus / Liberalismus'], ['hexagon', 'Senghaas-Hexagon'], ['galtung', 'Galtung: Gewalt und Frieden']] },
        { k: 'erklaerung', l: 'Erklärung: Warum diese Brille?', t: 'area', req: true, max: 260 },
        Q] }],
    4: [{ k: 'szenarien', l: 'Szenarien', min: 2, max: 4, einzel: 'Szenario',
      titel: function (x) { return x.titel; },
      neu: function () { return { titel: '', form: 'kreis', kurz: '', folgen: [{ akteur: '', text: '' }, { akteur: '', text: '' }], bedingungen: [''], quelle: '' }; },
      felder: [
        { k: 'titel', l: 'Titel des Szenarios', t: 'text', req: true, max: 60 },
        { k: 'form', l: 'Form-Symbol', t: 'select', req: true, optionen: [['kreis', 'Kreis'], ['dreieck', 'Dreieck'], ['quadrat', 'Quadrat'], ['raute', 'Raute']] },
        { k: 'kurz', l: 'Was passiert in diesem Szenario?', t: 'area', req: true, max: 260 },
        { k: 'folgen', l: 'Folgen für Akteure', t: 'liste', min: 2, max: 6, einzel: 'Folge',
          titel: function (x) { return x.akteur; },
          neu: function () { return { akteur: '', text: '' }; },
          felder: [{ k: 'akteur', l: 'Akteur', t: 'text', req: true, max: 50 }, { k: 'text', l: 'Folge', t: 'area', req: true, max: 200 }] },
        { k: 'bedingungen', l: 'Was müsste dafür passieren?', t: 'texte', min: 1, max: 6, einzel: 'Bedingung', max_zeichen: 160 },
        Q] }],
    5: [{ k: 'faelle', l: 'Fälle: Echt oder Fake?', min: 3, max: 10, einzel: 'Fall',
      titel: function (x) { return x.behauptung; },
      neu: function () { return { plattform: '', beschreibung: '', behauptung: '', urteil: '', aufloesung: '', pruefer: '', url: '', datum: '' }; },
      felder: [
        { k: 'plattform', l: 'Plattform', t: 'text', req: true, max: 40 },
        { k: 'beschreibung', l: 'Was sieht man? (nur beschreiben – keine Bilder, keine Gewaltdarstellung)', t: 'area', req: true, max: 220 },
        { k: 'behauptung', l: 'Behauptung im Post', t: 'area', req: true, max: 160 },
        { k: 'urteil', l: 'Ergebnis des Faktenchecks', t: 'select', req: true, optionen: [['', '– bitte wählen –'], ['echt', 'Echt'], ['gefaelscht', 'Gefälscht oder erfunden'], ['kontext', 'Aus dem Zusammenhang gerissen']] },
        { k: 'aufloesung', l: 'Auflösung für Besucher', t: 'area', req: true, max: 260 },
        { k: 'pruefer', l: 'Wer hat geprüft?', t: 'text', req: true, max: 60, hint: 'z. B. ARD-faktenfinder, CORRECTIV, DW, AFP, BR24 #Faktenfuchs' },
        { k: 'url', l: 'Link zum Faktencheck', t: 'url', req: true },
        { k: 'datum', l: 'Datum des Faktenchecks', t: 'text', req: true, max: 20 }] },
      { k: 'tipps', l: 'Tipps: So prüfst du selbst', t: 'texte', min: 2, max: 6, einzel: 'Tipp', max_zeichen: 120 }]
  };
  var OBEN = [
    { k: 'titel', l: 'Titel der Station', t: 'text', req: true, max: 60 },
    { k: 'leitfrage', l: 'Leitfrage', t: 'text', req: true, max: 140, hint: 'Als echte Frage formulieren.' },
    { k: 'anleitung', l: 'Anleitung für Besucher', t: 'area', req: true, max: 260, hint: 'Was genau sollen Besucher tun? Kurze Sätze.' }
  ];
  if (nr === 4) OBEN.push({ k: 'stand', l: 'Stand der Informationen', t: 'text', req: true, max: 30, hint: 'z. B. „November 2026“' });
  var UNTEN = [
    { k: 'widerspruch', l: 'Wo widersprechen sich die Erzählungen?', t: 'gruppe', felder: [
      { k: 'israelisch', l: 'Israelische Erzählung', t: 'area', req: true, max: 260, paar: 'a' },
      { k: 'palaestinensisch', l: 'Palästinensische Erzählung', t: 'area', req: true, max: 260, paar: 'b' },
      { k: 'einordnung', l: 'Einordnung: Worin genau liegt der Widerspruch?', t: 'area', req: true, max: 320 }] },
    { k: 'quellen', l: 'Quellen (aus dem geprüften Quellenpool)', t: 'liste', min: 2, max: 14, einzel: 'Quelle',
      titel: function (x) { return x.titel; },
      neu: function () { return { titel: '', herausgeber: '', url: '', datum: '' }; },
      felder: [
        { k: 'titel', l: 'Titel', t: 'text', req: true, max: 140 },
        { k: 'herausgeber', l: 'Herausgeber', t: 'text', req: true, max: 80 },
        { k: 'url', l: 'Link', t: 'url', req: true },
        { k: 'datum', l: 'Datum', t: 'text', max: 20 }] },
    { k: 'eigeneQuelle', l: 'Eure eigene Quelle (freiwillig, mit Quellenkritik)', t: 'gruppe', optional: true, felder: [
      { k: 'titel', l: 'Titel', t: 'text', max: 140 },
      { k: 'url', l: 'Link', t: 'url' },
      { k: 'begruendung', l: 'Warum ist die Quelle vertrauenswürdig? (Wer steht dahinter? Belege? Aktualität?)', t: 'area', max: 300 }] }
  ];

  var daten = null;
  var formular = document.getElementById('formular');
  var pruefliste = document.getElementById('pruefliste');
  var statusEl = document.getElementById('speicherstatus');

  function muster() {
    var el = document.getElementById('muster-' + nr);
    return el ? JSON.parse(el.textContent) : { version: 1, station: nr };
  }
  function vervollstaendigen(d) {
    d.version = 1; d.station = nr; d.typ = TYP[nr];
    if (typeof d.muster !== 'boolean') d.muster = false;
    d.widerspruch = d.widerspruch || { israelisch: '', palaestinensisch: '', einordnung: '' };
    d.quellen = d.quellen || [];
    d.eigeneQuelle = d.eigeneQuelle || { titel: '', url: '', begruendung: '' };
    LISTEN[nr].forEach(function (l) { if (!Array.isArray(d[l.k])) d[l.k] = []; });
    if (nr === 3 && (!d.brillen || d.brillen.length !== 4)) d.brillen = muster().brillen;
    return d;
  }

  /* ---------- Rendern ---------- */
  function feldId(pfad) { return 'f-' + pfad.join('-'); }

  function feldHtml(def, obj, pfad) {
    var id = feldId(pfad);
    var wert = obj[def.k] == null ? '' : obj[def.k];
    var kopf = '<label for="' + id + '">' + esc(def.l) + (def.req ? '' : ' <span class="opt">(freiwillig)</span>') + '</label>' +
      (def.hint ? '<p class="hinweis" id="' + id + '-h">' + esc(def.hint) + '</p>' : '');
    var att = ' id="' + id + '" data-pfad="' + esc(JSON.stringify(pfad)) + '"' + (def.hint ? ' aria-describedby="' + id + '-h"' : '');
    var eingabe;
    if (def.t === 'area') eingabe = '<textarea rows="3"' + att + '>' + esc(wert) + '</textarea>';
    else if (def.t === 'select') eingabe = '<select' + att + '>' + def.optionen.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (o[0] === wert ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('') + '</select>';
    else eingabe = '<input type="' + (def.t === 'url' ? 'url' : 'text') + '"' + att + ' value="' + esc(wert) + '"' + (def.t === 'url' ? ' placeholder="https://…" inputmode="url"' : '') + '>';
    return '<div class="feld' + (def.paar ? ' paar-' + def.paar : '') + '">' + kopf + eingabe + '<p class="feldmeldung" id="' + id + '-m" aria-live="polite"></p></div>';
  }

  function felderHtml(felder, obj, pfad) {
    var html = '', paarOffen = false;
    felder.forEach(function (def) {
      var p = pfad.concat(def.k);
      if (def.paar === 'a') { html += '<div class="paar">'; paarOffen = true; }
      if (def.t === 'liste') html += listeHtml(def, obj[def.k] || (obj[def.k] = []), p, true);
      else if (def.t === 'texte') html += texteHtml(def, obj[def.k] || (obj[def.k] = []), p);
      else if (def.t === 'gruppe') html += gruppeHtml(def, obj[def.k] || (obj[def.k] = {}), p);
      else html += feldHtml(def, obj, p);
      if (def.paar === 'b' && paarOffen) { html += '</div>'; paarOffen = false; }
    });
    return html;
  }

  function steuer(pfad, i, n) {
    var p = esc(JSON.stringify(pfad));
    return '<span class="steuer">' +
      '<button type="button" class="mini" data-aktion="hoch" data-liste="' + p + '" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="nach oben">' + icon('pfeil-hoch') + '</button>' +
      '<button type="button" class="mini" data-aktion="runter" data-liste="' + p + '" data-i="' + i + '"' + (i === n - 1 ? ' disabled' : '') + ' aria-label="nach unten">' + icon('pfeil-runter') + '</button>' +
      '<button type="button" class="mini" data-aktion="weg" data-liste="' + p + '" data-i="' + i + '" aria-label="entfernen">' + icon('muell') + '</button></span>';
  }

  function listeHtml(def, arr, pfad, verschachtelt) {
    var p = esc(JSON.stringify(pfad));
    return '<fieldset class="' + (verschachtelt ? 'unterliste' : 'karte block') + '" id="' + feldId(pfad) + '"><legend>' + esc(def.l) + ' <span class="zahl">(' + arr.length + (def.min ? ', mindestens ' + def.min : '') + ')</span></legend>' +
      arr.map(function (x, i) {
        var t = def.titel ? def.titel(x) : '';
        return '<div class="eintrag"><div class="eintrag-kopf"><h3>' + esc(def.einzel) + ' ' + (i + 1) + (t ? ': <span>' + esc(String(t).slice(0, 60)) + '</span>' : '') + '</h3>' + steuer(pfad, i, arr.length) + '</div>' +
          felderHtml(def.felder, x, pfad.concat(i)) + '</div>';
      }).join('') +
      '<button type="button" class="knopf" data-aktion="neu" data-liste="' + p + '"' + (arr.length >= def.max ? ' disabled' : '') + '>' + icon('plus') + esc(def.einzel) + ' hinzufügen</button></fieldset>';
  }

  function texteHtml(def, arr, pfad, cls) {
    var p = esc(JSON.stringify(pfad));
    return '<fieldset class="' + (cls || 'unterliste') + '" id="' + feldId(pfad) + '"><legend>' + esc(def.l) + '</legend>' +
      arr.map(function (x, i) {
        var id = feldId(pfad.concat(i));
        return '<div class="feld zeile"><label class="sr-only" for="' + id + '">' + esc(def.einzel) + ' ' + (i + 1) + '</label>' +
          '<input type="text" id="' + id + '" data-pfad="' + esc(JSON.stringify(pfad.concat(i))) + '" value="' + esc(x) + '">' + steuer(pfad, i, arr.length) +
          '<p class="feldmeldung" id="' + id + '-m" aria-live="polite"></p></div>';
      }).join('') +
      '<button type="button" class="knopf" data-aktion="neutext" data-liste="' + p + '"' + (arr.length >= def.max ? ' disabled' : '') + '>' + icon('plus') + esc(def.einzel) + ' hinzufügen</button></fieldset>';
  }

  function gruppeHtml(def, obj, pfad) {
    return '<fieldset class="karte block" id="' + feldId(pfad) + '"><legend>' + esc(def.l) + '</legend>' + felderHtml(def.felder, obj, pfad) + '</fieldset>';
  }

  function zeichnen() {
    var html = '<fieldset class="karte block"><legend>Grunddaten</legend>' + felderHtml(OBEN, daten, []) +
      '<div class="feld check"><input type="checkbox" id="f-muster"' + (daten.muster ? ' checked' : '') + '><label for="f-muster">Das ist noch Musterinhalt (Hinweis „Musterinhalt – wird vom LK ersetzt“ anzeigen)</label></div></fieldset>';
    LISTEN[nr].forEach(function (l) {
      html += (l.t === 'texte') ? texteHtml(l, daten[l.k] || (daten[l.k] = []), [l.k], 'karte block') : listeHtml(l, daten[l.k], [l.k], false);
    });
    UNTEN.forEach(function (def) {
      if (def.t === 'liste') html += listeHtml(def, daten[def.k], [def.k], false);
      else html += gruppeHtml(def, daten[def.k], [def.k]);
    });
    formular.innerHTML = html;
    pruefen();
  }

  /* ---------- Daten-Zugriff ---------- */
  function holen(pfad) { return pfad.reduce(function (o, k) { return o == null ? o : o[k]; }, daten); }
  function setzen(pfad, wert) {
    var ziel = holen(pfad.slice(0, -1));
    ziel[pfad[pfad.length - 1]] = wert;
  }
  function findeDef(pfad) {
    var alle = OBEN.concat(LISTEN[nr], UNTEN);
    var def = null, liste = alle;
    for (var i = 0; i < pfad.length; i++) {
      var k = pfad[i];
      if (typeof k === 'number') continue;
      def = liste.filter(function (d) { return d.k === k; })[0];
      if (!def) return null;
      liste = def.felder || [];
    }
    return def;
  }

  var speicherTimer = null;
  function speichern() {
    clearTimeout(speicherTimer);
    statusEl.textContent = 'Änderungen …';
    speicherTimer = setTimeout(function () {
      try {
        localStorage.setItem(ENTWURF, JSON.stringify(daten));
        statusEl.textContent = 'Entwurf gespeichert ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      } catch (e) { statusEl.textContent = 'Entwurf konnte nicht gespeichert werden.'; }
    }, 400);
  }

  formular.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'f-muster') return;
    var pfadTxt = t.getAttribute('data-pfad');
    if (!pfadTxt) return;
    setzen(JSON.parse(pfadTxt), t.value);
    speichern();
    pruefen();
  });
  formular.addEventListener('change', function (e) {
    if (e.target.id === 'f-muster') { daten.muster = e.target.checked; speichern(); pruefen(); }
    else if (e.target.tagName === 'SELECT') { setzen(JSON.parse(e.target.getAttribute('data-pfad')), e.target.value); speichern(); pruefen(); }
  });
  formular.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-aktion]');
    if (!b) return;
    var pfad = JSON.parse(b.getAttribute('data-liste'));
    var arr = holen(pfad);
    var i = Number(b.getAttribute('data-i'));
    var a = b.getAttribute('data-aktion');
    var def = findeDef(pfad);
    if (a === 'neu') arr.push(def.neu());
    else if (a === 'neutext') arr.push('');
    else if (a === 'weg') { if (!confirm('Diesen Eintrag wirklich entfernen?')) return; arr.splice(i, 1); }
    else if (a === 'hoch' && i > 0) arr.splice(i - 1, 0, arr.splice(i, 1)[0]);
    else if (a === 'runter' && i < arr.length - 1) arr.splice(i + 1, 0, arr.splice(i, 1)[0]);
    var scroll = window.scrollY;
    zeichnen();
    window.scrollTo(0, scroll);
    speichern();
    if (a === 'neu' || a === 'neutext') {
      var neuId = feldId(pfad.concat(arr.length - 1));
      var erstes = document.querySelector('[id^="' + neuId + '"]:is(input,textarea,select)') || document.getElementById(neuId);
      if (erstes) erstes.focus();
    }
  });

  /* ---------- Prüfen ---------- */
  var URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;
  function woerter(s) { return String(s).trim().split(/\s+/).filter(Boolean).length; }
  function langeSaetze(s) {
    return String(s).split(/(?<=[.!?])\s+/).filter(function (x) { return woerter(x) > 22; }).length;
  }

  function pruefen() {
    var probleme = [];
    function melde(stufe, pfad, text) { probleme.push({ stufe: stufe, id: feldId(pfad), text: text }); }

    function felderPruefen(felder, obj, pfad, etikett) {
      felder.forEach(function (def) {
        var p = pfad.concat(def.k);
        var v = obj ? obj[def.k] : undefined;
        var name = etikett + def.l;
        if (def.t === 'liste') return listePruefen(def, v || [], p, etikett);
        if (def.t === 'texte') {
          var arr = (v || []);
          if (def.min && arr.filter(function (x) { return String(x).trim(); }).length < def.min) melde('fehler', p, etikett + def.l + ': mindestens ' + def.min + ' Einträge.');
          arr.forEach(function (x, i) {
            if (!String(x).trim()) melde('fehler', p.concat(i), etikett + def.einzel + ' ' + (i + 1) + ' ist leer.');
            else if (def.max_zeichen && String(x).length > def.max_zeichen) melde('hinweis', p.concat(i), etikett + def.einzel + ' ' + (i + 1) + ' ist lang – kürzer schreiben?');
          });
          return;
        }
        if (def.t === 'gruppe') {
          if (def.optional) {
            var o = v || {};
            var irgendwas = def.felder.some(function (f) { return String(o[f.k] || '').trim(); });
            if (irgendwas) def.felder.forEach(function (f) {
              if (!String(o[f.k] || '').trim()) melde('fehler', p.concat(f.k), def.l.replace(/ \(.*/, '') + ': ' + f.l.replace(/\?.*/, '?') + ' fehlt.');
              else if (f.t === 'url' && !URL_RE.test(String(o[f.k]).trim())) melde('fehler', p.concat(f.k), 'Eigene Quelle: Link muss mit https:// beginnen.');
            });
            return;
          }
          return felderPruefen(def.felder, v || {}, p, '');
        }
        var s = String(v == null ? '' : v).trim();
        if (def.req && !s) { melde('fehler', p, name + ' fehlt.'); return; }
        if (!s) return;
        if (def.t === 'url' && !URL_RE.test(s)) melde('fehler', p, name + ': Bitte einen vollständigen Link mit https:// angeben.');
        if (def.muster && !def.muster.test(s)) melde('fehler', p, name + ': ' + def.musterText);
        if (def.max && s.length > def.max) melde('hinweis', p, name + ': ' + s.length + ' Zeichen – für Klasse 9 lieber unter ' + def.max + '.');
        if ((def.t === 'area' || def.t === 'text') && langeSaetze(s)) melde('hinweis', p, name + ': Ein Satz hat mehr als 22 Wörter. Teilen?');
      });
    }
    function listePruefen(def, arr, pfad, etikett) {
      if (def.min && arr.length < def.min) melde('fehler', pfad, etikett + def.l + ': mindestens ' + def.min + ' (jetzt ' + arr.length + ').');
      arr.forEach(function (x, i) { felderPruefen(def.felder, x, pfad.concat(i), etikett + def.einzel + ' ' + (i + 1) + ' – '); });
    }

    felderPruefen(OBEN, daten, [], '');
    LISTEN[nr].forEach(function (l) {
      if (l.t === 'texte') felderPruefen([l], daten, [], '');
      else listePruefen(l, daten[l.k] || [], [l.k], '');
    });
    UNTEN.forEach(function (def) {
      if (def.t === 'liste') listePruefen(def, daten[def.k] || [], [def.k], '');
      else felderPruefen([def], daten, [], '');
    });
    if (daten.leitfrage && !/\?\s*$/.test(daten.leitfrage)) melde('hinweis', ['leitfrage'], 'Leitfrage endet nicht mit einem Fragezeichen.');

    // stationsspezifisch
    function doppelt(arr, k, label, liste) {
      var gesehen = {};
      arr.forEach(function (x, i) {
        var s = String(x[k] || '').trim().toLowerCase();
        if (!s) return;
        if (gesehen[s] != null) melde('fehler', [liste, i, k], label + ' ' + (i + 1) + ' kommt doppelt vor.');
        gesehen[s] = i;
      });
    }
    if (nr === 1) { doppelt(daten.paare, 'akteur', 'Akteur', 'paare'); doppelt(daten.paare, 'interesse', 'Interesse', 'paare'); }
    if (nr === 2) {
      doppelt(daten.ereignisse, 'datum', 'Datum von Ereignis', 'ereignisse');
      daten.ereignisse.forEach(function (x, i) {
        if (/\b(1[89]|20)\d{2}\b/.test(x.beschreibung || '')) melde('hinweis', ['ereignisse', i, 'beschreibung'], 'Ereignis ' + (i + 1) + ': Die Beschreibung enthält eine Jahreszahl – das verrät die Lösung.');
      });
    }
    if (nr === 3) {
      ['realismus', 'liberalismus', 'hexagon', 'galtung'].forEach(function (b) {
        if (!daten.aussagen.some(function (a) { return a.brille === b; })) melde('hinweis', ['aussagen'], 'Keine Aussage für die Brille „' + b + '“. Möglichst jede Brille mindestens einmal.');
      });
    }
    if (nr === 5) {
      ['echt', 'gefaelscht', 'kontext'].forEach(function (u) {
        if (!daten.faelle.some(function (f) { return f.urteil === u; })) melde('hinweis', ['faelle'], 'Kein Fall mit dem Ergebnis „' + u + '“.');
      });
      melde('hinweis', ['faelle'], 'Achtet auf Falschmeldungen aus beiden Richtungen (gegen Israel und gegen Palästinenser).');
    }
    if (daten.muster) melde('hinweis', ['muster'], 'Der Hinweis „Musterinhalt“ ist noch eingeschaltet. Haken vor dem Export entfernen, wenn alles eure eigene Arbeit ist.');

    // anzeigen
    formular.querySelectorAll('.feldmeldung').forEach(function (m) { m.textContent = ''; m.className = 'feldmeldung'; });
    formular.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    probleme.forEach(function (pr) {
      var m = document.getElementById(pr.id + '-m');
      var el = document.getElementById(pr.id);
      if (m && !m.textContent) { m.textContent = pr.text.replace(/^.*?: /, ''); m.className = 'feldmeldung ' + pr.stufe; }
      if (el && pr.stufe === 'fehler' && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) el.setAttribute('aria-invalid', 'true');
    });
    var fehler = probleme.filter(function (p) { return p.stufe === 'fehler'; });
    var hinweise = probleme.filter(function (p) { return p.stufe === 'hinweis'; });
    pruefliste.innerHTML =
      '<p class="bilanz">' + (fehler.length ? icon('kreuz') + fehler.length + ' Fehler – Export noch gesperrt' : icon('haken') + 'Keine Fehler – bereit zum Export') + '</p>' +
      (probleme.length ? '<ul>' + fehler.concat(hinweise).slice(0, 40).map(function (p) {
        return '<li class="' + p.stufe + '"><button type="button" class="sprung" data-ziel="' + esc(p.id) + '">' + icon(p.stufe === 'fehler' ? 'kreuz' : 'hinweis') + '<span>' + esc(p.text) + '</span></button></li>';
      }).join('') + '</ul>' : '');
    BK.fehlerAnzahl = fehler.length;
    return fehler.length;
  }
  pruefliste.addEventListener('click', function (e) {
    var b = e.target.closest('.sprung');
    if (!b) return;
    var el = document.getElementById(b.getAttribute('data-ziel'));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var f = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) ? el : el.querySelector('input,textarea,select,button');
    if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 250);
  });

  /* ---------- Export / Import / Vorschau ---------- */
  function sauber() {
    var d = JSON.parse(JSON.stringify(daten));
    Object.keys(d).forEach(function (k) { if (k.charAt(0) === '_') delete d[k]; });
    return d;
  }
  function meldung(html, art) {
    var m = document.getElementById('aktion-meldung');
    m.className = 'aktion-meldung ' + (art || '');
    m.innerHTML = html;
  }
  document.getElementById('export').addEventListener('click', function () {
    if (pruefen() > 0) {
      meldung(icon('kreuz') + '<span>Export gesperrt: Bitte erst die Fehler in der Prüfliste beheben.</span>', 'fehler');
      var erster = pruefliste.querySelector('li.fehler .sprung');
      if (erster) erster.click();
      return;
    }
    var blob = new Blob([JSON.stringify(sauber(), null, 2) + '\n'], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inhalt.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    meldung(icon('haken') + '<span>inhalt.json gespeichert. Legt die Datei in den Ordner <b>station-' + nr + '/</b> (alte Datei ersetzen) und gebt sie Herrn Kopplin zum Hochladen.</span>', 'ok');
  });
  document.getElementById('vorschau').addEventListener('click', function () {
    try { localStorage.setItem('nahost-vorschau-' + nr, JSON.stringify(sauber())); } catch (e) { /* ignorieren */ }
    window.open('../station-' + nr + '/?vorschau=1', '_blank', 'noopener');
  });
  document.getElementById('datei').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (Number(d.station) !== nr) {
          meldung(icon('kreuz') + '<span>Diese Datei gehört zu Station ' + esc(d.station) + ', nicht zu Station ' + nr + '. Wechselt oben die Station.</span>', 'fehler');
          return;
        }
        daten = vervollstaendigen(d);
        zeichnen(); speichern();
        meldung(icon('haken') + '<span>„' + esc(f.name) + '“ geladen.</span>', 'ok');
      } catch (err) {
        meldung(icon('kreuz') + '<span>Die Datei ist kein gültiges JSON.</span>', 'fehler');
      }
      e.target.value = '';
    };
    r.readAsText(f);
  });
  document.getElementById('muster-laden').addEventListener('click', function () {
    if (!confirm('Den Musterinhalt laden? Euer aktueller Entwurf wird dabei überschrieben.')) return;
    ladenAusDatei(true);
  });

  function ladenAusDatei(nurMuster) {
    var weiter = function (d) { daten = vervollstaendigen(d); zeichnen(); if (nurMuster) speichern(); };
    if (location.protocol === 'file:') return weiter(muster());
    fetch('../station-' + nr + '/inhalt.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (d) { weiter(Number(d.station) === nr ? d : muster()); })
      .catch(function () { weiter(muster()); });
  }

  // Start
  document.querySelectorAll('.stationswahl a').forEach(function (a) {
    if (Number(a.getAttribute('data-nr')) === nr) a.setAttribute('aria-current', 'page');
  });
  document.getElementById('editor-titel').textContent = 'Station ' + nr + ' bearbeiten';
  document.title = 'Baukasten – Station ' + nr;
  var gespeichert = null;
  try { gespeichert = JSON.parse(localStorage.getItem(ENTWURF) || 'null'); } catch (e) { gespeichert = null; }
  if (gespeichert && Number(gespeichert.station) === nr) {
    daten = vervollstaendigen(gespeichert);
    zeichnen();
    statusEl.textContent = 'Entwurf aus diesem Browser geladen.';
  } else {
    ladenAusDatei(false);
  }
})();
