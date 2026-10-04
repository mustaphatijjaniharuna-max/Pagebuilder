/* ==========================================================================
   PageBuilder — main.js
   Shared page chrome: mobile nav, current-page highlighting, year stamp,
   and the small "toast" used by the editor.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- Mobile navigation ---------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (!toggle || !links) return;

    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Close the menu after tapping a link (mobile).
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") links.classList.remove("open");
    });
  }

  /* ---------- Highlight the current page in the nav ---------- */
  function initActiveLink() {
    var here = location.pathname.split("/").pop() || "index.html";
    var links = document.querySelectorAll(".nav-links a[href]");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href").split("#")[0].split("?")[0];
      if (href && href === here) links[i].classList.add("active");
    }
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    var els = document.querySelectorAll("[data-year]");
    for (var i = 0; i < els.length; i++) els[i].textContent = new Date().getFullYear();
  }

  /* ---------- Toast ---------- */
  var toastEl = null;
  var toastTimer = null;

  function toast(message, kind) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.className = "toast show" + (kind ? " " + kind : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.className = "toast";
    }, 2600);
  }

  /* ---------- Reveal-on-scroll (progressive enhancement) ---------- */
  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    for (var i = 0; i < items.length; i++) io.observe(items[i]);
  }

  /* ---------- Modal helpers (used by the done-for-you page) ---------- */
  function openModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add("open");
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove("open");
  }

  document.addEventListener("click", function (e) {
    if (e.target.classList && e.target.classList.contains("modal-backdrop")) {
      e.target.classList.remove("open");
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var open = document.querySelectorAll(".modal-backdrop.open");
      for (var i = 0; i < open.length; i++) open[i].classList.remove("open");
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initActiveLink();
    initYear();
    initReveal();
  });

  window.UI = { toast: toast, openModal: openModal, closeModal: closeModal };
})();