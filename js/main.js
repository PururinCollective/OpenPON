/* ==========================================================================
   Open PON Foundation — openpon.org
   Renders every section from the JSON files in /data.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- utils */

  var esc = function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /* Cache-busting stamp, read from this script's own ?commit= in index.html. Taking it
     from there means the JSON requests inherit whatever the page was stamped with, so a
     release only has to rewrite index.html - not every data URL in here. */
  var COMMIT = (function () {
    var el = document.currentScript;
    if (!el) {
      var all = document.getElementsByTagName('script');
      el = all[all.length - 1];
    }
    var match = el && el.src && el.src.match(/[?&]commit=([^&]*)/);
    return match ? match[1] : '';
  })();

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  var GITHUB_ICON =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 ' +
    '0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 ' +
    '1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 ' +
    '0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 ' +
    '0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';

  /* Initials used for the contributor avatars. */
  function initials(name) {
    var clean = String(name).trim();
    var words = clean.split(/\s+/);
    if (words.length > 1) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    var rest = clean.slice(1);
    var upper = rest.match(/[A-Z]/);
    if (upper) return (clean.charAt(0) + upper[0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  }

  function fail(container, file) {
    container.removeAttribute('data-loading');
    container.innerHTML =
      '<div class="data-error">Could not load <code>data/' + esc(file) + '</code>. ' +
      'This page reads its content from JSON over HTTP &mdash; serve the folder with ' +
      '<code>python -m http.server</code> rather than opening the file directly.</div>';
  }

  function loadJSON(file) {
    /* The stamp is what makes these safe to cache hard; without one, fall back to
       revalidating so an edit still shows up during local development. */
    var url = 'data/' + file + (COMMIT ? '?commit=' + encodeURIComponent(COMMIT) : '');
    var opts = COMMIT ? undefined : { cache: 'no-cache' };

    return fetch(url, opts).then(function (res) {
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      return res.json();
    });
  }

  /* ------------------------------------------------------------- renderers */

  function renderFirmware(list, el) {
    var sorted = list.slice().sort(function (a, b) {
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });

    el.innerHTML = sorted.map(function (fw) {
      var head =
        '<div class="fw-head">' +
          '<h3>' + esc(fw.name) + '</h3>' +
          (fw.featured ? '<span class="fw-badge">Popular</span>' : '') +
          '<span class="fw-badge is-tech">' + esc(fw.technology) + '</span>' +
        '</div>';

      var meta =
        '<div class="fw-meta">' +
          '<span>by <b>' + esc(fw.authors) + '</b></span>' +
          '<span class="fw-chip">' + esc(fw.chipset) + '</span>' +
        '</div>';

      var summary = '<p class="fw-summary">' + esc(fw.summary) + '</p>';

      var features = (fw.features && fw.features.length)
        ? '<ul class="fw-features">' + fw.features.map(function (f) {
            return '<li>' + esc(f) + '</li>';
          }).join('') + '</ul>'
        : '';

      if (fw.featured) {
        return '<article class="fw-card is-featured">' +
                 '<div class="fw-main">' + head + meta + summary + '</div>' +
                 features +
               '</article>';
      }
      return '<article class="fw-card">' + head + meta + summary + features + '</article>';
    }).join('');

    el.removeAttribute('data-loading');
  }

  function renderDevices(list, el) {
    var sorted = list.slice().sort(function (a, b) {
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });

    el.innerHTML = sorted.map(function (d) {
      var head =
        '<div class="device-top">' +
          '<h3>' + esc(d.vendor) + '</h3>' +
          (d.featured ? '<span class="device-badge">Flagship</span>' : '') +
          '<span class="compat level-' + esc(d.level) + '">' + esc(d.compatibility) + '</span>' +
        '</div>';

      if (!d.featured) {
        return '<article class="device-card">' + head +
                 '<p>' + esc(d.notes) + '</p>' +
               '</article>';
      }

      var pick = d.recommended
        ? '<p class="device-pick">' +
            '<span class="device-pick-label">Recommended</span>' +
            '<b>' + esc(d.recommended.model) + '</b> &mdash; ' + esc(d.recommended.note) +
          '</p>'
        : '';

      var features = (d.features && d.features.length)
        ? '<ul class="fw-features device-features">' + d.features.map(function (f) {
            return '<li>' + esc(f) + '</li>';
          }).join('') + '</ul>'
        : '';

      return '<article class="device-card is-featured">' +
               '<div class="device-main">' +
                 head +
                 (d.summary ? '<p class="device-summary">' + esc(d.summary) + '</p>' : '') +
                 pick +
               '</div>' +
               features +
             '</article>';
    }).join('');

    el.removeAttribute('data-loading');
  }

  function renderCoverage(list, el) {
    var order = [];
    var groups = {};

    list.forEach(function (c) {
      var region = c.region || 'Other';
      if (!groups[region]) { groups[region] = []; order.push(region); }
      groups[region].push(c);
    });

    el.innerHTML = order.map(function (region) {
      var items = groups[region];
      var cards = items.map(function (c) {
        var ops = (c.operators && c.operators.length)
          ? '<div class="country-ops">' + esc(c.operators.join(', ')) + '</div>'
          : '';
        return '<div class="country">' +
                 '<span class="cc">' + esc(c.code) + '</span>' +
                 '<div class="country-body">' +
                   '<div class="country-name">' + esc(c.name) + '</div>' + ops +
                 '</div>' +
               '</div>';
      }).join('');

      return '<div class="region-block">' +
               '<h3>' + esc(region) +
                 '<span class="region-count">' + items.length +
                 (items.length === 1 ? ' country' : ' countries') + '</span>' +
               '</h3>' +
               '<div class="country-grid">' + cards + '</div>' +
             '</div>';
    }).join('');

    el.removeAttribute('data-loading');
  }

  function renderPeople(list, el) {
    el.innerHTML = list.map(function (p) {
      var loc = p.country
        ? '<div class="person-loc">' + esc(p.country) + '</div>'
        : '<div class="person-loc">Open PON contributor</div>';

      var tags = (p.roles || []).map(function (r) {
        var lead = /lead/i.test(r) ? ' is-lead' : '';
        return '<span class="tag' + lead + '">' + esc(r) + '</span>';
      }).join('');

      var links = '';
      if (p.github) {
        links += '<a class="gh-link" href="' + esc(p.github) + '" target="_blank" rel="noopener noreferrer">' +
                 GITHUB_ICON + esc(p.github.replace(/^https?:\/\/(www\.)?github\.com\//, '@')) + '</a>';
      }
      if (p.community) {
        links += '<span class="person-community">' + esc(p.community) + '</span>';
      }

      return '<article class="person">' +
               '<div class="person-top">' +
                 '<span class="avatar" aria-hidden="true">' + esc(initials(p.name)) + '</span>' +
                 '<div class="person-id">' +
                   '<div class="person-name">' + esc(p.name) + '</div>' + loc +
                 '</div>' +
               '</div>' +
               '<p class="person-focus">' + esc(p.focus) + '</p>' +
               '<div class="person-tags">' + tags + '</div>' +
               (links ? '<div class="person-links">' + links + '</div>' : '') +
             '</article>';
    }).join('');

    el.removeAttribute('data-loading');
  }

  function renderCompanies(list, el) {
    el.innerHTML = list.map(function (c) {
      var site = c.website
        ? '<a href="' + esc(c.website) + '" target="_blank" rel="noopener noreferrer">' +
            esc(c.domain || c.website) + '</a>'
        : '';
      var country = c.country ? '<span>' + esc(c.country) + '</span>' : '';
      var meta = (site || country)
        ? '<div class="company-meta">' + site + country + '</div>'
        : '';

      return '<article class="company">' +
               '<div class="company-top">' +
                 '<h3>' + esc(c.name) + '</h3>' +
                 (c.asn ? '<span class="asn">' + esc(c.asn) + '</span>' : '') +
               '</div>' +
               '<p class="company-role">' + esc(c.role) + '</p>' +
               meta +
             '</article>';
    }).join('');
    el.removeAttribute('data-loading');
  }

  function renderSuppliers(list, el) {
    el.innerHTML = list.map(function (region) {
      var vendors = region.vendors.map(function (v) {
        var contact = '';
        if (v.contact) {
          var value = v.contact.url
            ? '<a href="' + esc(v.contact.url) + '" target="_blank" rel="noopener noreferrer">' +
                esc(v.contact.value) + '</a>'
            : '<span>' + esc(v.contact.value) + '</span>';
          contact += '<span class="contact-label">' + esc(v.contact.type) + '</span>' + value;
        }
        if (v.website) {
          contact += '<a href="' + esc(v.website) + '" target="_blank" rel="noopener noreferrer">' +
                     esc(v.website.replace(/^https?:\/\//, '')) + '</a>';
        }

        return '<article class="supplier">' +
                 '<h4>' + esc(v.name) + '</h4>' +
                 '<p class="supplier-role">' + esc(v.role) + '</p>' +
                 (contact ? '<div class="supplier-contact">' + contact + '</div>' : '') +
               '</article>';
      }).join('');

      return '<section class="supplier-region">' +
               '<header class="supplier-head">' +
                 '<span class="cc">' + esc(region.code) + '</span>' +
                 '<h3>' + esc(region.country) + '</h3>' +
               '</header>' +
               '<div class="supplier-list">' + vendors + '</div>' +
             '</section>';
    }).join('');

    el.removeAttribute('data-loading');
  }

  function setStat(key, value) {
    var el = document.querySelector('[data-stat="' + key + '"]');
    if (el) el.textContent = value;
  }

  /* ------------------------------------------------------------ behaviours */

  function initNav() {
    var toggle = $('#navToggle');
    var nav = $('#primaryNav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function initHeaderState() {
    var header = $('.site-header');
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initScrollSpy() {
    var links = $$('.primary-nav a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    var sections = links.map(function (a) {
      var section = document.querySelector(a.getAttribute('href'));
      if (section) map[section.id] = a;
      return section;
    }).filter(Boolean);

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        var active = map[entry.target.id];
        if (active) active.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (s) { observer.observe(s); });
  }

  /* The hero streaks repaint every frame; stop them once the hero is off screen. */
  function initMesh() {
    var mesh = $('.hero-mesh');
    if (!mesh || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      mesh.classList.toggle('is-paused', !entries[0].isIntersecting);
    }, { threshold: 0 });

    observer.observe(mesh);
  }

  /* Specular spot on the hero glass. Pointer-driven only - it never moves on its own,
     so there is nothing here for prefers-reduced-motion to suppress. */
  function initGlass() {
    var art = $('.hero-art');
    if (!art || !window.matchMedia('(hover: hover)').matches) return;

    var frame = null;
    var pending = null;

    function paint() {
      frame = null;
      art.style.setProperty('--gx', pending.x.toFixed(1) + '%');
      art.style.setProperty('--gy', pending.y.toFixed(1) + '%');
    }

    art.addEventListener('pointermove', function (e) {
      var box = art.getBoundingClientRect();
      pending = {
        x: ((e.clientX - box.left) / box.width) * 100,
        y: ((e.clientY - box.top) / box.height) * 100
      };
      if (!frame) frame = requestAnimationFrame(paint);
    });

    art.addEventListener('pointerleave', function () {
      if (frame) { cancelAnimationFrame(frame); frame = null; }
      art.style.removeProperty('--gx');
      art.style.removeProperty('--gy');
    });
  }

  var revealObserver = null;

  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  }

  function reveal(root) {
    var selectors = [
      '.section-head', '.aligned-card', '.pillar', '.fw-card', '.device-card',
      '.region-block', '.person', '.company', '.supplier-region', '.safety-card', '.stat'
    ].join(',');

    $$(selectors, root || document).forEach(function (el, i) {
      if (el.classList.contains('reveal')) return;
      el.classList.add('reveal');
      el.style.transitionDelay = Math.min(i % 6, 5) * 55 + 'ms';
      if (revealObserver) {
        revealObserver.observe(el);
      } else {
        el.classList.add('is-visible');
      }
    });
  }

  /* ------------------------------------------------------------------ boot */

  function section(file, id, renderer, onData) {
    var el = document.getElementById(id);
    if (!el) return Promise.resolve();

    return loadJSON(file)
      .then(function (data) {
        renderer(data, el);
        if (onData) onData(data);
        reveal(el);
      })
      .catch(function (err) {
        console.error('[openpon] ' + file, err);
        fail(el, file);
      });
  }

  function init() {
    var year = $('#year');
    if (year) year.textContent = new Date().getFullYear();

    initNav();
    initHeaderState();
    initScrollSpy();
    initMesh();
    initGlass();
    initReveal();
    reveal(document);

    section('firmware.json', 'firmwareGrid', renderFirmware, function (d) {
      setStat('firmware', d.length);
    });
    section('devices.json', 'deviceGrid', renderDevices, function (d) {
      setStat('devices', d.length);
    });
    section('countries.json', 'coverageRegions', renderCoverage, function (d) {
      setStat('countries', d.length);
    });
    section('people.json', 'peopleGrid', renderPeople, function (d) {
      setStat('people', d.length);
    });
    section('companies.json', 'companyGrid', renderCompanies);
    section('suppliers.json', 'supplierRegions', renderSuppliers);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
