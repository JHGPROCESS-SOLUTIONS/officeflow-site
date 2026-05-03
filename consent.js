/* OfficeFlow — cookie consent + tracker bootstrap
 *
 * GDPR-compliant flow:
 *   1. On first visit no tracking cookies are set.
 *   2. A banner asks for consent: "Alleen noodzakelijk" or "Alles accepteren"
 *      (equal prominence — no dark patterns).
 *   3. Choice persists in localStorage under STORAGE_KEY.
 *   4. Trackers (Google Ads gtag + Meta Pixel) only fire after a positive
 *      consent. "Alleen noodzakelijk" never loads them, ever.
 *   5. The user can revisit their choice via window.officeflowOpenConsent().
 *
 * Drop-in: include once on every page that previously had inline trackers.
 *   <script src="/consent.js" defer></script>
 *
 * Update GOOGLE_ADS_ID / META_PIXEL_ID below if those ever change.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'officeflow_consent_v1';
  var GOOGLE_ADS_ID = 'AW-18126974251';
  var META_PIXEL_ID = '1604000084226226';

  // -------------------------------------------------------------------------
  // Storage helpers
  // -------------------------------------------------------------------------
  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed.marketing === 'boolean') return parsed;
      return null;
    } catch (_) { return null; }
  }

  function saveConsent(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        marketing: !!state.marketing,
        timestamp: new Date().toISOString(),
      }));
    } catch (_) { /* private mode or quota — ignore */ }
  }

  // -------------------------------------------------------------------------
  // Tracker loaders — only run after a positive consent
  // -------------------------------------------------------------------------
  var _trackersLoaded = false;

  function loadTrackers() {
    if (_trackersLoaded) return;
    _trackersLoaded = true;

    // Google Ads gtag.js
    try {
      var gs = document.createElement('script');
      gs.async = true;
      gs.src = 'https://www.googletagmanager.com/gtag/js?id=' + GOOGLE_ADS_ID;
      document.head.appendChild(gs);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', GOOGLE_ADS_ID);
    } catch (e) {
      console.warn('[consent] gtag init failed', e);
    }

    // Meta Pixel — minified version of Meta's official snippet
    try {
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
        n.queue = []; t = b.createElement(e); t.async = !0;
        t.src = v; s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', META_PIXEL_ID);
      window.fbq('track', 'PageView');
    } catch (e) {
      console.warn('[consent] fbq init failed', e);
    }
  }

  // -------------------------------------------------------------------------
  // Banner UI
  // -------------------------------------------------------------------------
  var BANNER_ID = 'officeflow-consent-banner';

  function bannerHtml() {
    return ''
      + '<div id="' + BANNER_ID + '" role="dialog" aria-label="Cookie-toestemming" style="'
      +   'position:fixed;left:14px;right:14px;bottom:14px;'
      +   'max-width:640px;margin:0 auto;'
      +   'background:#fff;'
      +   'border:1.5px solid #fed7aa;'
      +   'border-radius:14px;'
      +   'box-shadow:0 12px 30px rgba(15,23,42,.15);'
      +   'padding:18px 20px;'
      +   'z-index:99999;'
      +   "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"
      +   'color:#0F172A;'
      +   'font-size:14px;line-height:1.55;'
      +   'animation:officeflow-consent-in .2s ease;'
      + '">'
      +   '<div style="font-weight:700;font-size:15px;margin-bottom:6px;">Cookies — kort verhaal</div>'
      +   '<div style="color:#475569;">'
      +     'We gebruiken cookies voor de werking van de site (altijd actief) en optioneel voor '
      +     'marketing-tracking (Google Ads + Meta Pixel). Geen profiling, geen verkoop aan derden. '
      +     'Meer info in onze <a href="/privacy.html" style="color:#F97316;">privacyverklaring</a>.'
      +   '</div>'
      +   '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center;">'
      +     '<button id="officeflow-consent-reject" type="button" style="'
      +       'background:#fff;border:1.5px solid #cbd5e1;color:#475569;'
      +       'padding:9px 16px;border-radius:9px;font-size:13.5px;font-weight:600;'
      +       'cursor:pointer;font-family:inherit;'
      +     '">Alleen noodzakelijk</button>'
      +     '<button id="officeflow-consent-accept" type="button" style="'
      +       'background:#F97316;border:1.5px solid #F97316;color:#fff;'
      +       'padding:9px 18px;border-radius:9px;font-size:13.5px;font-weight:700;'
      +       'cursor:pointer;font-family:inherit;'
      +       'margin-left:auto;'
      +     '">Alles accepteren</button>'
      +   '</div>'
      + '</div>';
  }

  function ensureKeyframesInjected() {
    if (document.getElementById('officeflow-consent-style')) return;
    var s = document.createElement('style');
    s.id = 'officeflow-consent-style';
    s.textContent = ''
      + '@keyframes officeflow-consent-in{from{opacity:0;transform:translateY(8px);}'
      + 'to{opacity:1;transform:translateY(0);}}'
      + '@media (max-width:480px){'
      +   '#' + BANNER_ID + ' button{width:100%;}'
      +   '#' + BANNER_ID + ' #officeflow-consent-accept{margin-left:0;}'
      + '}';
    document.head.appendChild(s);
  }

  function showBanner() {
    if (document.getElementById(BANNER_ID)) return;
    ensureKeyframesInjected();
    var wrap = document.createElement('div');
    wrap.innerHTML = bannerHtml();
    var node = wrap.firstElementChild;
    document.body.appendChild(node);

    document.getElementById('officeflow-consent-accept').addEventListener('click', function () {
      saveConsent({ marketing: true });
      removeBanner();
      loadTrackers();
    });
    document.getElementById('officeflow-consent-reject').addEventListener('click', function () {
      saveConsent({ marketing: false });
      removeBanner();
      // Trackers stay un-loaded until user revisits choice.
    });
  }

  function removeBanner() {
    var b = document.getElementById(BANNER_ID);
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  // -------------------------------------------------------------------------
  // Public API — for a footer "Cookie-instellingen" link to re-open the banner
  // -------------------------------------------------------------------------
  window.officeflowOpenConsent = function () {
    // Forget previous choice so the banner re-appears.
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    showBanner();
  };

  // -------------------------------------------------------------------------
  // Bootstrap on page-load
  // -------------------------------------------------------------------------
  function bootstrap() {
    var consent = readConsent();
    if (consent === null) {
      showBanner();
      return;
    }
    if (consent.marketing === true) {
      loadTrackers();
    }
    // marketing === false → don't load anything
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
