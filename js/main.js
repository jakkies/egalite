// ============================================================
//  Egalite Promotions – Sport @ Sun City
//  Interactive prototype: nav, reveals, stat counters,
//  interactive calendar (filter/search/ICS), registration
//  modal, WhatsApp helpers.
// ============================================================
(function () {
  'use strict';

  var SPORT_EMAIL = {
    tennis:  'tennis@egalite.co.za',
    netball: 'netball@egalite.co.za',
    golf:    'golf@egalite.co.za',
    general: 'info@egalite.co.za'
  };
  // Sports whose per-row "Enquire" button is a direct mailto: link rather
  // than the enquiry modal (modal code kept in place for other sports / reuse).
  var MAILTO_ENQUIRE_SPORTS = ['tennis', 'netball', 'golf'];
  // Sports whose per-row actions also get a "More Info & Costs" button.
  // A row's own data-info attribute (set per event) takes precedence over this default.
  var SPORT_INFO_PDF = {
    tennis:  'docs/2027-Sun-City-Tennis-Information-Letter-all-tournaments-1.pdf',
    netball: 'docs/2027-Sun-City-Netball-Information.pdf',
    golf:    'docs/2023-Sun-City-Golf-Information-Letter.pdf'
  };
  var LOCATION = 'Sun City Resort, North West, South Africa';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // ----------------------------------------------------------
  //  Mobile menu open/close
  // ----------------------------------------------------------
  var toggle = $('.nav-toggle');
  var menu = $('.nav-menu');
  var header = $('.site-header');

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // ----------------------------------------------------------
  //  Accessible "Sports" dropdown (hover + keyboard + tap)
  // ----------------------------------------------------------
  $$('.has-drop').forEach(function (drop) {
    var link = drop.querySelector(':scope > a') || drop.querySelector('a');
    if (!link) return;
    link.setAttribute('aria-haspopup', 'true');
    link.setAttribute('aria-expanded', 'false');

    var setOpen = function (state) {
      drop.classList.toggle('open', state);
      link.setAttribute('aria-expanded', state ? 'true' : 'false');
    };

    link.addEventListener('click', function (e) {
      // On mobile (or when it's a placeholder '#'), toggle instead of navigate.
      if (window.innerWidth <= 780 || link.getAttribute('href') === '#') {
        e.preventDefault();
        setOpen(!drop.classList.contains('open'));
      }
    });
    link.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { setOpen(false); link.blur(); }
    });
    // Desktop hover keeps CSS behaviour; sync aria on focus in/out.
    drop.addEventListener('focusin', function () { if (window.innerWidth > 780) setOpen(true); });
    drop.addEventListener('focusout', function () {
      if (!drop.contains(document.activeElement)) setOpen(false);
    });
  });

  // Close mobile menu when a real link is tapped
  if (menu) {
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () {
        if (!a.parentElement.classList.contains('has-drop')) {
          menu.classList.remove('open');
          toggle && toggle.classList.remove('open');
        }
      });
    });
  }

  // ----------------------------------------------------------
  //  Sticky header background on scroll
  // ----------------------------------------------------------
  if (header && header.classList.contains('overlay')) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ----------------------------------------------------------
  //  Scroll entrance reveals + stat count-ups
  // ----------------------------------------------------------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function runCountUp(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1400, start = null;
    if (reduceMotion) { el.textContent = target + suffix; return; }
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Scroll-based visibility check (robust where IntersectionObserver
  // callbacks are throttled, e.g. some preview/embedded browsers).
  // A safety timeout guarantees nothing is ever left hidden.
  var watch = $$('.reveal').concat($$('.stat-num'));
  function fire(el) {
    if (el._done) return;
    el._done = true;
    if (el.classList.contains('reveal')) el.classList.add('in');
    if (el.classList.contains('stat-num')) runCountUp(el);
  }
  function visCheck() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    watch = watch.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.9 && r.bottom > 0) { fire(el); return false; }
      return true;
    });
    if (!watch.length) {
      window.removeEventListener('scroll', visCheck);
      window.removeEventListener('resize', visCheck);
    }
  }
  window.addEventListener('scroll', visCheck, { passive: true });
  window.addEventListener('resize', visCheck);
  window.addEventListener('load', visCheck);
  visCheck();
  // Safety net: never leave content invisible if scroll events are blocked.
  setTimeout(function () { watch.slice().forEach(fire); }, 2500);

  // ----------------------------------------------------------
  //  Gallery carousel (arrow controls + scroll-snap + drag)
  // ----------------------------------------------------------
  $$('.carousel').forEach(function (car) {
    var track = $('.gallery-track', car);
    var prev = $('.car-prev', car);
    var next = $('.car-next', car);
    if (!track) return;

    function step() { return Math.max(track.clientWidth * 0.85, 240); }
    function update() {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
    }
    prev && prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next && next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    // Click-drag to scroll (desktop pointer)
    var down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return; // native touch handles it
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
      track.style.scrollBehavior = 'auto';
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false; track.style.scrollBehavior = '';
    });
    // Prevent drag from triggering an accidental click navigation
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);

    // ---- Lightbox ----
    var imgs = $$('.car-slide img', track);
    if (imgs.length) {
      var lb = buildLightbox(imgs.map(function (im) {
        return { src: im.getAttribute('src'), alt: im.getAttribute('alt') || '' };
      }));
      imgs.forEach(function (im, i) {
        var slide = im.closest('.car-slide');
        slide.style.cursor = 'zoom-in';
        slide.setAttribute('role', 'button');
        slide.setAttribute('tabindex', '0');
        slide.setAttribute('aria-label', 'View photo ' + (i + 1) + ' full size');
        slide.addEventListener('click', function () { if (!moved) lb.open(i); });
        slide.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lb.open(i); }
        });
      });
    }
  });

  function buildLightbox(items) {
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photo viewer');
    lb.hidden = true;
    lb.innerHTML =
      '<button class="lb-close" type="button" aria-label="Close">&times;</button>' +
      '<button class="lb-nav lb-prev" type="button" aria-label="Previous photo">&#8249;</button>' +
      '<figure class="lb-stage"><img class="lb-img" alt="" /></figure>' +
      '<button class="lb-nav lb-next" type="button" aria-label="Next photo">&#8250;</button>' +
      '<span class="lb-count" aria-live="polite"></span>';
    document.body.appendChild(lb);

    var img = $('.lb-img', lb);
    var count = $('.lb-count', lb);
    var cur = 0, lastFocus = null;

    function show(i) {
      cur = (i + items.length) % items.length;
      img.src = items[cur].src;
      img.alt = items[cur].alt;
      count.textContent = (cur + 1) + ' / ' + items.length;
    }
    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      lb.hidden = false;
      document.body.classList.add('modal-open');
      document.addEventListener('keydown', onKey);
      $('.lb-close', lb).focus();
    }
    function close() {
      lb.hidden = true;
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKey);
      lastFocus && lastFocus.focus && lastFocus.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(cur + 1);
      else if (e.key === 'ArrowLeft') show(cur - 1);
    }
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', function () { show(cur - 1); });
    $('.lb-next', lb).addEventListener('click', function () { show(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-stage')) close(); });

    return { open: open };
  }

  // ==========================================================
  //  INTERACTIVE CALENDAR
  //  Reads data-* on each .cal-row, injects a filter bar,
  //  status badges and "Add to calendar" (.ics) buttons.
  // ==========================================================
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var AGE_LABEL  = { junior: 'Junior (u9–u11)', intermediate: 'Intermediate (u12–u15)', senior: 'Senior (u16+ / First teams)', all: 'All ages' };
  var TYPE_LABEL = { primary: 'Primary school', high: 'High school', private: 'Private school', mixed: 'Mixed / Combined' };
  var STATUS_LABEL = { open: 'Open', filling: 'Filling fast', waitlist: 'Waitlist', closed: 'Closed' };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function icsDate(iso, addDay) {
    var d = new Date(iso + 'T00:00:00');
    if (addDay) d.setDate(d.getDate() + 1); // DTEND is exclusive
    return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }
  function fold(str) { return String(str).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }

  function buildICS(ev) {
    var stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    var uid = 'egalite-' + (ev.start || '') + '-' + Math.abs(hashCode(ev.title)) + '@egalite.co.za';
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Egalite Promotions//Sport at Sun City//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + icsDate(ev.start),
      'DTEND;VALUE=DATE:' + icsDate(ev.end || ev.start, true),
      'SUMMARY:' + fold(ev.title),
      'DESCRIPTION:' + fold((ev.desc || '') + (ev.price ? '\nInvestment: ' + ev.price : '') + '\nRegister: www.egalite.co.za'),
      'LOCATION:' + fold(LOCATION),
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }
  function hashCode(s) {
    var h = 0; s = String(s);
    for (var i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
    return h;
  }
  function downloadICS(ev) {
    var blob = new Blob([buildICS(ev)], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = ev.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60) + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  var YEARS = ['2026', '2027'];

  function rowYear(row) {
    return row.getAttribute('data-year') || (row.getAttribute('data-start') || '').slice(0, 4);
  }

  $$('.calendar[data-interactive]').forEach(function (cal) {
    var sport = cal.getAttribute('data-sport') || 'general';
    var sportName = sport.charAt(0).toUpperCase() + sport.slice(1);
    var rows = $$('.cal-row', cal);

    // ---- Enhance each row: status badge + actions ----
    rows.forEach(function (row) {
      var start  = row.getAttribute('data-start');
      var titleEl = $('.cal-title', row) || $('.cal-event', row);
      var title  = (row.getAttribute('data-title') || (titleEl ? titleEl.textContent : '')).trim();
      var status = row.getAttribute('data-status') || 'open';
      var priceEl = $('.cal-price', row);
      var price  = row.getAttribute('data-price') || (priceEl ? priceEl.textContent.trim() : '');

      // Status is derived from the date: future = Open (green), past = Completed (yellow)
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var endD = new Date((row.getAttribute('data-end') || start || '') + 'T00:00:00');
      var isPast = endD < today;

      var dateCell = $('.cal-date', row);

      // Build a "N · date — title" label for the enquiry dropdown (before the badge is added)
      var codeEl = dateCell ? dateCell.querySelector('.ncode') : null;
      var code = codeEl ? codeEl.textContent.trim() : '';
      var dateText = dateCell ? dateCell.textContent.trim() : '';
      if (code && dateText.indexOf(code) === 0) dateText = dateText.slice(code.length).trim();
      var evLabel = (code ? code + ' · ' : '') + dateText + (title ? ' — ' + title : '');

      if (dateCell) {
        var badge = document.createElement('span');
        badge.className = 'cal-status ' + (isPast ? 'status-completed' : 'status-open');
        badge.textContent = isPast ? 'Completed' : 'Open';
        dateCell.appendChild(badge);
      }

      // Completed events get no Add / Enquire actions
      if (!isPast) {
        var actions = document.createElement('div');
        actions.className = 'cal-actions';

        var addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'cal-ics';
        addBtn.setAttribute('aria-label', 'Add "' + title + '" to your calendar');
        addBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 7v10H5V9h14zM12 11h-1v2H9v1h2v2h1v-2h2v-1h-2v-2z"/></svg><span>Add</span>';
        addBtn.addEventListener('click', function () {
          downloadICS({ start: start, end: row.getAttribute('data-end'), title: title, desc: title, price: price });
        });

        var regBtn;
        if (MAILTO_ENQUIRE_SPORTS.indexOf(sport) !== -1) {
          regBtn = document.createElement('a');
          regBtn.className = 'cal-reg';
          regBtn.textContent = 'Enquire';
          var mailSubject = sportName + ' Enquiry — ' + evLabel;
          var mailBody = 'Hi Egalite,\n\nI\'d like to enquire about ' + evLabel + ' at Sun City.\n\n';
          regBtn.href = 'mailto:' + (SPORT_EMAIL[sport] || SPORT_EMAIL.general) + '?subject=' + encodeURIComponent(mailSubject) + '&body=' + encodeURIComponent(mailBody);
        } else {
          regBtn = document.createElement('button');
          regBtn.type = 'button';
          regBtn.className = 'cal-reg';
          regBtn.textContent = 'Enquire';
          regBtn.setAttribute('data-register', '');
          regBtn.setAttribute('data-sport', sport);
          regBtn.setAttribute('data-tournament', evLabel);
        }

        actions.appendChild(addBtn);

        var infoPdf = row.getAttribute('data-info') || SPORT_INFO_PDF[sport];
        if (infoPdf) {
          var infoBtn = document.createElement('a');
          infoBtn.className = 'cal-info';
          infoBtn.textContent = 'More Info & Costs';
          infoBtn.href = infoPdf;
          infoBtn.target = '_blank';
          infoBtn.rel = 'noopener';
          actions.appendChild(infoBtn);
        }

        actions.appendChild(regBtn);
        row.appendChild(actions);
      }
    });

    // ---- Year selector (replaces the old filter bar) ----
    var bar = document.createElement('div');
    bar.className = 'cal-filters cal-filters--year';

    var yearLabel = document.createElement('label');
    yearLabel.className = 'cal-year';
    var yearText = document.createElement('span');
    yearText.textContent = 'Year';
    var yearSel = document.createElement('select');
    yearSel.className = 'cal-select';
    YEARS.forEach(function (y) {
      var o = document.createElement('option'); o.value = y; o.textContent = y; yearSel.appendChild(o);
    });
    yearLabel.appendChild(yearText);
    yearLabel.appendChild(yearSel);

    var count = document.createElement('span');
    count.className = 'cal-count';

    bar.appendChild(yearLabel);
    bar.appendChild(count);
    cal.parentNode.insertBefore(bar, cal);

    function apply() {
      var y = yearSel.value;
      var shown = 0;
      rows.forEach(function (row) {
        var ok = rowYear(row) === y;
        row.classList.toggle('is-hidden', !ok);
        if (ok) shown++;
      });
      count.textContent = shown ? shown + ' event' + (shown === 1 ? '' : 's') : '';
      var empty = $('.cal-empty', cal.parentNode);
      if (shown === 0) {
        if (!empty) {
          empty = document.createElement('p');
          empty.className = 'cal-empty';
          cal.parentNode.insertBefore(empty, cal.nextSibling);
        }
        empty.textContent = 'The ' + y + ' ' + sportName + ' schedule will be announced soon — tap “Enquire / Register” to be the first to know.';
      } else if (empty) {
        empty.remove();
      }
    }

    // Default to the earliest year that actually has events (fall back to 2026)
    var present = {};
    rows.forEach(function (r) { present[rowYear(r)] = true; });
    yearSel.value = YEARS.filter(function (y) { return present[y]; })[0] || '2026';

    yearSel.addEventListener('change', apply);
    apply();
  });

  // ==========================================================
  //  REGISTRATION / ENQUIRY MODAL  (injected once)
  // ==========================================================
  var modal = buildModal();
  document.body.appendChild(modal.el);

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-register]');
    if (trigger) {
      e.preventDefault();
      modal.open(trigger.getAttribute('data-sport') || 'general',
                 trigger.getAttribute('data-tournament') || '');
    }
  });

  function buildModal() {
    var wrap = document.createElement('div');
    wrap.className = 'reg-modal';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'reg-title');
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="reg-backdrop" data-close></div>' +
      '<div class="reg-panel" role="document">' +
        '<button class="reg-x" type="button" aria-label="Close" data-close>&times;</button>' +
        '<h2 id="reg-title">Tournament Enquiry</h2>' +
        '<p class="reg-sub">Tell us about your team and we\'ll be in touch. No account needed.</p>' +
        '<form class="reg-form" novalidate>' +
          '<div class="reg-grid">' +
            '<label>Sport<select name="sport" required>' +
              '<option value="tennis">Tennis</option><option value="netball">Netball</option>' +
              '<option value="golf">Golf</option><option value="general">General enquiry</option>' +
            '</select></label>' +
            '<label>Tournament / dates<select name="tournament"><option value="">— Select an event —</option></select></label>' +
            '<label>School / club<input name="school" type="text" required /></label>' +
            '<label>Contact name<input name="name" type="text" required /></label>' +
            '<label>Email<input name="email" type="email" required /></label>' +
            '<label>Phone / WhatsApp<input name="phone" type="tel" inputmode="tel" /></label>' +
            '<label>Age group(s)<input name="ages" type="text" placeholder="e.g. u14, u16, First team" /></label>' +
            '<label>Approx. players<input name="players" type="number" min="1" inputmode="numeric" /></label>' +
          '</div>' +
          '<label class="reg-full">Message<textarea name="message" rows="3" placeholder="Anything else we should know?"></textarea></label>' +
          '<div class="reg-actions">' +
            '<button type="submit" class="btn btn-yellow">Send enquiry</button>' +
            '<a class="reg-wa btn btn-green" target="_blank" rel="noopener">Chat on WhatsApp</a>' +
          '</div>' +
          '<p class="reg-note">Submitting opens your email app with the details ready to send. Prefer to talk? Use WhatsApp or call the coordinator on the contact page.</p>' +
          '<p class="reg-ok" hidden>Thanks! Your email app should now be open with your enquiry ready to send.</p>' +
        '</form>' +
      '</div>';

    var form = $('.reg-form', wrap);
    var sportSel = form.sport;
    var tourInput = form.tournament;

    // ---- Tournament options load dynamically for the selected sport ----
    // Events are parsed once per sport from that sport's page (single source of truth).
    var SPORT_PAGE = { tennis: 'tennis.html', netball: 'netball.html', golf: 'golf.html' };
    var eventsCache = {};

    function parseEvents(docLike) {
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var out = [];
      $$('.calendar[data-interactive] .cal-row', docLike).forEach(function (row) {
        var start = row.getAttribute('data-start');
        var end = row.getAttribute('data-end') || start;
        if (!end || new Date(end + 'T00:00:00') < today) return; // upcoming only
        var titleEl = $('.cal-title', row) || $('.cal-event', row);
        var title = (row.getAttribute('data-title') || (titleEl ? titleEl.textContent : '')).trim();
        var codeEl = $('.ncode', row);
        var code = codeEl ? codeEl.textContent.trim() : '';
        var dateCell = $('.cal-date', row);
        var dateText = dateCell ? dateCell.textContent.trim() : '';
        if (code && dateText.indexOf(code) === 0) dateText = dateText.slice(code.length).trim();
        out.push({
          year: row.getAttribute('data-year') || (start || '').slice(0, 4),
          label: (code ? code + ' · ' : '') + dateText + (title ? ' — ' + title : '')
        });
      });
      return out;
    }

    function getEvents(sport) {
      if (eventsCache[sport]) return Promise.resolve(eventsCache[sport]);
      var page = SPORT_PAGE[sport];
      if (!page) return Promise.resolve([]);
      return fetch(page).then(function (r) { return r.text(); }).then(function (html) {
        var ev = parseEvents(new DOMParser().parseFromString(html, 'text/html'));
        eventsCache[sport] = ev;
        return ev;
      }).catch(function () { return []; });
    }

    function populateTournaments(sport, preselect) {
      return getEvents(sport).then(function (events) {
        tourInput.innerHTML = '<option value="">— Select an event —</option>';
        var byYear = {};
        events.forEach(function (ev) { (byYear[ev.year] = byYear[ev.year] || []).push(ev); });
        var yrs = Object.keys(byYear).sort();
        yrs.forEach(function (yr) {
          var target = tourInput;
          if (yrs.length > 1) { var og = document.createElement('optgroup'); og.label = yr; tourInput.appendChild(og); target = og; }
          byYear[yr].forEach(function (ev) {
            var o = document.createElement('option'); o.value = ev.label; o.textContent = ev.label; target.appendChild(o);
          });
        });
        if (preselect) tourInput.value = preselect;
        updateWA();
      });
    }

    // Warm the cache for this page's own sport so opening an enquiry is instant
    var curCal = $('.calendar[data-interactive]');
    if (curCal) getEvents(curCal.getAttribute('data-sport'));

    var waLink = $('.reg-wa', wrap);
    var okMsg = $('.reg-ok', wrap);
    var lastFocus = null;

    function updateWA() {
      var num = { netball: '27828224117', tennis: '27828805782', golf: '27828805782', general: '27834436063' }[sportSel.value] || '27834436063';
      var msg = 'Hi Egalite, I\'d like to enquire about ' + (tourInput.value || (sportSel.value + ' tournaments')) + ' at Sun City.';
      waLink.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg);
    }
    sportSel.addEventListener('change', function () { populateTournaments(sportSel.value); });
    tourInput.addEventListener('change', updateWA);

    function open(sport, tournament) {
      lastFocus = document.activeElement;
      if (SPORT_EMAIL[sport]) sportSel.value = sport;
      okMsg.hidden = true;
      populateTournaments(sportSel.value, tournament || '');
      wrap.hidden = false;
      document.body.classList.add('modal-open');
      var first = $('input[name="school"]', form);
      setTimeout(function () { first && first.focus(); }, 30);
      document.addEventListener('keydown', onKey);
    }
    function close() {
      wrap.hidden = true;
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKey);
      lastFocus && lastFocus.focus && lastFocus.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') trapFocus(e);
    }
    function trapFocus(e) {
      var f = $$('a[href], button, input, select, textarea', wrap).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    $$('[data-close]', wrap).forEach(function (b) { b.addEventListener('click', close); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var d = new FormData(form);
      var sport = d.get('sport');
      var to = SPORT_EMAIL[sport] || SPORT_EMAIL.general;
      var subject = 'Tournament Enquiry – ' + sport.charAt(0).toUpperCase() + sport.slice(1) +
                    (d.get('tournament') ? ' – ' + d.get('tournament') : '');
      var body = [
        'Sport: ' + sport,
        'Tournament / dates: ' + (d.get('tournament') || '-'),
        'School / club: ' + d.get('school'),
        'Contact name: ' + d.get('name'),
        'Email: ' + d.get('email'),
        'Phone / WhatsApp: ' + (d.get('phone') || '-'),
        'Age group(s): ' + (d.get('ages') || '-'),
        'Approx. players: ' + (d.get('players') || '-'),
        '',
        'Message:',
        (d.get('message') || '-')
      ].join('\n');
      // NOTE: For a fully server-side flow, POST this FormData to a
      // Formspree/Netlify/API endpoint here instead of the mailto fallback.
      window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      okMsg.hidden = false;
    });

    return { el: wrap, open: open };
  }
})();
