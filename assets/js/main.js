(function () {
  'use strict';

  function initReveal() {
    var nodes = document.querySelectorAll('.reveal');
    if (!nodes.length) return;

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
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    nodes.forEach(function (el) {
      observer.observe(el);
    });
  }

  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var id = link.getAttribute('href');
        if (!id || id === '#') return;
        var target = document.querySelector(id);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function samePage(url) {
    return url.pathname === window.location.pathname && url.search === window.location.search;
  }

  function initPageTransitions() {
    var html = document.documentElement;
    html.classList.add('page-ready');

    window.addEventListener('pageshow', function () {
      html.classList.remove('is-leaving');
      html.classList.add('page-ready');
    });

    if ('startViewTransition' in document) return;

    document.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      var link = event.target.closest('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

      var href = link.getAttribute('href');
      if (!href || /^(mailto:|tel:|#)/i.test(href)) return;

      var url;
      try {
        url = new URL(link.href, window.location.href);
      } catch (err) {
        return;
      }

      if (url.origin !== window.location.origin || samePage(url)) return;

      event.preventDefault();
      html.classList.add('is-leaving');
      window.setTimeout(function () {
        window.location.href = url.href;
      }, 160);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initReveal();
    initSmoothAnchors();
    initPageTransitions();
  });
})();
