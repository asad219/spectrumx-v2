(function () {
  'use strict';

  var state = {
    data: null,
    filter: 'all',
    index: -1,
    filtered: [],
  };

  var els = {};

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  var ACRONYMS = { ai: 'AI', bmi: 'BMI', saas: 'SaaS', ui: 'UI', ux: 'UX' };

  function prettyTitle(name) {
    return String(name || '')
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map(function (word) {
        var key = word.toLowerCase();
        if (ACRONYMS[key]) return ACRONYMS[key];
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function observeReveal(nodes) {
    if (!nodes || !nodes.length) return;
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
    );
    nodes.forEach(function (el) {
      observer.observe(el);
    });
  }

  async function loadData() {
    var sources = ['api/portfolio.php', 'api/portfolio', 'assets/portfolio/manifest.json'];
    var lastError = null;

    for (var i = 0; i < sources.length; i++) {
      try {
        var res = await fetch(sources[i], { cache: 'no-store' });
        if (!res.ok) throw new Error(sources[i] + ' → ' + res.status);
        var data = await res.json();
        if (data && Array.isArray(data.items)) return data;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Unable to load portfolio');
  }

  function renderFilters() {
    var cats = state.data.categories || [];
    var total = (state.data.items || []).length;
    var html = [
      '<button type="button" class="portfolio-filter is-active" data-filter="all" aria-pressed="true">All <span>' +
        total +
        '</span></button>',
    ];

    cats.forEach(function (cat) {
      html.push(
        '<button type="button" class="portfolio-filter" data-filter="' +
          escapeHtml(cat.id) +
          '" aria-pressed="false">' +
          escapeHtml(cat.label) +
          ' <span>' +
          cat.count +
          '</span></button>'
      );
    });

    els.filters.innerHTML = html.join('');
    els.filters.querySelectorAll('.portfolio-filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setFilter(btn.getAttribute('data-filter'));
      });
    });
  }

  function setFilter(id) {
    state.filter = id || 'all';
    els.filters.querySelectorAll('.portfolio-filter').forEach(function (btn) {
      var active = btn.getAttribute('data-filter') === state.filter;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    renderGallery();
  }

  function currentItems() {
    var items = state.data.items || [];
    if (state.filter === 'all') return items.slice();
    return items.filter(function (item) {
      return item.category === state.filter;
    });
  }

  function renderGallery() {
    state.filtered = currentItems();
    els.count.textContent =
      state.filtered.length + (state.filtered.length === 1 ? ' project' : ' projects');

    if (!state.filtered.length) {
      els.gallery.innerHTML = '';
      els.empty.classList.remove('hidden');
      return;
    }

    els.empty.classList.add('hidden');
    els.gallery.innerHTML = state.filtered
      .map(function (item, i) {
        return (
          '<article class="portfolio-card reveal" style="transition-delay:' +
          Math.min(i * 40, 280) +
          'ms">' +
          '<button type="button" class="portfolio-card-hit" data-index="' +
          i +
          '" aria-label="View ' +
          escapeHtml(item.alt) +
          '">' +
          '<img src="' +
          escapeHtml(item.src) +
          '" alt="' +
          escapeHtml(item.alt) +
          '" loading="lazy" decoding="async" />' +
          '<span class="portfolio-card-shade" aria-hidden="true"></span>' +
          '<span class="portfolio-card-meta">' +
          '<span class="portfolio-card-cat">' +
          escapeHtml(item.categoryLabel) +
          '</span>' +
          '<span class="portfolio-card-name">' +
          escapeHtml(item.title || prettyTitle(item.name)) +
          '</span>' +
          '</span>' +
          '</button>' +
          '</article>'
        );
      })
      .join('');

    els.gallery.querySelectorAll('.portfolio-card-hit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openLightbox(Number(btn.getAttribute('data-index')));
      });
    });

    observeReveal(els.gallery.querySelectorAll('.reveal'));
  }

  function openLightbox(index) {
    if (!state.filtered.length) return;
    state.index = ((index % state.filtered.length) + state.filtered.length) % state.filtered.length;
    var item = state.filtered[state.index];
    els.lbImage.src = item.src;
    els.lbImage.alt = item.alt;
    els.lbCat.textContent = item.categoryLabel;
    els.lbName.textContent = item.title || prettyTitle(item.name);
    els.lbCounter.textContent = state.index + 1 + ' / ' + state.filtered.length;
    els.lightbox.classList.add('is-open');
    els.lightbox.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('portfolio-lightbox-open');
    els.lbClose.focus();
  }

  function closeLightbox() {
    els.lightbox.classList.remove('is-open');
    els.lightbox.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('portfolio-lightbox-open');
    els.lbImage.removeAttribute('src');
    state.index = -1;
  }

  function stepLightbox(delta) {
    if (state.index < 0 || !state.filtered.length) return;
    openLightbox(state.index + delta);
  }

  function bindLightbox() {
    els.lbClose.addEventListener('click', closeLightbox);
    els.lbPrev.addEventListener('click', function () {
      stepLightbox(-1);
    });
    els.lbNext.addEventListener('click', function () {
      stepLightbox(1);
    });
    els.lightbox.addEventListener('click', function (event) {
      if (event.target === els.lightbox || event.target.classList.contains('portfolio-lb-backdrop')) {
        closeLightbox();
      }
    });
    document.addEventListener('keydown', function (event) {
      if (!els.lightbox.classList.contains('is-open')) return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') stepLightbox(-1);
      if (event.key === 'ArrowRight') stepLightbox(1);
    });
  }

  function showError(message) {
    els.loading.classList.add('hidden');
    els.empty.classList.remove('hidden');
    els.empty.innerHTML =
      '<p class="font-display text-xl font-semibold text-white">Gallery unavailable</p>' +
      '<p class="mt-2 text-sm text-ink-muted">' +
      escapeHtml(message) +
      '</p>';
  }

  async function init() {
    els.filters = qs('#portfolio-filters');
    els.gallery = qs('#portfolio-gallery');
    els.empty = qs('#portfolio-empty');
    els.loading = qs('#portfolio-loading');
    els.count = qs('#portfolio-count');
    els.lightbox = qs('#portfolio-lightbox');
    els.lbImage = qs('#portfolio-lb-image');
    els.lbCat = qs('#portfolio-lb-cat');
    els.lbName = qs('#portfolio-lb-name');
    els.lbCounter = qs('#portfolio-lb-counter');
    els.lbClose = qs('#portfolio-lb-close');
    els.lbPrev = qs('#portfolio-lb-prev');
    els.lbNext = qs('#portfolio-lb-next');

    if (!els.gallery || !els.filters) return;

    bindLightbox();

    try {
      state.data = await loadData();
      els.loading.classList.add('hidden');
      renderFilters();
      renderGallery();
    } catch (err) {
      showError(
        'Add category folders with images under assets/portfolio, then refresh. On static hosts run npm run portfolio.'
      );
      console.error(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
