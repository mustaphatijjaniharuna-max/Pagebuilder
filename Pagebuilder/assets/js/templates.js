/* ==========================================================================
   PageBuilder — templates.js
   The render engine. Every template is a function that takes a site object and
   returns a COMPLETE, self-contained HTML document (inline CSS, no external
   files, no build step).

   The same output is used for:
     - the live preview iframe in the editor
     - the thumbnail iframes in the gallery
     - the file the user downloads and deploys

   Because the generated site has zero dependencies, users can drop the single
   index.html onto GitHub Pages, Netlify, Cloudflare Pages, or any static host.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------- */
  /* Helpers                                                                 */
  /* ---------------------------------------------------------------------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Only allow safe image sources (data URLs / http / relative paths).
  function safeImg(src) {
    var s = String(src || "").trim();
    if (/^data:image\//i.test(s) || /^https?:\/\//i.test(s) || /^\.{0,2}\//.test(s)) return s;
    return "";
  }

  function digits(value) {
    return String(value || "").replace(/[^\d]/g, "");
  }

  function waLink(number, message) {
    var n = digits(number);
    if (!n) return "";
    return "https://wa.me/" + n + "?text=" + encodeURIComponent(message || "Hi! I found you online.");
  }

  function initials(name) {
    var parts = String(name || "?").trim().split(/\s+/).slice(0, 2);
    return parts.map(function (p) { return p.charAt(0).toUpperCase(); }).join("") || "?";
  }

  function money(price) {
    var p = String(price == null ? "" : price).trim();
    if (!p) return "";
    // Already looks like a formatted price (has a symbol or letters).
    if (/[^\d.,\s]/.test(p)) return p;
    return "$" + p;
  }

  function has(v) { return v != null && String(v).trim() !== ""; }

  /**
   * Turn a relative luminance check into a readable text colour, so a light
   * brand colour never gets white text on top of it.
   */
  function readableOn(hex) {
    var c = String(hex || "").replace("#", "");
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    if (c.length !== 6 || /[^0-9a-f]/i.test(c)) return "#ffffff";
    var r = parseInt(c.slice(0, 2), 16) / 255;
    var g = parseInt(c.slice(2, 4), 16) / 255;
    var b = parseInt(c.slice(4, 6), 16) / 255;
    function lin(v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    var L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return L > 0.55 ? "#14121f" : "#ffffff";
  }

  function mix(hexA, hexB, amount) {
    function parse(h) {
      h = String(h || "").replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return [0, 0, 0];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    var a = parse(hexA), b = parse(hexB);
    var out = a.map(function (v, i) { return Math.round(v + (b[i] - v) * amount); });
    return "#" + out.map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
  }

  /* ---------------------------------------------------------------------- */
  /* Shared building blocks                                                  */
  /* ---------------------------------------------------------------------- */

  function contactBlock(site, opts) {
    var rows = [];
    if (has(site.phone)) {
      rows.push('<li><span class="ci">☎</span><a href="tel:' + esc(digits(site.phone)) + '">' + esc(site.phone) + "</a></li>");
    }
    if (has(site.email)) {
      rows.push('<li><span class="ci">✉</span><a href="mailto:' + esc(site.email) + '">' + esc(site.email) + "</a></li>");
    }
    if (has(site.address)) {
      var q = encodeURIComponent(site.address);
      rows.push('<li><span class="ci">📍</span><a href="https://maps.google.com/?q=' + q + '" target="_blank" rel="noopener">' + esc(site.address) + "</a></li>");
    }
    if (has(site.hours)) {
      rows.push('<li><span class="ci">🕒</span><span>' + esc(site.hours) + "</span></li>");
    }
    if (!rows.length) return "";
    return '<ul class="contact-list">' + rows.join("") + "</ul>";
  }

  function socialRow(site, color) {
    var parts = [];
    var wa = waLink(site.whatsapp, "Hi " + (site.name || "") + "!");
    if (wa) parts.push('<a class="social" href="' + wa + '" target="_blank" rel="noopener">WhatsApp</a>');
    if (has(site.phone)) parts.push('<a class="social" href="tel:' + esc(digits(site.phone)) + '">Call</a>');
    if (has(site.email)) parts.push('<a class="social" href="mailto:' + esc(site.email) + '">Email</a>');
    return parts.length ? '<div class="social-row">' + parts.join("") + "</div>" : "";
  }

  function waFloat(site) {
    var wa = waLink(site.whatsapp, "Hi " + (site.name || "") + "! I saw your website and I'd like to know more.");
    if (!wa) return "";
    return '<a class="wa-float" href="' + wa + '" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">' +
      '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">' +
      '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1.01-2.41.26-.29.57-.36.76-.36l.55.01c.18.01.41-.07.64.49.24.58.81 1.99.88 2.13.07.14.12.31.02.5-.1.19-.15.31-.29.48l-.44.51c-.14.14-.29.3-.12.58.16.29.73 1.2 1.56 1.94 1.07.95 1.97 1.25 2.25 1.39.29.14.45.12.62-.07.17-.19.71-.83.9-1.11.19-.29.38-.24.64-.14.26.09 1.66.78 1.95.93.29.14.48.21.55.33.07.12.07.7-.17 1.38z"/></svg></a>';
  }

  function logoMark(site, colorOnBrand) {
    var src = safeImg(site.logo);
    if (src) return '<img class="logo-img" src="' + esc(src) + '" alt="' + esc(site.name || "Logo") + '">';
    return '<span class="logo-initials" style="color:' + colorOnBrand + '">' + esc(initials(site.name)) + "</span>";
  }

  function itemGrid(items, className, priceLabel) {
    if (!items || !items.length) return "";
    var cards = items.map(function (it) {
      var price = money(it.price);
      return '' +
        '<article class="' + className + '">' +
        (price ? '<div class="item-price">' + esc(price) + "</div>" : "") +
        "<h3>" + esc(it.name || "Untitled") + "</h3>" +
        (has(it.description) ? "<p>" + esc(it.description) + "</p>" : "") +
        (has(it.price) && priceLabel ? '<a class="item-cta" href="#contact">' + esc(priceLabel) + "</a>" : "") +
        "</article>";
    }).join("");
    return cards;
  }

  /* Shared stylesheet, parameterised by brand colours. */
  function baseCss(site, opts) {
    opts = opts || {};
    var primary = site.primary || "#5346d1";
    var accent = site.accent || "#b8f14b";
    var onPrimary = readableOn(primary);
    var onAccent = readableOn(accent);
    var dark = mix(primary, "#000000", 0.72);
    var soft = mix(primary, "#ffffff", 0.9);
    var radius = opts.radius || "16px";

    return [
      ":root{--p:" + primary + ";--a:" + accent + ";--onp:" + onPrimary + ";--ona:" + onAccent + ";--dark:" + dark + ";--soft:" + soft + ";--r:" + radius + "}",
      "*,*::before,*::after{box-sizing:border-box}",
      "html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}",
      "body{margin:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,system-ui,sans-serif;color:#1a1826;line-height:1.65;background:#fff}",
      "img{max-width:100%;display:block}",
      "a{color:var(--p);text-decoration:none}",
      "h1,h2,h3{line-height:1.15;margin:0 0 .5em;letter-spacing:-.02em}",
      "h1{font-size:clamp(2rem,5vw,3.2rem)}",
      "h2{font-size:clamp(1.5rem,3.4vw,2.2rem)}",
      "p{margin:0 0 1em}",
      ".wrap{width:min(1080px,calc(100% - 40px));margin-inline:auto}",
      ".btn{display:inline-block;padding:.85rem 1.5rem;border-radius:10px;font-weight:700;font-size:.95rem;background:var(--p);color:var(--onp);border:1px solid var(--p);cursor:pointer;transition:transform .15s ease,opacity .15s ease}",
      ".btn:hover{transform:translateY(-2px);opacity:.94}",
      ".btn-accent{background:var(--a);border-color:var(--a);color:var(--ona)}",
      ".btn-outline{background:transparent;color:var(--onp);border-color:currentColor}",
      ".site-head{position:sticky;top:0;z-index:40;background:rgba(255,255,255,.94);backdrop-filter:blur(10px);border-bottom:1px solid #eceaf3}",
      ".head-inner{display:flex;align-items:center;gap:1rem;padding:.7rem 0}",
      ".logo{display:flex;align-items:center;gap:.6rem;font-weight:800;font-size:1.1rem;color:#1a1826}",
      ".logo-img{width:40px;height:40px;object-fit:contain;border-radius:9px;background:var(--soft)}",
      ".logo-initials{width:40px;height:40px;border-radius:9px;background:var(--p);display:grid;place-items:center;font-weight:800;font-size:.95rem}",
      ".nav{display:flex;gap:1.2rem;margin-left:auto;align-items:center;flex-wrap:wrap}",
      ".nav a{color:#4a465e;font-weight:600;font-size:.92rem}",
      ".nav a:hover{color:var(--p)}",
      ".hero{padding:clamp(48px,8vw,96px) 0;background:linear-gradient(180deg,var(--soft),#fff)}",
      ".hero h1{max-width:16ch}",
      ".hero p.lead{font-size:1.12rem;color:#56526b;max-width:52ch}",
      ".hero-actions{display:flex;gap:.7rem;flex-wrap:wrap;margin-top:1.6rem}",
      ".hero-split{display:grid;grid-template-columns:1.1fr .9fr;gap:44px;align-items:center}",
      "@media(max-width:860px){.hero-split{grid-template-columns:1fr;gap:28px}}",
      ".hero-art{border-radius:var(--r);min-height:280px;background:linear-gradient(140deg,var(--p),var(--dark));display:grid;place-items:center;color:#fff;font-size:3.4rem;font-weight:800;letter-spacing:-.04em;box-shadow:0 24px 50px rgba(0,0,0,.18)}",
      "section.block{padding:clamp(48px,7vw,80px) 0}",
      ".alt{background:#f8f7fd}",
      ".grid{display:grid;gap:20px}",
      ".g3{grid-template-columns:repeat(3,1fr)}",
      ".g4{grid-template-columns:repeat(4,1fr)}",
      ".g2{grid-template-columns:repeat(2,1fr)}",
      "@media(max-width:900px){.g3,.g4{grid-template-columns:repeat(2,1fr)}}",
      "@media(max-width:600px){.g2,.g3,.g4{grid-template-columns:1fr}}",
      ".card{background:#fff;border:1px solid #eceaf3;border-radius:var(--r);padding:24px;box-shadow:0 1px 2px rgba(20,18,31,.05)}",
      ".card h3{margin-bottom:.35rem;font-size:1.08rem}",
      ".card p:last-child{margin-bottom:0}",
      ".item-price{display:inline-block;background:var(--soft);color:var(--p);font-weight:800;font-size:.85rem;border-radius:999px;padding:.2rem .7rem;margin-bottom:.6rem}",
      ".item-cta{display:inline-block;margin-top:.6rem;font-weight:700;font-size:.86rem;color:var(--p)}",
      ".eyebrow{display:inline-block;font-size:.76rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--p);background:var(--soft);padding:.28rem .7rem;border-radius:999px;margin-bottom:.9rem}",
      ".contact-list{list-style:none;padding:0;margin:0 0 1.2rem}",
      ".contact-list li{display:flex;gap:.6rem;align-items:flex-start;margin-bottom:.6rem;color:#4a465e}",
      ".contact-list a{color:#1a1826}",
      ".contact-list a:hover{color:var(--p)}",
      ".ci{width:22px;text-align:center;flex:none}",
      ".social-row{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.4rem}",
      ".social{border:1px solid var(--p);color:var(--p);border-radius:999px;padding:.32rem .85rem;font-size:.84rem;font-weight:700}",
      ".social:hover{background:var(--p);color:var(--onp)}",
      ".band{background:var(--p);color:var(--onp);padding:clamp(40px,6vw,64px) 0}",
      ".band h2{color:inherit}",
      ".band p{opacity:.88}",
      ".band .btn-accent{background:var(--a);border-color:var(--a);color:var(--ona)}",
      ".site-foot{background:var(--dark);color:rgba(255,255,255,.76);padding:44px 0 26px;font-size:.92rem}",
      ".site-foot h4{color:#fff;margin:0 0 .7rem;font-size:.95rem}",
      ".site-foot a{color:rgba(255,255,255,.76)}",
      ".site-foot a:hover{color:#fff}",
      ".foot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:30px;margin-bottom:26px}",
      "@media(max-width:760px){.foot-grid{grid-template-columns:1fr;gap:22px}}",
      ".foot-bottom{border-top:1px solid rgba(255,255,255,.16);padding-top:18px;font-size:.82rem;display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap}",
      ".wa-float{position:fixed;right:18px;bottom:18px;z-index:80;width:56px;height:56px;border-radius:50%;background:#25d366;color:#fff;display:grid;place-items:center;box-shadow:0 8px 22px rgba(37,211,102,.45);transition:transform .18s ease}",
      ".wa-float:hover{transform:scale(1.07)}",
      "@media(max-width:600px){.wa-float{right:14px;bottom:14px;width:52px;height:52px}}",
      ".pill{display:inline-block;background:var(--soft);color:var(--p);border-radius:999px;padding:.3rem .8rem;font-size:.82rem;font-weight:700;margin:0 .3rem .4rem 0}",
      ".gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}",
      "@media(max-width:760px){.gallery{grid-template-columns:repeat(2,1fr)}}",
      ".gallery .tile{aspect-ratio:1/1;border-radius:var(--r);background:linear-gradient(135deg,var(--p),var(--dark));opacity:.92;display:grid;place-items:center;color:#fff;font-weight:800;font-size:1.1rem}",
      ".menu-row{display:flex;justify-content:space-between;gap:1rem;align-items:baseline;padding:.85rem 0;border-bottom:1px dashed #e2dfee}",
      ".menu-row:last-child{border-bottom:0}",
      ".menu-row .m-name{font-weight:700}",
      ".menu-row .m-desc{font-size:.88rem;color:#6b6780;margin:0}",
      ".menu-row .m-price{font-weight:800;color:var(--p);white-space:nowrap}",
      ".hours-box{background:var(--soft);border-radius:var(--r);padding:22px}",
      ".hours-box h3{margin-top:0}",
      ".stars{color:var(--a);letter-spacing:.15em}",
      ".testimonial{background:#fff;border:1px solid #eceaf3;border-radius:var(--r);padding:24px}",
      ".testimonial p{font-style:italic}",
      ".testimonial .who{font-weight:700;font-style:normal;margin:0}",
      ".split{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}",
      "@media(max-width:860px){.split{grid-template-columns:1fr;gap:26px}}",
      ".label{font-size:.78rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--p);margin-bottom:.5rem;display:block}",
      ".avatar-big{width:72px;height:72px;border-radius:50%;background:var(--p);color:var(--onp);display:grid;place-items:center;font-size:1.6rem;font-weight:800}",
      ".empty-note{border:1px dashed #ddd9ea;border-radius:var(--r);padding:26px;text-align:center;color:#7b778f;background:#fbfaff}"
    ].join("");
  }

  /* ---------------------------------------------------------------------- */
  /* Template 1 — Restaurant / food vendor                                   */
  /* ---------------------------------------------------------------------- */

  function renderRestaurant(site) {
    var name = site.name || "Your Restaurant";
    var tagline = site.tagline || "Fresh food, made with love.";
    var items = site.items || [];
    var wa = waLink(site.whatsapp, "Hi " + name + "! I'd like to place an order.");

    return [
      "<!DOCTYPE html>",
      '<html lang="en"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      "<title>" + esc(name) + " — " + esc(tagline) + "</title>",
      '<meta name="description" content="' + esc(site.description || tagline) + '">',
      "<style>" + baseCss(site, { radius: "14px" }) + "</style>",
      "</head><body>",

      '<header class="site-head"><div class="wrap head-inner">',
      '<div class="logo">' + logoMark(site, readableOn(site.primary)) + "<span>" + esc(name) + "</span></div>",
      '<nav class="nav"><a href="#menu">Menu</a><a href="#about">About</a><a href="#contact">Contact</a>',
      (wa ? '<a class="btn" style="padding:.5rem 1rem;font-size:.86rem" href="' + wa + '" target="_blank" rel="noopener">Order now</a>' : ""),
      "</nav></div></header>",

      '<section class="hero"><div class="wrap hero-split">',
      "<div>",
      '<span class="eyebrow">' + esc(site.category || "Food & Drink") + "</span>",
      "<h1>" + esc(tagline) + "</h1>",
      "<p class=\"lead\">" + esc(site.description || "Come taste the dishes our customers keep coming back for.") + "</p>",
      '<div class="hero-actions">',
      (wa ? '<a class="btn" href="' + wa + '" target="_blank" rel="noopener">Order on WhatsApp</a>' : ""),
      '<a class="btn btn-outline" style="color:var(--p);border-color:var(--p)" href="#menu">See our menu</a>',
      "</div>",
      "</div>",
      '<div class="hero-art">' + esc(initials(name)) + "</div>",
      "</div></section>",

      '<section class="block" id="menu"><div class="wrap">',
      '<span class="eyebrow">Our menu</span><h2>What we serve</h2>',
      (items.length
        ? '<div class="grid g3">' + itemGrid(items, "card", "Order this") + "</div>"
        : '<div class="empty-note">Your menu items will appear here.</div>'),
      "</div></section>",

      '<section class="block alt" id="about"><div class="wrap split">',
      '<div><span class="eyebrow">About us</span><h2>Made fresh, every day</h2>',
      "<p>" + esc(site.description || "We are a local kitchen serving our neighbourhood with honest food and friendly service.") + "</p>",
      has(site.hours) ? '<div class="hours-box"><h3>Opening hours</h3><p class="mb-0">' + esc(site.hours) + "</p></div>" : "",
      "</div>",
      '<div class="gallery">' +
        ["Chef's special", "Daily fresh", "Family size", "Takeaway", "Dine in", "Delivery"]
          .map(function (t) { return '<div class="tile">' + esc(t) + "</div>"; }).join("") +
      "</div>",
      "</div></section>",

      '<section class="band"><div class="wrap text-center" style="text-align:center">',
      "<h2>Hungry? Let's get you fed.</h2>",
      "<p>Message us and we'll have your order ready.</p>",
      (wa ? '<a class="btn btn-accent" href="' + wa + '" target="_blank" rel="noopener">Chat on WhatsApp</a>' : ""),
      "</div></section>",

      '<section class="block" id="contact"><div class="wrap split">',
      "<div><span class=\"eyebrow\">Find us</span><h2>Contact &amp; location</h2>" + contactBlock(site) + socialRow(site) + "</div>",
      '<div class="hours-box"><h3>Visit us today</h3>',
      "<p>Walk in, call ahead, or send a message on WhatsApp — whatever suits you.</p>",
      has(site.address) ? '<p class="mb-0"><strong>' + esc(site.address) + "</strong></p>" : "",
      "</div>",
      "</div></section>",

      '<footer class="site-foot"><div class="wrap">',
      '<div class="foot-grid">',
      "<div><h4>" + esc(name) + "</h4><p>" + esc(site.description || tagline) + "</p></div>",
      "<div><h4>Quick links</h4><a href=\"#menu\">Menu</a><br><a href=\"#about\">About</a><br><a href=\"#contact\">Contact</a></div>",
      "<div><h4>Get in touch</h4>" +
        (has(site.phone) ? "<p>" + esc(site.phone) + "</p>" : "") +
        (has(site.email) ? "<p>" + esc(site.email) + "</p>" : "") +
        (has(site.address) ? "<p>" + esc(site.address) + "</p>" : "") +
      "</div>",
      "</div>",
      '<div class="foot-bottom"><span>&copy; ' + new Date().getFullYear() + " " + esc(name) + "</span><span>Built with PageBuilder</span></div>",
      "</div></footer>",

      waFloat(site),
      "</body></html>"
    ].join("");
  }

  /* ---------------------------------------------------------------------- */
  /* Template 2 — Fashion / clothing store                                   */
  /* ---------------------------------------------------------------------- */

  function renderFashion(site) {
    var name = site.name || "Your Store";
    var tagline = site.tagline || "Style that speaks for you.";
    var items = site.items || [];
    var wa = waLink(site.whatsapp, "Hi " + name + "! I'm interested in something from your store.");

    return [
      "<!DOCTYPE html>",
      '<html lang="en"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      "<title>" + esc(name) + " — " + esc(tagline) + "</title>",
      '<meta name="description" content="' + esc(site.description || tagline) + '">',
      "<style>" + baseCss(site, { radius: "6px" }) + [
        ".hero{background:var(--dark);color:#fff}",
        ".hero p.lead{color:rgba(255,255,255,.78)}",
        ".hero h1{color:#fff}",
        ".hero .eyebrow{background:rgba(255,255,255,.14);color:var(--a)}",
        ".hero-art{background:linear-gradient(140deg,var(--p),var(--a));color:var(--dark)}",
        ".lookbook{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}",
        "@media(max-width:760px){.lookbook{grid-template-columns:repeat(2,1fr)}}",
        ".look{border-radius:6px;aspect-ratio:3/4;background:linear-gradient(160deg,var(--soft),var(--p));display:grid;place-items:end center;padding:14px;color:#fff;font-weight:700;font-size:.85rem;text-align:center}",
        ".card{border-radius:6px}",
        ".btn{border-radius:4px}",
        ".strip{background:var(--a);color:var(--ona);font-weight:800;text-align:center;padding:.7rem 0;font-size:.88rem;letter-spacing:.04em}"
      ].join("") + "</style>",
      "</head><body>",

      '<div class="strip">Free local delivery on orders over ' + esc(money("50") ) + " &nbsp;·&nbsp; New arrivals every week</div>",

      '<header class="site-head"><div class="wrap head-inner">',
      '<div class="logo">' + logoMark(site, readableOn(site.primary)) + "<span>" + esc(name) + "</span></div>",
      '<nav class="nav"><a href="#shop">Shop</a><a href="#lookbook">Lookbook</a><a href="#contact">Contact</a>',
      (wa ? '<a class="btn" style="padding:.5rem 1rem;font-size:.86rem" href="' + wa + '" target="_blank" rel="noopener">Order</a>' : ""),
      "</nav></div></header>",

      '<section class="hero"><div class="wrap hero-split">',
      "<div>",
      '<span class="eyebrow">' + esc(site.category || "Fashion") + "</span>",
      "<h1>" + esc(tagline) + "</h1>",
      '<p class="lead">' + esc(site.description || "Curated pieces for everyday wear and special occasions.") + "</p>",
      '<div class="hero-actions">',
      '<a class="btn btn-accent" href="#shop">Shop the collection</a>',
      (wa ? '<a class="btn btn-outline" href="' + wa + '" target="_blank" rel="noopener">Ask about sizing</a>' : ""),
      "</div></div>",
      '<div class="hero-art">' + esc(initials(name)) + "</div>",
      "</div></section>",

      '<section class="block" id="shop"><div class="wrap">',
      '<span class="eyebrow">Collection</span><h2>Featured pieces</h2>',
      (items.length
        ? '<div class="grid g4">' + itemGrid(items, "card", "Enquire") + "</div>"
        : '<div class="empty-note">Your products will appear here.</div>'),
      "</div></section>",

      '<section class="block alt" id="lookbook"><div class="wrap">',
      '<span class="eyebrow">Lookbook</span><h2>How our customers wear it</h2>',
      '<div class="lookbook">' +
        ["Everyday", "Evening", "Workwear", "Weekend"].map(function (t) {
          return '<div class="look">' + esc(t) + "</div>";
        }).join("") +
      "</div></div></section>",

      '<section class="band"><div class="wrap" style="text-align:center">',
      "<h2>Not sure what to pick?</h2><p>Send us a message and we'll help you choose.</p>",
      (wa ? '<a class="btn btn-accent" href="' + wa + '" target="_blank" rel="noopener">Chat with us</a>' : ""),
      "</div></section>",

      '<section class="block" id="contact"><div class="wrap split">',
      '<div><span class="eyebrow">Visit us</span><h2>Store details</h2>' + contactBlock(site) + socialRow(site) + "</div>",
      '<div class="hours-box"><h3>Personal shopping</h3><p>Message us with your size and we\'ll send you options that fit.</p>',
      has(site.hours) ? "<p><strong>" + esc(site.hours) + "</strong></p>" : "",
      "</div></div></section>",

      '<footer class="site-foot"><div class="wrap">',
      '<div class="foot-grid">',
      "<div><h4>" + esc(name) + "</h4><p>" + esc(site.description || tagline) + "</p></div>",
      "<div><h4>Shop</h4><a href=\"#shop\">Collection</a><br><a href=\"#lookbook\">Lookbook</a><br><a href=\"#contact\">Contact</a></div>",
      "<div><h4>Get in touch</h4>" +
        (has(site.phone) ? "<p>" + esc(site.phone) + "</p>" : "") +
        (has(site.email) ? "<p>" + esc(site.email) + "</p>" : "") +
        (has(site.address) ? "<p>" + esc(site.address) + "</p>" : "") +
      "</div></div>",
      '<div class="foot-bottom"><span>&copy; ' + new Date().getFullYear() + " " + esc(name) + "</span><span>Built with PageBuilder</span></div>",
      "</div></footer>",

      waFloat(site),
      "</body></html>"
    ].join("");
  }

  /* ---------------------------------------------------------------------- */
  /* Template 3 — General business / services                                */
  /* ---------------------------------------------------------------------- */

  function renderGeneral(site) {
    var name = site.name || "Your Business";
    var tagline = site.tagline || "Reliable service you can count on.";
    var items = site.items || [];
    var wa = waLink(site.whatsapp, "Hi " + name + "! I'd like to know more about your services.");

    return [
      "<!DOCTYPE html>",
      '<html lang="en"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      "<title>" + esc(name) + " — " + esc(tagline) + "</title>",
      '<meta name="description" content="' + esc(site.description || tagline) + '">',
      "<style>" + baseCss(site, { radius: "18px" }) + [
        ".hero-art{border-radius:50%;width:100%;aspect-ratio:1/1;min-height:0;max-width:420px;margin-inline:auto}",
        ".service{background:#fff;border:1px solid #eceaf3;border-radius:var(--r);padding:26px;border-top:4px solid var(--p)}",
        ".stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;text-align:center}",
        "@media(max-width:700px){.stat-row{grid-template-columns:1fr}}",
        ".stat b{display:block;font-size:2rem;color:var(--p)}",
        ".stat span{font-size:.86rem;color:#6b6780}"
      ].join("") + "</style>",
      "</head><body>",

      '<header class="site-head"><div class="wrap head-inner">',
      '<div class="logo">' + logoMark(site, readableOn(site.primary)) + "<span>" + esc(name) + "</span></div>",
      '<nav class="nav"><a href="#services">Services</a><a href="#about">About</a><a href="#contact">Contact</a>',
      (wa ? '<a class="btn" style="padding:.5rem 1rem;font-size:.86rem" href="' + wa + '" target="_blank" rel="noopener">Get a quote</a>' : ""),
      "</nav></div></header>",

      '<section class="hero"><div class="wrap hero-split">',
      "<div>",
      '<span class="eyebrow">' + esc(site.category || "Professional services") + "</span>",
      "<h1>" + esc(tagline) + "</h1>",
      '<p class="lead">' + esc(site.description || "We help local customers get things done quickly, fairly, and without fuss.") + "</p>",
      '<div class="hero-actions">',
      (wa ? '<a class="btn" href="' + wa + '" target="_blank" rel="noopener">Get a free quote</a>' : ""),
      '<a class="btn btn-outline" style="color:var(--p);border-color:var(--p)" href="#services">Our services</a>',
      "</div></div>",
      '<div class="hero-art">' + esc(initials(name)) + "</div>",
      "</div></section>",

      '<section class="block" id="services"><div class="wrap">',
      '<span class="eyebrow">What we do</span><h2>Services &amp; pricing</h2>',
      (items.length
        ? '<div class="grid g3">' + items.map(function (it) {
            return '<article class="service">' +
              (has(it.price) ? '<div class="item-price">' + esc(money(it.price)) + "</div>" : "") +
              "<h3>" + esc(it.name || "Service") + "</h3>" +
              (has(it.description) ? "<p>" + esc(it.description) + "</p>" : "") +
              '<a class="item-cta" href="#contact">Request this &rarr;</a>' +
              "</article>";
          }).join("") + "</div>"
        : '<div class="empty-note">Your services will appear here.</div>'),
      "</div></section>",

      '<section class="block alt" id="about"><div class="wrap">',
      '<div class="stat-row">',
      '<div class="stat"><b>10+</b><span>Years serving local customers</span></div>',
      '<div class="stat"><b>100%</b><span>Satisfaction focused</span></div>',
      '<div class="stat"><b>24h</b><span>Typical response time</span></div>',
      "</div></div></section>",

      '<section class="block"><div class="wrap">',
      "<h2>What customers say</h2>",
      '<div class="grid g3">',
      '<div class="testimonial"><p class="stars">★★★★★</p><p>"Quick, professional, and friendly. Exactly what I needed."</p><p class="who">— A happy customer</p></div>',
      '<div class="testimonial"><p class="stars">★★★★★</p><p>"Fair pricing and they explained everything clearly."</p><p class="who">— Local business owner</p></div>',
      '<div class="testimonial"><p class="stars">★★★★★</p><p>"I\'ll definitely be coming back for more work."</p><p class="who">— Repeat client</p></div>',
      "</div></div></section>",

      '<section class="band"><div class="wrap" style="text-align:center">',
      "<h2>Ready to get started?</h2><p>Tell us what you need and we'll get back to you today.</p>",
      (wa ? '<a class="btn btn-accent" href="' + wa + '" target="_blank" rel="noopener">Message us on WhatsApp</a>' : ""),
      "</div></section>",

      '<section class="block" id="contact"><div class="wrap split">',
      '<div><span class="eyebrow">Contact</span><h2>Let\'s talk</h2>' + contactBlock(site) + socialRow(site) + "</div>",
      '<div class="hours-box"><h3>Working hours</h3><p>' + esc(site.hours || "Monday to Friday, 9am – 6pm") + "</p>",
      "<p class=\"mb-0\">Prefer to chat? Send a WhatsApp message and we'll reply as soon as we can.</p></div>",
      "</div></section>",

      '<footer class="site-foot"><div class="wrap">',
      '<div class="foot-grid">',
      "<div><h4>" + esc(name) + "</h4><p>" + esc(site.description || tagline) + "</p></div>",
      "<div><h4>Company</h4><a href=\"#services\">Services</a><br><a href=\"#about\">About</a><br><a href=\"#contact\">Contact</a></div>",
      "<div><h4>Get in touch</h4>" +
        (has(site.phone) ? "<p>" + esc(site.phone) + "</p>" : "") +
        (has(site.email) ? "<p>" + esc(site.email) + "</p>" : "") +
        (has(site.address) ? "<p>" + esc(site.address) + "</p>" : "") +
      "</div></div>",
      '<div class="foot-bottom"><span>&copy; ' + new Date().getFullYear() + " " + esc(name) + "</span><span>Built with PageBuilder</span></div>",
      "</div></footer>",

      waFloat(site),
      "</body></html>"
    ].join("");
  }

  /* ---------------------------------------------------------------------- */
  /* Template 4 — Wellness / salon / beauty studio                            */
  /* ---------------------------------------------------------------------- */

  function renderWellness(site) {
    var name = site.name || "Your Studio";
    var tagline = site.tagline || "Feel better, naturally.";
    var items = site.items || [];
    var wa = waLink(site.whatsapp, "Hi " + name + "! I'd like to book an appointment.");

    return [
      "<!DOCTYPE html>",
      '<html lang="en"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      "<title>" + esc(name) + " — " + esc(tagline) + "</title>",
      '<meta name="description" content="' + esc(site.description || tagline) + '">',
      "<style>" + baseCss(site, { radius: "24px" }) + [
        ".hero{background:linear-gradient(180deg,var(--soft),#fff)}",
        ".hero-art{background:linear-gradient(140deg,var(--a),var(--p));color:var(--soft)}",
        ".step-list{list-style:none;padding:0;margin:0;counter-reset:s}",
        ".step-list li{counter-increment:s;display:flex;gap:.9rem;align-items:flex-start;margin-bottom:1rem}",
        ".step-list li::before{content:counter(s);flex:none;width:32px;height:32px;border-radius:50%;background:var(--soft);color:var(--p);display:grid;place-items:center;font-weight:800;font-size:.9rem}",
        ".price-feature{display:flex;justify-content:space-between;gap:1rem;align-items:baseline;padding:1rem 0;border-bottom:1px solid #eceaf3}",
        ".price-feature:last-child{border-bottom:0}",
        ".price-feature b{font-weight:800;color:var(--p);white-space:nowrap}",
        ".glow{position:absolute;border-radius:50%;filter:blur(60px);opacity:.35;pointer-events:none}",
        ".hero-inner{position:relative;z-index:1}"
      ].join("") + "</style>",
      "</head><body>",

      '<header class="site-head"><div class="wrap head-inner">',
      '<div class="logo">' + logoMark(site, readableOn(site.primary)) + "<span>" + esc(name) + "</span></div>",
      '<nav class="nav"><a href="#treatments">Treatments</a><a href="#how">How it works</a><a href="#contact">Book</a>',
      (wa ? '<a class="btn" style="padding:.5rem 1rem;font-size:.86rem" href="' + wa + '" target="_blank" rel="noopener">Book now</a>' : ""),
      "</nav></div></header>",

      '<section class="hero"><div class="wrap hero-split hero-inner">',
      "<div>",
      '<span class="eyebrow">' + esc(site.category || "Wellness") + "</span>",
      "<h1>" + esc(tagline) + "</h1>",
      '<p class="lead">' + esc(site.description || "A calm space for treatments, facials, and whatever you need to feel like yourself again.") + "</p>",
      '<div class="hero-actions">',
      (wa ? '<a class="btn" href="' + wa + '" target="_blank" rel="noopener">Book an appointment</a>' : ""),
      '<a class="btn btn-outline" style="color:var(--p);border-color:var(--p)" href="#treatments">See treatments</a>',
      "</div></div>",
      '<div class="hero-art">' + esc(initials(name)) + "</div>",
      "</div></section>",

      '<section class="block" id="treatments"><div class="wrap">',
      '<span class="eyebrow">Our treatments</span><h2>Choose what you need</h2>',
      (items.length
        ? '<div class="grid g3">' + itemGrid(items, "card", "Book this") + "</div>"
        : '<div class="empty-note">Your treatments will appear here.</div>'),
      "</div></section>",

      '<section class="block alt" id="how"><div class="wrap split">',
      "<div>",
      '<span class="eyebrow">How it works</span><h2>Three easy steps</h2>',
      '<ol class="step-list">',
      "<li><div><strong>Message us</strong><p class=\"mb-0\">Tell us what you would like, and when suits you.</p></div></li>",
      "<li><div><strong>Confirm your slot</strong><p class=\"mb-0\">We reply with the next available appointment.</p></div></li>",
      "<li><div><strong>Arrive and relax</strong><p class=\"mb-0\">Come in, settle in, and leave feeling better.</p></div></li>",
      "</ol>",
      "</div>",
      '<div class="card">' +
        "<h3>Popular add-ons</h3>" +
        ["Express facial", "Scalp massage", "Manicure", "Body polish", "Consultation", "Gift cards"]
          .map(function (t) { return '<span class="pill">' + esc(t) + "</span>"; }).join("") +
        (has(site.hours) ? "<p><strong>Opening hours</strong><br>" + esc(site.hours) + "</p>" : "") +
      "</div>",
      "</div></section>",

      '<section class="band"><div class="wrap" style="text-align:center">',
      "<h2>Ready to book?</h2><p>Send a message and we'll find you a time that works.</p>",
      (wa ? '<a class="btn btn-accent" href="' + wa + '" target="_blank" rel="noopener">Book on WhatsApp</a>' : ""),
      "</div></section>",

      '<section class="block" id="contact"><div class="wrap split">',
      '<div><span class="eyebrow">Find us</span><h2>Visit the studio</h2>' + contactBlock(site) + socialRow(site) + "</div>",
      '<div class="hours-box"><h3>Good to know</h3>',
      "<p>Please arrive five minutes early so we can start on time. Cancellations are free up to 24 hours before.</p>",
      has(site.address) ? '<p class="mb-0"><strong>' + esc(site.address) + "</strong></p>" : "",
      "</div>",
      "</div></section>",

      '<footer class="site-foot"><div class="wrap">',
      '<div class="foot-grid">',
      "<div><h4>" + esc(name) + "</h4><p>" + esc(site.description || tagline) + "</p></div>",
      "<div><h4>Studio</h4><a href=\"#treatments\">Treatments</a><br><a href=\"#how\">How it works</a><br><a href=\"#contact\">Book</a></div>",
      "<div><h4>Get in touch</h4>" +
        (has(site.phone) ? "<p>" + esc(site.phone) + "</p>" : "") +
        (has(site.email) ? "<p>" + esc(site.email) + "</p>" : "") +
        (has(site.address) ? "<p>" + esc(site.address) + "</p>" : "") +
      "</div></div>",
      '<div class="foot-bottom"><span>&copy; ' + new Date().getFullYear() + " " + esc(name) + "</span><span>Built with PageBuilder</span></div>",
      "</div></footer>",

      waFloat(site),
      "</body></html>"
    ].join("");
  }

  /* ---------------------------------------------------------------------- */
  /* Template 5 — Trades / home services                                     */
  /* ---------------------------------------------------------------------- */

  function renderTrades(site) {
    var name = site.name || "Your Company";
    var tagline = site.tagline || "Fast, honest, and done properly.";
    var items = site.items || [];
    var wa = waLink(site.whatsapp, "Hi " + name + "! I'd like a quote.");

    return [
      "<!DOCTYPE html>",
      '<html lang="en"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      "<title>" + esc(name) + " — " + esc(tagline) + "</title>",
      '<meta name="description" content="' + esc(site.description || tagline) + '">',
      "<style>" + baseCss(site, { radius: "8px" }) + [
        ".hero{background:var(--dark);color:#fff}",
        ".hero p.lead{color:rgba(255,255,255,.8)}",
        ".hero h1{color:#fff}",
        ".hero .eyebrow{background:rgba(255,255,255,.14);color:var(--a)}",
        ".hero-art{background:var(--a);color:var(--dark)}",
        ".ticker{background:var(--a);color:var(--ona);font-weight:800;text-align:center;padding:.65rem 0;font-size:.86rem;letter-spacing:.05em;text-transform:uppercase}",
        ".job{background:#fff;border:1px solid #eceaf3;border-left:4px solid var(--p);border-radius:var(--r);padding:22px}",
        ".job h3{margin-bottom:.3rem}",
        ".check{list-style:none;padding:0;margin:0}",
        ".check li{padding-left:1.6rem;position:relative;margin-bottom:.55rem;color:#4a465e}",
        ".check li::before{content:'\\2713';position:absolute;left:0;color:var(--p);font-weight:800}",
        ".area-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}",
        "@media(max-width:700px){.area-row{grid-template-columns:1fr}}",
        ".area{background:var(--soft);border-radius:var(--r);padding:18px;text-align:center;font-weight:700;color:var(--p)}",
        ".big-call{display:inline-block;font-size:clamp(1.6rem,4vw,2.4rem);font-weight:800;color:var(--a);letter-spacing:-.02em}"
      ].join("") + "</style>",
      "</head><body>",

      '<div class="ticker">' +
        (has(site.phone)
          ? "Call now: " + esc(site.phone) + " &nbsp;·&nbsp; Free quotes &nbsp;·&nbsp; Fully insured"
          : "Free quotes &nbsp;·&nbsp; Fully insured &nbsp;·&nbsp; Friendly, local service") +
      "</div>",

      '<header class="site-head"><div class="wrap head-inner">',
      '<div class="logo">' + logoMark(site, readableOn(site.primary)) + "<span>" + esc(name) + "</span></div>",
      '<nav class="nav"><a href="#services">Services</a><a href="#areas">Areas</a><a href="#contact">Contact</a>',
      (wa ? '<a class="btn" style="padding:.5rem 1rem;font-size:.86rem" href="' + wa + '" target="_blank" rel="noopener">Free quote</a>' : ""),
      "</nav></div></header>",

      '<section class="hero"><div class="wrap hero-split">',
      "<div>",
      '<span class="eyebrow">' + esc(site.category || "Home services") + "</span>",
      "<h1>" + esc(tagline) + "</h1>",
      '<p class="lead">' + esc(site.description || "Straightforward work, fair prices, and a clean job every time. Call us and we'll come straight out.") + "</p>",
      '<div class="hero-actions">',
      (wa ? '<a class="btn btn-accent" href="' + wa + '" target="_blank" rel="noopener">Get a free quote</a>' : ""),
      (has(site.phone) ? '<a class="btn btn-outline" style="color:#fff;border-color:#fff" href="tel:' + esc(digits(site.phone)) + '">' + esc(site.phone) + "</a>" : ""),
      "</div></div>",
      '<div class="hero-art">' + esc(initials(name)) + "</div>",
      "</div></section>",

      '<section class="block" id="services"><div class="wrap">',
      '<span class="eyebrow">What we do</span><h2>Services &amp; pricing</h2>',
      (items.length
        ? '<div class="grid g3">' + items.map(function (it) {
            return '<article class="job">' +
              (has(it.price) ? '<div class="item-price">' + esc(money(it.price)) + "</div>" : "") +
              "<h3>" + esc(it.name || "Service") + "</h3>" +
              (has(it.description) ? "<p>" + esc(it.description) + "</p>" : "") +
              '<a class="item-cta" href="#contact">Book this &rarr;</a>' +
              "</article>";
          }).join("") + "</div>"
        : '<div class="empty-note">Your services will appear here.</div>'),
      "</div></section>",

      '<section class="block alt"><div class="wrap split">',
      "<div>",
      '<span class="eyebrow">Why people choose us</span><h2>Work done properly</h2>',
      '<ul class="check">' +
        ["Fixed, upfront prices — no surprises", "Same-day call-outs available", "Everything cleaned up before we leave", "Fully insured and DBS checked", "Happy to explain the job first", "Local crew you can call by name"]
          .map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") +
      "</ul>",
      "</div>",
      '<div class="card">',
      "<h3>Common jobs</h3>",
      '<ul class="check">' +
        ["Emergency call-outs", "Installations &amp; fittings", "Leaks &amp; blockages", "Power faults", "Maintenance visits", "Full rewire or remodel"]
          .map(function (t) { return "<li>" + t + "</li>"; }).join("") +
      "</ul>",
      "</div>",
      "</div></section>",

      '<section class="block" id="areas"><div class="wrap">',
      '<span class="eyebrow">Where we work</span><h2>Covering these areas</h2>',
      '<div class="area-row">' +
        ["Town centre", "Riverside", "Northside", "Eastfield", "Southbank", "The villages"]
          .map(function (t) { return '<div class="area">' + esc(t) + "</div>"; }).join("") +
      "</div>",
      "</div></section>",

      '<section class="band"><div class="wrap" style="text-align:center">',
      "<h2>Need something doing?</h2>",
      (has(site.phone) ? '<div class="big-call">' + esc(site.phone) + "</div>" : ""),
      "<p>Call us or send a message — we'll take it from there.</p>",
      (wa ? '<a class="btn btn-accent" href="' + wa + '" target="_blank" rel="noopener">Message us</a>' : ""),
      "</div></section>",

      '<section class="block" id="contact"><div class="wrap split">',
      '<div><span class="eyebrow">Contact</span><h2>Get in touch</h2>' + contactBlock(site) + socialRow(site) + "</div>",
      '<div class="hours-box"><h3>Working hours</h3><p>' + esc(site.hours || "Monday to Friday, 8am – 6pm") + "</p>",
      '<p class="mb-0">Emergency? Call the number above and we\'ll prioritise your job.</p></div>',
      "</div></section>",

      '<footer class="site-foot"><div class="wrap">',
      '<div class="foot-grid">',
      "<div><h4>" + esc(name) + "</h4><p>" + esc(site.description || tagline) + "</p></div>",
      "<div><h4>Company</h4><a href=\"#services\">Services</a><br><a href=\"#areas\">Areas</a><br><a href=\"#contact\">Contact</a></div>",
      "<div><h4>Get in touch</h4>" +
        (has(site.phone) ? "<p>" + esc(site.phone) + "</p>" : "") +
        (has(site.email) ? "<p>" + esc(site.email) + "</p>" : "") +
        (has(site.address) ? "<p>" + esc(site.address) + "</p>" : "") +
      "</div></div>",
      '<div class="foot-bottom"><span>&copy; ' + new Date().getFullYear() + " " + esc(name) + "</span><span>Built with PageBuilder</span></div>",
      "</div></footer>",

      waFloat(site),
      "</body></html>"
    ].join("");
  }

  /* ---------------------------------------------------------------------- */
  /* Template 6 — Fitness / classes and coaching                              */
  /* ---------------------------------------------------------------------- */

  function renderFitness(site) {
    var name = site.name || "Your Studio";
    var tagline = site.tagline || "Stronger, fitter, in good company.";
    var items = site.items || [];
    var wa = waLink(site.whatsapp, "Hi " + name + "! I'd like to join.");

    return [
      "<!DOCTYPE html>",
      '<html lang="en"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      "<title>" + esc(name) + " — " + esc(tagline) + "</title>",
      '<meta name="description" content="' + esc(site.description || tagline) + '">',
      "<style>" + baseCss(site, { radius: "14px" }) + [
        ".hero{background:var(--dark);color:#fff}",
        ".hero p.lead{color:rgba(255,255,255,.8)}",
        ".hero h1{color:#fff}",
        ".hero .eyebrow{background:rgba(255,255,255,.14);color:var(--a)}",
        ".hero-art{background:linear-gradient(140deg,var(--p),var(--a));color:var(--dark)}",
        ".day-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;text-align:center}",
        "@media(max-width:700px){.day-grid{grid-template-columns:repeat(4,1fr)}}",
        ".day{background:var(--soft);color:var(--p);border-radius:var(--r);padding:.8rem .3rem;font-weight:800;font-size:.8rem;letter-spacing:.06em}",
        ".class-row{display:flex;justify-content:space-between;gap:1rem;align-items:baseline;padding:.9rem 0;border-bottom:1px solid #eceaf3}",
        ".class-row:last-child{border-bottom:0}",
        ".class-row .c-name{font-weight:700}",
        ".class-row .c-meta{font-size:.86rem;color:#6b6780}",
        ".class-row .c-level{white-space:nowrap;font-weight:800;color:var(--p);font-size:.82rem;background:var(--soft);border-radius:999px;padding:.2rem .7rem}",
        ".coach{display:flex;gap:14px;align-items:center}",
        ".avatar-big{width:64px;height:64px;font-size:1.4rem}",
        ".plan{background:#fff;border:1px solid #eceaf3;border-radius:var(--r);padding:26px;border-top:4px solid var(--a)}"
      ].join("") + "</style>",
      "</head><body>",

      '<header class="site-head"><div class="wrap head-inner">',
      '<div class="logo">' + logoMark(site, readableOn(site.primary)) + "<span>" + esc(name) + "</span></div>",
      '<nav class="nav"><a href="#classes">Classes</a><a href="#membership">Membership</a><a href="#contact">Join</a>',
      (wa ? '<a class="btn" style="padding:.5rem 1rem;font-size:.86rem" href="' + wa + '" target="_blank" rel="noopener">Free trial</a>' : ""),
      "</nav></div></header>",

      '<section class="hero"><div class="wrap hero-split">',
      "<div>",
      '<span class="eyebrow">' + esc(site.category || "Fitness") + "</span>",
      "<h1>" + esc(tagline) + "</h1>",
      '<p class="lead">' + esc(site.description || "Small-group classes, one-to-one coaching, and a room full of people rooting for you.") + "</p>",
      '<div class="hero-actions">',
      (wa ? '<a class="btn btn-accent" href="' + wa + '" target="_blank" rel="noopener">Claim a free trial</a>' : ""),
      '<a class="btn btn-outline" style="color:#fff;border-color:#fff" href="#classes">See the timetable</a>',
      "</div></div>",
      '<div class="hero-art">' + esc(initials(name)) + "</div>",
      "</div></section>",

      '<section class="block"><div class="wrap">',
      '<span class="eyebrow">Open all week</span><h2>When we train</h2>',
      '<div class="day-grid">' +
        ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
          .map(function (d) { return '<div class="day">' + d + "</div>"; }).join("") +
      "</div>",
      "</div></section>",

      '<section class="block alt" id="classes"><div class="wrap">',
      '<span class="eyebrow">Timetable</span><h2>Classes &amp; prices</h2>',
      (items.length
        ? '<div class="card">' + items.map(function (it) {
            return '<div class="class-row">' +
              "<div><div class=\"c-name\">" + esc(it.name || "Class") + "</div>" +
              (has(it.description) ? '<p class="c-meta mb-0">' + esc(it.description) + "</p>" : "") +
              "</div>" +
              "<div>" + (has(it.price) ? '<span class="c-level">' + esc(money(it.price)) + "</span>" : "") + "</div>" +
              "</div>";
          }).join("") + "</div>"
        : '<div class="empty-note">Your class timetable will appear here.</div>'),
      "</div></section>",

      '<section class="block" id="membership"><div class="wrap split">',
      "<div>",
      '<span class="eyebrow">Membership</span><h2>Start where you are</h2>',
      "<p>No contracts, no joining fee. Turn up, try it, and stay as long as you are enjoying it.</p>",
      '<ul class="check">' +
        ["First class free, always", "Cancel or pause any time", "Towels and water included", "Coached by real trainers", "Beginner classes every week", "Members-only hours"]
          .map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") +
      "</ul>",
      "</div>",
      '<div class="plan">',
      "<h3>Not sure which class?</h3>",
      '<p>Tell us your goals and we\'ll point you at the right sessions — or set you up with a coach.</p>',
      (wa ? '<a class="btn" href="' + wa + '" target="_blank" rel="noopener">Ask us</a>' : ""),
      "</div>",
      "</div></section>",

      '<section class="band"><div class="wrap" style="text-align:center">',
      "<h2>Your first class is on us.</h2><p>Send us a message and we'll book you in.</p>",
      (wa ? '<a class="btn btn-accent" href="' + wa + '" target="_blank" rel="noopener">Claim free trial</a>' : ""),
      "</div></section>",

      '<section class="block" id="contact"><div class="wrap split">',
      '<div><span class="eyebrow">Come in</span><h2>Find the studio</h2>' + contactBlock(site) + socialRow(site) + "</div>",
      '<div class="hours-box"><h3>Class times</h3><p>' + esc(site.hours || "Weekdays 6am – 9pm · Weekends 8am – 2pm") + "</p>",
      '<p class="mb-0">Bring a water bottle and arrive ten minutes early for your first session.</p></div>',
      "</div></section>",

      '<footer class="site-foot"><div class="wrap">',
      '<div class="foot-grid">',
      "<div><h4>" + esc(name) + "</h4><p>" + esc(site.description || tagline) + "</p></div>",
      "<div><h4>Studio</h4><a href=\"#classes\">Timetable</a><br><a href=\"#membership\">Membership</a><br><a href=\"#contact\">Join</a></div>",
      "<div><h4>Get in touch</h4>" +
        (has(site.phone) ? "<p>" + esc(site.phone) + "</p>" : "") +
        (has(site.email) ? "<p>" + esc(site.email) + "</p>" : "") +
        (has(site.address) ? "<p>" + esc(site.address) + "</p>" : "") +
      "</div></div>",
      '<div class="foot-bottom"><span>&copy; ' + new Date().getFullYear() + " " + esc(name) + "</span><span>Built with PageBuilder</span></div>",
      "</div></footer>",

      waFloat(site),
      "</body></html>"
    ].join("");
  }

  /* ---------------------------------------------------------------------- */
  /* Template 7 — Real estate / property                                     */
  /* ---------------------------------------------------------------------- */

  function renderRealEstate(site) {
    var name = site.name || "Your Agency";
    var tagline = site.tagline || "Find a place that feels like home.";
    var items = site.items || [];
    var wa = waLink(site.whatsapp, "Hi " + name + "! I'm interested in a property.");

    return [
      "<!DOCTYPE html>",
      '<html lang="en"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      "<title>" + esc(name) + " — " + esc(tagline) + "</title>",
      '<meta name="description" content="' + esc(site.description || tagline) + '">',
      "<style>" + baseCss(site, { radius: "10px" }) + [
        ".hero{background:var(--dark);color:#fff}",
        ".hero p.lead{color:rgba(255,255,255,.82)}",
        ".hero h1{color:#fff}",
        ".hero .eyebrow{background:rgba(255,255,255,.14);color:var(--a)}",
        ".hero-art{background:linear-gradient(140deg,var(--a),var(--p));color:var(--dark)}",
        ".filter-bar{background:#fff;border:1px solid #eceaf3;border-radius:var(--r);padding:14px 18px;display:flex;gap:10px;flex-wrap:wrap;box-shadow:0 8px 22px rgba(20,18,31,.07)}",
        ".filter-bar span{background:var(--soft);color:var(--p);border-radius:999px;padding:.3rem .9rem;font-size:.84rem;font-weight:700}",
        ".listing{background:#fff;border:1px solid #eceaf3;border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 1px 2px rgba(20,18,31,.05)}",
        ".listing .photo{aspect-ratio:4/3;background:linear-gradient(135deg,var(--p),var(--dark));display:grid;place-items:center;color:#fff;font-weight:800;letter-spacing:.04em}",
        ".listing .l-body{padding:20px;display:flex;flex-direction:column;flex:1}",
        ".listing h3{margin-bottom:.3rem;font-size:1.05rem}",
        ".listing .l-price{font-size:1.2rem;font-weight:800;color:var(--p);margin-bottom:.5rem}",
        ".listing .l-meta{list-style:none;padding:0;margin:0 0 1rem;font-size:.86rem;color:#6b6780;display:flex;gap:1rem;flex-wrap:wrap}",
        ".listing .item-cta{margin-top:auto}",
        ".agent{display:flex;gap:18px;align-items:center;flex-wrap:wrap}",
        ".agent .avatar-big{width:84px;height:84px;font-size:1.9rem}",
        ".agent .a-name{font-weight:800;font-size:1.15rem}",
        ".agent .a-role{color:#6b6780;font-size:.88rem;margin:0}",
        ".kv{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}",
        "@media(max-width:800px){.kv{grid-template-columns:repeat(2,1fr)}}",
        ".kv .cell{background:var(--soft);border-radius:var(--r);padding:18px;text-align:center}",
        ".kv .cell b{display:block;color:var(--p);font-size:.95rem}"
      ].join("") + "</style>",
      "</head><body>",

      '<header class="site-head"><div class="wrap head-inner">',
      '<div class="logo">' + logoMark(site, readableOn(site.primary)) + "<span>" + esc(name) + "</span></div>",
      '<nav class="nav"><a href="#listings">Listings</a><a href="#agents">Our team</a><a href="#contact">Contact</a>',
      (wa ? '<a class="btn" style="padding:.5rem 1rem;font-size:.86rem" href="' + wa + '" target="_blank" rel="noopener">Book a viewing</a>' : ""),
      "</nav></div></header>",

      '<section class="hero"><div class="wrap hero-split">',
      "<div>",
      '<span class="eyebrow">' + esc(site.category || "Property") + "</span>",
      "<h1>" + esc(tagline) + "</h1>",
      '<p class="lead">' + esc(site.description || "Straightforward advice, honest valuations, and homes worth looking at twice.") + "</p>",
      '<div class="hero-actions">',
      (wa ? '<a class="btn btn-accent" href="' + wa + '" target="_blank" rel="noopener">Arrange a viewing</a>' : ""),
      '<a class="btn btn-outline" style="color:#fff;border-color:#fff" href="#listings">See available homes</a>',
      "</div></div>",
      '<div class="hero-art">' + esc(initials(name)) + "</div>",
      "</div></section>",

      '<section class="block" style="padding-top:0"><div class="wrap">',
      '<div class="filter-bar">',
      ["For sale", "For rent", "New this week", "Viewings today", "Free valuation", "First-time buyers"]
        .map(function (t) { return "<span>" + esc(t) + "</span>"; }).join(""),
      "</div>",
      "</div></section>",

      '<section class="block alt" id="listings" style="padding-top:0"><div class="wrap">',
      '<span class="eyebrow">Available now</span><h2>Current listings</h2>',
      (items.length
        ? '<div class="grid g3">' + items.map(function (it) {
            return '<article class="listing">' +
              '<div class="photo">' + esc(initials(it.name || name)) + "</div>" +
              '<div class="l-body">' +
              (has(it.price) ? '<div class="l-price">' + esc(money(it.price)) + "</div>" : "") +
              "<h3>" + esc(it.name || "Property") + "</h3>" +
              (has(it.description) ? "<p>" + esc(it.description) + "</p>" : "") +
              '<a class="item-cta" href="#contact">Request details &rarr;</a>' +
              "</div></article>";
          }).join("") + "</div>"
        : '<div class="empty-note">Your listings will appear here.</div>'),
      "</div></section>",

      '<section class="block"><div class="wrap">',
      '<span class="eyebrow">Why choose us</span><h2>Property, handled properly</h2>',
      '<div class="kv">',
      '<div class="cell"><b>Free valuations</b><span class="muted">No obligation, no pressure</span></div>',
      '<div class="cell"><b>Local knowledge</b><span class="muted">Every street, not just the good ones</span></div>',
      '<div class="cell"><b>Fast viewings</b><span class="muted">Often same day</span></div>',
      '<div class="cell"><b>Sold or let</b><span class="muted">Agreed terms, no surprises</span></div>',
      "</div>",
      "</div></section>",

      '<section class="block alt" id="agents"><div class="wrap split">',
      '<div class="card agent">',
      '<div class="avatar-big">' + esc(initials(name)) + "</div>",
      "<div>",
      '<div class="a-name">' + esc(name) + "</div>",
      '<p class="a-role">' + esc(site.category || "Local estate agent") + "</p>",
      (has(site.email) ? '<p class="mb-0"><a href="mailto:' + esc(site.email) + '">' + esc(site.email) + "</a></p>" : ""),
      "</div></div>",
      "<div>",
      '<span class="eyebrow">Working with us</span><h2>From first viewing to completion</h2>',
      "<p>We keep it simple: clear advice on price, honest notes on each home, and updates at every stage so you always know where things stand.</p>",
      "<p>Thinking of selling? We will come out, value the property honestly, and talk you through what happens next — whether you go ahead with us or not.</p>",
      (wa ? '<a class="btn" href="' + wa + '" target="_blank" rel="noopener">Message the team</a>' : ""),
      "</div>",
      "</div></section>",

      '<section class="band"><div class="wrap" style="text-align:center">',
      "<h2>What is your home worth?</h2><p>Get a clear, honest valuation with no obligation.</p>",
      (wa ? '<a class="btn btn-accent" href="' + wa + '" target="_blank" rel="noopener">Book a free valuation</a>' : ""),
      "</div></section>",

      '<section class="block" id="contact"><div class="wrap split">',
      '<div><span class="eyebrow">Get in touch</span><h2>Contact us</h2>' + contactBlock(site) + socialRow(site) + "</div>",
      '<div class="hours-box"><h3>Viewing hours</h3><p>' + esc(site.hours || "Mon–Fri 9am – 6pm · Sat 10am – 2pm") + "</p>",
      '<p class="mb-0">Send us the address or listing number and we will arrange a time that suits you, including evenings on request.</p></div>',
      "</div></section>",

      '<footer class="site-foot"><div class="wrap">',
      '<div class="foot-grid">',
      "<div><h4>" + esc(name) + "</h4><p>" + esc(site.description || tagline) + "</p></div>",
      "<div><h4>Browse</h4><a href=\"#listings\">Listings</a><br><a href=\"#agents\">Our team</a><br><a href=\"#contact\">Contact</a></div>",
      "<div><h4>Get in touch</h4>" +
        (has(site.phone) ? "<p>" + esc(site.phone) + "</p>" : "") +
        (has(site.email) ? "<p>" + esc(site.email) + "</p>" : "") +
        (has(site.address) ? "<p>" + esc(site.address) + "</p>" : "") +
      "</div></div>",
      '<div class="foot-bottom"><span>&copy; ' + new Date().getFullYear() + " " + esc(name) + "</span><span>Built with PageBuilder</span></div>",
      "</div></footer>",

      waFloat(site),
      "</body></html>"
    ].join("");
  }

  /* ---------------------------------------------------------------------- */
  /* Template 8 — Education / tutoring                                       */
  /* ---------------------------------------------------------------------- */

  function renderTutoring(site) {
    var name = site.name || "Your Tutoring";
    var tagline = site.tagline || "The help that makes it click.";
    var items = site.items || [];
    var wa = waLink(site.whatsapp, "Hi " + name + "! I'd like to book a lesson.");

    return [
      "<!DOCTYPE html>",
      '<html lang="en"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      "<title>" + esc(name) + " — " + esc(tagline) + "</title>",
      '<meta name="description" content="' + esc(site.description || tagline) + '">',
      "<style>" + baseCss(site, { radius: "12px" }) + [
        ".subject{background:#fff;border:1px solid #eceaf3;border-radius:var(--r);padding:24px;border-top:4px solid var(--p);display:flex;flex-direction:column}",
        ".subject .s-icon{width:46px;height:46px;border-radius:12px;background:var(--soft);color:var(--p);display:grid;place-items:center;font-size:1.3rem;font-weight:800;margin-bottom:.8rem}",
        ".subject h3{margin-bottom:.3rem}",
        ".subject .item-cta{margin-top:auto}",
        ".level-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}",
        "@media(max-width:800px){.level-row{grid-template-columns:repeat(2,1fr)}}",
        ".level{background:var(--soft);border-radius:var(--r);padding:20px;text-align:center}",
        ".level b{display:block;color:var(--p);margin-bottom:.2rem}",
        ".tutor{display:flex;gap:16px;align-items:flex-start}",
        ".tutor .avatar-big{width:66px;height:66px;font-size:1.4rem;flex:none}",
        ".tutor h3{margin-bottom:.2rem}",
        ".tutor .t-role{color:#6b6780;font-size:.86rem;margin:0}",
        ".parent-quote{background:#fff;border:1px solid #eceaf3;border-left:4px solid var(--a);border-radius:var(--r);padding:22px}",
        ".parent-quote p{font-style:italic;margin-bottom:.6rem}",
        ".parent-quote .who{font-style:normal;font-weight:700;margin:0}",
        ".session-row{display:flex;justify-content:space-between;gap:1rem;align-items:baseline;padding:.85rem 0;border-bottom:1px dashed #e2dfee}",
        ".session-row:last-child{border-bottom:0}",
        ".session-row .s-name{font-weight:700}",
        ".session-row .s-meta{font-size:.86rem;color:#6b6780;margin:0}"
      ].join("") + "</style>",
      "</head><body>",

      '<header class="site-head"><div class="wrap head-inner">',
      '<div class="logo">' + logoMark(site, readableOn(site.primary)) + "<span>" + esc(name) + "</span></div>",
      '<nav class="nav"><a href="#subjects">Subjects</a><a href="#how">How it works</a><a href="#contact">Enquire</a>',
      (wa ? '<a class="btn" style="padding:.5rem 1rem;font-size:.86rem" href="' + wa + '" target="_blank" rel="noopener">Book a trial</a>' : ""),
      "</nav></div></header>",

      '<section class="hero"><div class="wrap hero-split">',
      "<div>",
      '<span class="eyebrow">' + esc(site.category || "Tuition") + "</span>",
      "<h1>" + esc(tagline) + "</h1>",
      '<p class="lead">' + esc(site.description || "Patient, structured tuition that builds confidence as well as marks.") + "</p>",
      '<div class="hero-actions">',
      (wa ? '<a class="btn" href="' + wa + '" target="_blank" rel="noopener">Book a free assessment</a>' : ""),
      '<a class="btn btn-outline" style="color:var(--p);border-color:var(--p)" href="#subjects">See subjects</a>',
      "</div></div>",
      '<div class="hero-art">' + esc(initials(name)) + "</div>",
      "</div></section>",

      '<section class="block" id="subjects"><div class="wrap">',
      '<span class="eyebrow">What we teach</span><h2>Subjects &amp; sessions</h2>',
      (items.length
        ? '<div class="grid g3">' + items.map(function (it, i) {
            return '<article class="subject">' +
              '<div class="s-icon">' + esc(initials(it.name || "S")) + "</div>" +
              (has(it.price) ? '<div class="item-price">' + esc(money(it.price)) + " / session</div>" : "") +
              "<h3>" + esc(it.name || "Subject") + "</h3>" +
              (has(it.description) ? "<p>" + esc(it.description) + "</p>" : "") +
              '<a class="item-cta" href="#contact">Enquire &rarr;</a>' +
              "</article>";
          }).join("") + "</div>"
        : '<div class="empty-note">Your subjects will appear here.</div>'),
      "</div></section>",

      '<section class="block alt"><div class="wrap">',
      '<span class="eyebrow">All abilities</span><h2>Taught at every level</h2>',
      '<div class="level-row">' +
        ["Primary", "Secondary", "GCSE / KS3", "A-Level", "University", "Adult learners", "Exam resits", "11+ &amp; selective schools"]
          .map(function (t) { return '<div class="level"><b>' + t + "</b></div>"; }).join("") +
      "</div>",
      "</div></section>",

      '<section class="block" id="how"><div class="wrap split">',
      "<div>",
      '<span class="eyebrow">How it works</span><h2>Three steps to a better grade</h2>',
      '<ol class="step-list">',
      "<li><div><strong>Free assessment</strong><p class=\"mb-0\">We look at where your child is now and where they need to be.</p></div></li>",
      "<li><div><strong>A plan built around them</strong><p class=\"mb-0\">Weeks or months — not a generic worksheet handed to everyone.</p></div></li>",
      "<li><div><strong>Regular progress updates</strong><p class=\"mb-0\">You hear from us, so you are never guessing how things are going.</p></div></li>",
      "</ol>",
      "</div>",
      '<div class="card">',
      "<h3>Lesson format</h3>",
      '<div class="session-row"><div><div class="s-name">One-to-one</div><p class="s-meta mb-0">Focused attention on your child</p></div></div>',
      '<div class="session-row"><div><div class="s-name">Small group</div><p class="s-meta mb-0">Up to four students, same level</p></div></div>',
      '<div class="session-row"><div><div class="s-name">Online</div><p class="s-meta mb-0">Live lessons, shared materials</p></div></div>',
      (has(site.hours) ? "<p class=\"mb-0\"><strong>Availability</strong><br>" + esc(site.hours) + "</p>" : ""),
      "</div>",
      "</div></section>",

      '<section class="block alt"><div class="wrap">',
      "<h2>What parents say</h2>",
      '<div class="grid g3">',
      '<div class="parent-quote"><p>"Our son went from dreading maths to explaining it to us at dinner. The confidence change is the biggest win."</p><p class="who">— Parent, Year 10</p></div>',
      '<div class="parent-quote"><p>"Clear updates after every lesson. We always know what he is working on and what to expect next."</p><p class="who">— Parent, GCSE</p></div>',
      '<div class="parent-quote"><p>"Patient, organised, and never makes him feel stupid for asking the obvious question."</p><p class="who">— Parent, Year 7</p></div>',
      "</div></div></section>",

      '<section class="band"><div class="wrap" style="text-align:center">',
      "<h2>First lesson free.</h2><p>No commitment — just a proper assessment and a straight answer about what comes next.</p>",
      (wa ? '<a class="btn btn-accent" href="' + wa + '" target="_blank" rel="noopener">Book a trial lesson</a>' : ""),
      "</div></section>",

      '<section class="block" id="contact"><div class="wrap split">',
      '<div><span class="eyebrow">Enquire</span><h2>Talk to us</h2>' + contactBlock(site) + socialRow(site) + "</div>",
      '<div class="hours-box"><h3>Lesson times</h3><p>' + esc(site.hours || "Weekdays 4pm – 8pm · Saturday mornings") + "</p>",
      '<p class="mb-0">Send us the student&rsquo;s year and the subjects they need help with, and we will come back with availability and a price.</p></div>',
      "</div></section>",

      '<footer class="site-foot"><div class="wrap">',
      '<div class="foot-grid">',
      "<div><h4>" + esc(name) + "</h4><p>" + esc(site.description || tagline) + "</p></div>",
      "<div><h4>Lessons</h4><a href=\"#subjects\">Subjects</a><br><a href=\"#how\">How it works</a><br><a href=\"#contact\">Enquire</a></div>",
      "<div><h4>Get in touch</h4>" +
        (has(site.phone) ? "<p>" + esc(site.phone) + "</p>" : "") +
        (has(site.email) ? "<p>" + esc(site.email) + "</p>" : "") +
        (has(site.address) ? "<p>" + esc(site.address) + "</p>" : "") +
      "</div></div>",
      '<div class="foot-bottom"><span>&copy; ' + new Date().getFullYear() + " " + esc(name) + "</span><span>Built with PageBuilder</span></div>",
      "</div></footer>",

      waFloat(site),
      "</body></html>"
    ].join("");
  }

  /* ---------------------------------------------------------------------- */
  /* Registry                                                                */
  /* ---------------------------------------------------------------------- */

  var TEMPLATES = [
    {
      id: "restaurant",
      name: "Bistro",
      category: "Restaurant",
      tagline: "Menus, opening hours, and WhatsApp ordering.",
      bestFor: "Restaurants, cafes, food vendors, caterers",
      render: renderRestaurant,
      sample: {
        name: "Mama Rosa Kitchen",
        tagline: "Home-style cooking, served fresh daily.",
        description: "A family-run kitchen serving generous plates of local favourites. Dine in, take away, or order for delivery.",
        whatsapp: "15551234567",
        phone: "+1 555 123 4567",
        email: "hello@mamarosa.example",
        address: "12 Market Street, Springfield",
        hours: "Mon–Sat 11am–10pm · Sun 12pm–8pm",
        primary: "#c2410c",
        accent: "#fbbf24",
        category: "Restaurant",
        items: [
          { name: "Grilled Chicken Plate", price: "12.50", description: "Served with rice, salad, and our house sauce." },
          { name: "Family Feast", price: "34.00", description: "Feeds four — mixed grill, sides, and drinks." },
          { name: "Vegetable Curry", price: "9.75", description: "Slow-cooked with coconut and local spices." },
          { name: "Breakfast Special", price: "6.50", description: "Eggs, toast, and coffee before 11am." },
          { name: "Fresh Juice", price: "3.25", description: "Mango, passion fruit, or orange." },
          { name: "Dessert of the Day", price: "4.00", description: "Ask us what's fresh out of the oven." }
        ]
      }
    },
    {
      id: "fashion",
      name: "Atelier",
      category: "Fashion",
      tagline: "Product grids and a lookbook for clothing brands.",
      bestFor: "Clothing stores, boutiques, tailors, accessories",
      render: renderFashion,
      sample: {
        name: "Nova Threads",
        tagline: "Everyday pieces with a little more character.",
        description: "A small-batch clothing label focused on comfortable cuts and fabrics that last. New drops every week.",
        whatsapp: "15551234567",
        phone: "+1 555 987 6543",
        email: "shop@novathreads.example",
        address: "Unit 4, Riverside Arcade",
        hours: "Tue–Sun 10am–7pm",
        primary: "#111827",
        accent: "#f472b6",
        category: "Fashion",
        items: [
          { name: "Oversized Linen Shirt", price: "38", description: "Breathable, relaxed fit. Sizes S–XXL." },
          { name: "Everyday Denim", price: "52", description: "Mid-rise, straight leg, built to last." },
          { name: "Knit Cardigan", price: "45", description: "Soft cotton blend in three colours." },
          { name: "Leather Belt", price: "22", description: "Hand-finished with a brass buckle." }
        ]
      }
    },
    {
      id: "general",
      name: "Cornerstone",
      category: "General business",
      tagline: "Services, testimonials, and a clear call to action.",
      bestFor: "Barbers, salons, phone shops, freelancers, trades",
      render: renderGeneral,
      sample: {
        name: "Bright Cuts Barbershop",
        tagline: "Sharp cuts, friendly faces, no appointment needed.",
        description: "A neighbourhood barbershop offering classic cuts, beard trims, and hot towel shaves for all ages.",
        whatsapp: "15551234567",
        phone: "+1 555 246 8100",
        email: "book@brightcuts.example",
        address: "88 High Street, Springfield",
        hours: "Mon–Sat 9am–7pm",
        primary: "#1d4ed8",
        accent: "#22d3ee",
        category: "Barber & salon",
        items: [
          { name: "Classic Cut", price: "18", description: "Consultation, cut, and finish." },
          { name: "Cut & Beard Trim", price: "26", description: "Our most popular combination." },
          { name: "Hot Towel Shave", price: "16", description: "Traditional straight-razor shave." },
          { name: "Kids Cut", price: "12", description: "For our younger customers, under 12." },
          { name: "Colour & Style", price: "40", description: "Full colour with a styling finish." },
          { name: "Wedding Package", price: "Quote", description: "Group bookings for the big day." }
        ]
      }
    },
    {
      id: "wellness",
      name: "Serenity",
      category: "Wellness",
      tagline: "Treatments and appointments, with a calm booking flow.",
      bestFor: "Spas, salons, barbers, massage and beauty studios",
      render: renderWellness,
      sample: {
        name: "Stillwater Spa",
        tagline: "Slow down, breathe out, feel like yourself again.",
        description: "A quiet studio offering facials, massages, and body treatments. Everything is tailored to you, and nothing is rushed.",
        whatsapp: "15551234567",
        phone: "+1 555 333 7788",
        email: "book@stillwater.example",
        address: "5 Willow Lane, Springfield",
        hours: "Tue–Sat 10am–7pm · Sun 11am–4pm",
        primary: "#0f766e",
        accent: "#f5d0c5",
        category: "Wellness & spa",
        items: [
          { name: "Deep Tissue Massage", price: "70", description: "60 minutes of focused pressure work." },
          { name: "Signature Facial", price: "85", description: "Cleanse, exfoliation, mask, and massage." },
          { name: "Express Treatment", price: "40", description: "30 minutes, for when time is short." },
          { name: "Body Polish", price: "60", description: "Full-body exfoliation and moisturising." },
          { name: "Couples Massage", price: "130", description: "Side-by-side, 60 minutes each." },
          { name: "Gift Voucher", price: "Any", description: "Valid for twelve months." }
        ]
      }
    },
    {
      id: "trades",
      name: "Ironline",
      category: "Trades",
      tagline: "Service lists, coverage areas, and a hard-selling phone number.",
      bestFor: "Plumbers, electricians, builders, cleaning and repair companies",
      render: renderTrades,
      sample: {
        name: "Ironline Services",
        tagline: "Fast call-outs. Fixed prices. No surprises.",
        description: "A local trades business handling repairs, installations, and maintenance for homes and small businesses across the area.",
        whatsapp: "15551234567",
        phone: "+1 555 909 1122",
        email: "jobs@ironline.example",
        address: "Unit 9, Trade Park, Springfield",
        hours: "Mon–Sat 7am–7pm · Emergency 24/7",
        primary: "#b45309",
        accent: "#1f2937",
        category: "Home services",
        items: [
          { name: "Emergency call-out", price: "Quote", description: "Leaks, blockages, and power faults." },
          { name: "Installation & fittings", price: "Quote", description: "Fixtures, appliances, and fittings." },
          { name: "Maintenance visit", price: "55", description: "One hour of work, parts at cost." },
          { name: "Full rewire", price: "Quote", description: "Certified, tested, and certified again." },
          { name: "Kitchen or bathroom fit", price: "Quote", description: "Managed from first plan to final clean." },
          { name: "Annual boiler service", price: "89", description: "Safety check and certificate." }
        ]
      }
    },
    {
      id: "fitness",
      name: "Pulse",
      category: "Fitness",
      tagline: "A class timetable, membership notes, and a free-trial call to action.",
      bestFor: "Gyms, studios, personal trainers, yoga and martial arts",
      render: renderFitness,
      sample: {
        name: "Pulse Fitness Studio",
        tagline: "Train in a room full of people who want you to win.",
        description: "Small-group classes and one-to-one coaching across strength, conditioning, mobility, and yoga. All levels genuinely welcome.",
        whatsapp: "15551234567",
        phone: "+1 555 741 0099",
        email: "hello@pulsefit.example",
        address: "2 Coach Lane, Springfield",
        hours: "Weekdays 6am–9pm · Weekends 8am–2pm",
        primary: "#0ea5e9",
        accent: "#a3e635",
        category: "Fitness & classes",
        items: [
          { name: "Strength Circuit", price: "12", description: "45 min · All levels" },
          { name: "HIIT Express", price: "10", description: "30 min · High intensity" },
          { name: "Mobility Flow", price: "10", description: "40 min · Joints and recovery" },
          { name: "Yoga Basics", price: "12", description: "60 min · Beginner friendly" },
          { name: "One-to-one Coaching", price: "40", description: "60 min · Personal session" },
          { name: "Monthly Membership", price: "45", description: "Unlimited classes, cancel anytime" }
        ]
      }
    },
    {
      id: "realestate",
      name: "Keystone",
      category: "Real estate",
      tagline: "Listings with specs, agent profiles, and viewing requests.",
      bestFor: "Estate agents, letting agents, property consultants",
      render: renderRealEstate,
      sample: {
        name: "Keystone Property",
        tagline: "Honest valuations. Homes worth a second look.",
        description: "A local estate agency covering the whole area, with honest advice on price and viewings arranged at short notice.",
        whatsapp: "15551234567",
        phone: "+1 555 620 4477",
        email: "hello@keystoneproperty.example",
        address: "18 Churchgate, Springfield",
        hours: "Mon–Fri 9am–6pm · Sat 10am–2pm",
        primary: "#0f5132",
        accent: "#d4af37",
        category: "Estate agency",
        items: [
          { name: "3-bed Semi, Willow Lane", price: "325000", description: "Two reception rooms, garden, and a new boiler fitted last year." },
          { name: "2-bed Flat, Riverside", price: "210000", description: "Top floor, lift access, allocated parking space." },
          { name: "4-bed Detached, Northfield", price: "495000", description: "Double garage, large plot, close to the village school." },
          { name: "Studio, Town Centre", price: "780", description: "Furnished, bills included, available immediately." },
          { name: "3-bed Terrace, Eastfield", price: "1850", description: "Pets considered, small private garden, recent refit." },
          { name: "New Build, Southbank", price: "280000", description: "Two bedrooms, balcony, allocated parking, warranty included." }
        ]
      }
    },
    {
      id: "tutoring",
      name: "Beacon",
      category: "Education",
      tagline: "Subject cards, a clear process, and parent testimonials.",
      bestFor: "Tutors, tutoring centres, academies, driving schools",
      render: renderTutoring,
      sample: {
        name: "Beacon Tutoring",
        tagline: "The lesson where it finally clicks.",
        description: "Patient, structured tuition across maths, sciences, and English for secondary students and adults. Free assessment before you commit to anything.",
        whatsapp: "15551234567",
        phone: "+1 555 118 2233",
        email: "enquiries@beacontutoring.example",
        address: "7 Library Square, Springfield",
        hours: "Weekdays 4pm–8pm · Saturday mornings",
        primary: "#4338ca",
        accent: "#fbbf24",
        category: "Tuition & education",
        items: [
          { name: "GCSE Maths", price: "30", description: "Higher and foundation tier, exam technique included." },
          { name: "A-Level Maths", price: "38", description: "Pure, mechanics, and statistics modules." },
          { name: "GCSE English", price: "30", description: "Literature and language, coursework support." },
          { name: "Physics", price: "34", description: "GCSE and A-Level, practical papers covered." },
          { name: "Chemistry", price: "34", description: "GCSE and A-Level, exam-style questions weekly." },
          { name: "11+ Preparation", price: "32", description: "English, maths, and verbal reasoning practice papers." }
        ]
      }
    }
  ];

  function getTemplate(id) {
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].id === id) return TEMPLATES[i];
    }
    return TEMPLATES[0];
  }

  /** Render a site object with whichever template it declares. */
  function render(site) {
    var tpl = getTemplate(site && site.template);
    return tpl.render(site || {});
  }

  /** A ready-made demo site for a template (used for thumbnails and seeds). */
  function sampleSite(templateId) {
    var tpl = getTemplate(templateId);
    var site = JSON.parse(JSON.stringify(tpl.sample));
    site.template = tpl.id;
    site.id = "sample_" + tpl.id;
    site.published = true;
    return site;
  }

  /** Wrap generated HTML in a Blob and trigger a download. */
  function downloadSite(site, filename) {
    var html = render(site);
    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename || "index.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  /** Filesystem-safe slug for a business name. */
  function slugify(text) {
    return String(text || "my-website")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "my-website";
  }

  window.Templates = {
    list: TEMPLATES,
    get: getTemplate,
    render: render,
    sampleSite: sampleSite,
    downloadSite: downloadSite,
    slugify: slugify,
    helpers: { esc: esc, waLink: waLink, initials: initials, money: money, readableOn: readableOn }
  };
})();