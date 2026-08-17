(function () {
  'use strict';

  var scriptEl = document.currentScript;
  var SITE_BASE = '';

  if (scriptEl && scriptEl.src) {
    SITE_BASE = scriptEl.src.replace(/assets\/js\/components\.js(?:\?.*)?$/i, '');
  }

  window.SITE_BASE = SITE_BASE;

  function withBase(path) {
    if (!path || /^(https?:|mailto:|tel:|#)/i.test(path)) return path;
    if (path === './' || path === '.') return SITE_BASE || './';
    return SITE_BASE + path.replace(/^\.\//, '').replace(/^\//, '');
  }

  function rewriteRootLinks(root) {
    root.querySelectorAll('[href]').forEach(function (el) {
      var href = el.getAttribute('href');
      if (!href || /^(https?:|mailto:|tel:|#)/i.test(href)) return;
      el.setAttribute('href', withBase(href));
    });

    root.querySelectorAll('[src]').forEach(function (el) {
      var src = el.getAttribute('src');
      if (!src || /^(https?:|data:)/i.test(src)) return;
      el.setAttribute('src', withBase(src));
    });
  }

  function markActiveNav(root) {
    var path = window.location.pathname.replace(/\/+$/, '');
    var file = (path.split('/').pop() || 'index').replace(/\.html$/i, '');

    root.querySelectorAll('[data-nav]').forEach(function (link) {
      var key = link.getAttribute('data-nav');
      var active =
        (key === 'about' && file === 'about') ||
        (key === 'solutions' && path.indexOf('/solutions') !== -1) ||
        (key === 'careers' && file === 'careers') ||
        (key === 'portfolio' && file === 'portfolio') ||
        (key === 'blog' && (file === 'blog' || path.indexOf('/blogs') !== -1));

      if (active) link.classList.add('is-active');
    });
  }

  function initMobileMenu(root) {
    var toggle = root.querySelector('#mobile-menu-toggle');
    var menu = root.querySelector('#mobile-menu');
    var backdrop = root.querySelector('#mobile-menu-backdrop');
    var closeBtn = root.querySelector('#mobile-menu-close');
    if (!toggle || !menu) return;

    var accordionTrigger = root.querySelector('#mobile-solutions-trigger');
    var accordion = root.querySelector('.mobile-accordion');
    var isOpen = false;

    function setAccordionOpen(open) {
      if (!accordion || !accordionTrigger) return;
      accordion.classList.toggle('is-open', open);
      accordionTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function setOpen(open) {
      isOpen = open;

      if (open) {
        menu.hidden = false;
        if (backdrop) backdrop.hidden = false;
        // Allow paint before animating in
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            menu.classList.add('is-open');
            if (backdrop) backdrop.classList.add('is-open');
          });
        });
      } else {
        menu.classList.remove('is-open');
        if (backdrop) backdrop.classList.remove('is-open');
        setAccordionOpen(false);
        window.setTimeout(function () {
          if (!isOpen) {
            menu.hidden = true;
            if (backdrop) backdrop.hidden = true;
          }
        }, 320);
      }

      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (backdrop) backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.documentElement.classList.toggle('overflow-hidden', open);
    }

    toggle.addEventListener('click', function () {
      setOpen(!isOpen);
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        setOpen(false);
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', function () {
        setOpen(false);
      });
    }

    if (accordionTrigger) {
      accordionTrigger.addEventListener('click', function () {
        setAccordionOpen(!accordion.classList.contains('is-open'));
      });
    }

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setOpen(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) setOpen(false);
    });
  }

  function inject(id, file) {
    var mount = document.getElementById(id);
    if (!mount) return Promise.resolve();

    var cacheKey = 'sx-component:' + file;
    var cached = null;
    try {
      cached = sessionStorage.getItem(cacheKey);
    } catch (e) {}

    function applyHtml(html) {
      mount.innerHTML = html;
      rewriteRootLinks(mount);
      if (file === 'header.html') {
        markActiveNav(mount);
        initMobileMenu(mount);
      }
    }

    // Paint instantly from cache on navigation (avoids header/footer jerk)
    if (cached) {
      applyHtml(cached);
    }

    return fetch(withBase('components/' + file), { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ' + file);
        return res.text();
      })
      .then(function (html) {
        try {
          sessionStorage.setItem(cacheKey, html);
        } catch (e) {}

        if (!cached || cached !== html) {
          applyHtml(html);
        } else if (file === 'header.html') {
          // Same markup — only refresh active nav for the new page
          mount.querySelectorAll('[data-nav].is-active').forEach(function (el) {
            el.classList.remove('is-active');
          });
          markActiveNav(mount);
        }
      })
      .catch(function (err) {
        console.error(err);
        if (!cached) mount.innerHTML = '';
      });
  }

  function injectWhatsApp() {
    if (document.getElementById('whatsapp-float')) return;

    var link = document.createElement('a');
    link.id = 'whatsapp-float';
    link.className = 'whatsapp-float';
    link.href = 'https://wa.me/923342142219';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Chat with SpectrumX on WhatsApp');
    link.title = 'WhatsApp: +92-334-2142219';
    link.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.99.59 3.85 1.61 5.42L2 22l4.82-1.7a9.86 9.86 0 004.22.95h.01c5.46 0 9.91-4.45 9.91-9.91C20.96 6.45 16.5 2 12.04 2zm5.79 14.02c-.24.68-1.4 1.25-1.93 1.33-.5.08-1.13.11-1.82-.11-.42-.14-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.4-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.52-.1.2-.14.32-.28.49-.14.17-.3.38-.43.51-.14.14-.29.29-.12.57.16.29.72 1.19 1.55 1.93 1.06.95 1.96 1.25 2.24 1.39.28.14.45.12.61-.07.17-.2.7-.82.89-1.1.19-.29.37-.24.63-.14.26.1 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.69-.17 1.37z"/>' +
      '</svg>';

    document.body.appendChild(link);
  }

  function injectAnalytics() {
    var measurementId = 'G-9GQ3SRZ2J9';
    if (document.getElementById('sx-gtag')) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };

    var script = document.createElement('script');
    script.id = 'sx-gtag';
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', measurementId);
  }

  var RECAPTCHA_SITE_KEY = '6Lfi-YotAAAAAJHOSkoPslZoQuYd5js87umAfmtz';

  window.onSubmit = function (token) {
    var form = document.getElementById('consultation-form');
    if (!form) return;

    if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;

    var field = form.querySelector('input[name="g-recaptcha-response"]');
    if (!field) {
      field = document.createElement('input');
      field.type = 'hidden';
      field.name = 'g-recaptcha-response';
      form.appendChild(field);
    }
    field.value = token;

    HTMLFormElement.prototype.submit.call(form);
  };

  function injectRecaptcha() {
    if (document.getElementById('sx-recaptcha')) return;
    if (!document.querySelector('.g-recaptcha, #consultation-form')) return;

    var script = document.createElement('script');
    script.id = 'sx-recaptcha';
    script.src = 'https://www.google.com/recaptcha/enterprise.js?render=' + RECAPTCHA_SITE_KEY;
    script.async = true;
    document.head.appendChild(script);
  }

  injectAnalytics();
  injectRecaptcha();

  Promise.all([inject('header-placeholder', 'header.html'), inject('footer-placeholder', 'footer.html')]).then(function () {
    injectWhatsApp();
    document.dispatchEvent(new CustomEvent('components:ready'));
  });
})();
