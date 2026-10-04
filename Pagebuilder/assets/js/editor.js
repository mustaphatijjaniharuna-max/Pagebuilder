/* ==========================================================================
   PageBuilder — editor.js
   Wires the editor form to the live preview and to the generated website.

   Flow:
     form input -> draft object -> Templates.render() -> iframe.srcdoc
                                              \-> download as index.html

   Everything is saved to localStorage as you type, so a refresh never loses work.
   ========================================================================== */

(function () {
  "use strict";

  var $ = function (sel) { return document.querySelector(sel); };

  /* ---------- URL parameter: ?template=fashion ---------- */
  function templateFromUrl() {
    var match = /[?&]template=([a-z]+)/i.exec(location.search);
    if (!match) return null;
    var id = match[1].toLowerCase();
    return Templates.get(id).id === id ? id : null;
  }

  /* ---------- State ---------- */
  var draft = Store.loadDraft(templateFromUrl());
  if (templateFromUrl()) {
    draft.template = templateFromUrl();
  }
  var previewFrame = $("#previewFrame");
  var previewDevice = $("#previewDevice");
  var renderTimer = null;

  /* ---------- Rendering ---------- */
  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPreview, 120);
  }

  function renderPreview() {
    previewFrame.srcdoc = Templates.render(draft);
  }

  function persist() {
    var ok = Store.saveDraft(draft);
    $("#quotaWarning").style.display = ok ? "none" : "block";
  }

  /* ---------- Binding helpers ---------- */
  function bindText(id, key) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = draft[key] == null ? "" : draft[key];
    el.addEventListener("input", function () {
      draft[key] = el.value;
      persist();
      scheduleRender();
    });
  }

  /* ---------- Tabs ---------- */
  function initTabs() {
    var tabs = document.querySelectorAll(".tabs button");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function () {
        var target = this.getAttribute("data-tab");
        var allTabs = document.querySelectorAll(".tabs button");
        for (var j = 0; j < allTabs.length; j++) allTabs[j].classList.remove("active");
        this.classList.add("active");

        var panels = document.querySelectorAll(".tab-panel");
        for (var k = 0; k < panels.length; k++) {
          panels[k].classList.toggle("active", panels[k].getAttribute("data-panel") === target);
        }
      });
    }
  }

  /* ---------- Template picker ---------- */
  function initTemplatePicker() {
    var picker = $("#templatePicker");

    function paint() {
      picker.innerHTML = Templates.list.map(function (tpl) {
        var active = tpl.id === draft.template;
        return '' +
          '<button type="button" class="btn ' + (active ? "btn-primary" : "btn-ghost") + '" ' +
                  'data-tpl="' + tpl.id + '" style="justify-content:flex-start;text-align:left;padding:.75rem 1rem">' +
            '<span style="display:block">' +
              '<strong style="display:block">' + tpl.name + '</strong>' +
              '<span style="font-weight:500;font-size:.78rem;opacity:.85">' + tpl.category + '</span>' +
            '</span>' +
          '</button>';
      }).join("");
    }

    picker.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-tpl]");
      if (!btn) return;
      draft.template = btn.getAttribute("data-tpl");
      paint();
      persist();
      renderPreview();
      UI.toast("Template changed to " + Templates.get(draft.template).name, "success");
    });

    paint();
  }

  /* ---------- Products / services ---------- */
  function initItems() {
    var list = $("#itemList");

    function paint() {
      if (!draft.items.length) {
        list.innerHTML = '<div class="empty" style="padding:26px 16px;font-size:.88rem">' +
          "No products or services yet. Add your first one below.</div>";
        return;
      }

      list.innerHTML = draft.items.map(function (item, index) {
        return '' +
          '<div class="item-row" data-index="' + index + '">' +
            '<input class="input" data-field="name" placeholder="Name" value="' + escapeAttr(item.name) + '">' +
            '<input class="input" data-field="description" placeholder="Short description" value="' + escapeAttr(item.description) + '">' +
            '<input class="input" data-field="price" placeholder="Price" value="' + escapeAttr(item.price) + '">' +
            '<button type="button" class="icon-btn" data-remove="' + index + '" title="Remove">✕</button>' +
          '</div>';
      }).join("");
    }

    function escapeAttr(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
        .replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    list.addEventListener("input", function (e) {
      var row = e.target.closest(".item-row");
      var field = e.target.getAttribute("data-field");
      if (!row || !field) return;
      var index = parseInt(row.getAttribute("data-index"), 10);
      if (isNaN(index) || !draft.items[index]) return;
      draft.items[index][field] = e.target.value;
      persist();
      scheduleRender();
    });

    list.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove]");
      if (!btn) return;
      var index = parseInt(btn.getAttribute("data-remove"), 10);
      draft.items.splice(index, 1);
      persist();
      paint();
      renderPreview();
    });

    $("#addItem").addEventListener("click", function () {
      draft.items.push({ name: "", description: "", price: "" });
      persist();
      paint();
      renderPreview();
      // Focus the new row's first input.
      var rows = list.querySelectorAll(".item-row");
      var last = rows[rows.length - 1];
      if (last) last.querySelector("input").focus();
    });

    paint();
  }

  /* ---------- Logo ---------- */
  function initLogo() {
    var drop = $("#logoDrop");
    var input = $("#logoInput");
    var preview = $("#logoPreview");
    var img = $("#logoImg");

    function paint() {
      if (draft.logo) {
        preview.style.display = "flex";
        drop.style.display = "none";
        img.src = draft.logo;
      } else {
        preview.style.display = "none";
        drop.style.display = "block";
      }
    }

    drop.addEventListener("click", function () { input.click(); });

    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        UI.toast("That image is over 2MB — try a smaller file.", "error");
        input.value = "";
        return;
      }

      var reader = new FileReader();
      reader.onload = function () {
        draft.logo = reader.result;
        persist();
        paint();
        renderPreview();
        UI.toast("Logo added", "success");
      };
      reader.onerror = function () { UI.toast("Couldn't read that image.", "error"); };
      reader.readAsDataURL(file);
      input.value = "";
    });

    $("#removeLogo").addEventListener("click", function () {
      draft.logo = "";
      persist();
      paint();
      renderPreview();
    });

    paint();
  }

  /* ---------- Colours ---------- */
  function initColours() {
    var primarySwatches = ["#5346d1", "#c2410c", "#0f766e", "#1d4ed8", "#111827", "#be185d"];
    var accentSwatches = ["#b8f14b", "#fbbf24", "#22d3ee", "#f472b6", "#ffffff", "#a3e635"];

    function buildSwatches(container, colours, key, input) {
      container.innerHTML = colours.map(function (c) {
        return '<button type="button" class="swatch" data-colour="' + c + '" style="background:' + c + '" title="' + c + '" aria-label="Use ' + c + '"></button>';
      }).join("");

      container.addEventListener("click", function (e) {
        var swatch = e.target.closest("[data-colour]");
        if (!swatch) return;
        var colour = swatch.getAttribute("data-colour");
        draft[key] = colour;
        input.value = colour;
        persist();
        renderPreview();
      });
    }

    var primaryInput = $("#fPrimary");
    var accentInput = $("#fAccent");

    primaryInput.value = draft.primary;
    accentInput.value = draft.accent;

    primaryInput.addEventListener("input", function () {
      draft.primary = primaryInput.value; persist(); scheduleRender();
    });
    accentInput.addEventListener("input", function () {
      draft.accent = accentInput.value; persist(); scheduleRender();
    });

    buildSwatches($("#primarySwatches"), primarySwatches, "primary", primaryInput);
    buildSwatches($("#accentSwatches"), accentSwatches, "accent", accentInput);
  }

  /* ---------- Preview size toggle ---------- */
  function initSizeToggle() {
    var buttons = document.querySelectorAll(".preview-bar .seg button");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        var size = this.getAttribute("data-size");
        for (var j = 0; j < buttons.length; j++) buttons[j].classList.remove("active");
        this.classList.add("active");
        previewDevice.classList.toggle("mobile", size === "mobile");
      });
    }
  }

  /* ---------- Download ---------- */
  function siteSummary() {
    var bits = [];
    if (draft.name) bits.push("<strong>" + escapeHtml(draft.name) + "</strong>");
    bits.push(Templates.get(draft.template).name + " template");
    if (draft.items.length) bits.push(draft.items.length + (draft.items.length === 1 ? " item" : " items"));
    if (draft.whatsapp) bits.push("WhatsApp button");
    if (draft.logo) bits.push("custom logo");
    return bits.join(" &middot; ");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function doDownload() {
    var filename = Templates.slugify(draft.name) + ".html";
    Templates.downloadSite(draft, filename);
    $("#downloadSummary").innerHTML = siteSummary();
    $("#downloadFilename").textContent = filename;
    UI.openModal("downloadModal");
  }

  function initDownload() {
    $("#btnDownload").addEventListener("click", function () {
      if (!draft.name.trim()) {
        UI.toast("Add a business name first — then download.", "error");
        return;
      }
      doDownload();
    });
    $("#downloadAgain").addEventListener("click", doDownload);
    $("#closeDownload").addEventListener("click", function () { UI.closeModal("downloadModal"); });
  }

  /* ---------- Reset ---------- */
  function initReset() {
    $("#btnReset").addEventListener("click", function () {
      if (!confirm("Start over? This clears the details you've entered.")) return;
      Store.clearDraft();
      draft = Store.blankDraft(draft.template);
      location.reload();
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    initTabs();
    initTemplatePicker();
    initItems();
    initLogo();
    initColours();
    initSizeToggle();
    initDownload();
    initReset();

    bindText("fName", "name");
    bindText("fTagline", "tagline");
    bindText("fDescription", "description");
    bindText("fCategory", "category");
    bindText("fHours", "hours");
    bindText("fWhatsapp", "whatsapp");
    bindText("fPhone", "phone");
    bindText("fEmail", "email");
    bindText("fAddress", "address");

    // Reflect publish state on load.
    if (draft.published) $("#draftStatus").textContent = "Published";

    renderPreview();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();