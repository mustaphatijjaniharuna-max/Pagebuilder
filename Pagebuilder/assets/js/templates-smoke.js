/* Throwaway smoke test: node assets/js/templates-smoke.js
   Loads templates.js in a fake browser-ish global and renders every template. */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var src = fs.readFileSync(path.join(__dirname, "templates.js"), "utf8");

var sandbox = { window: {}, console: console, Blob: function () { }, URL: {}, document: {}, setTimeout: setTimeout };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: "templates.js" });

var T = sandbox.window.Templates;
if (!T) throw new Error("Templates global was not registered");

var problems = [];

T.list.forEach(function (tpl) {
  var site = T.sampleSite(tpl.id);
  var html = T.render(site);

  if (html.indexOf("<!DOCTYPE html>") !== 0) problems.push(tpl.id + ": missing doctype");
  if (html.indexOf("</html>") === -1) problems.push(tpl.id + ": missing closing html");
  if (html.indexOf("undefined") > -1) problems.push(tpl.id + ": literal 'undefined' in output");
  if (html.indexOf("NaN") > -1) problems.push(tpl.id + ": literal 'NaN' in output");
  if (html.indexOf("[object") > -1) problems.push(tpl.id + ": '[object Object]' in output");
  if (html.indexOf("#eceaf ") > -1) problems.push(tpl.id + ": malformed hex colour");

  // Empty site (brand new user, nothing filled in) must not crash.
  var empty = { template: tpl.id, name: "", tagline: "", items: [], primary: "#ffffff", accent: "#ffffff" };
  var emptyHtml = T.render(empty);
  if (emptyHtml.indexOf("undefined") > -1) problems.push(tpl.id + ": 'undefined' on empty site");

  // Structural tag balance.
  var opens = (html.match(/<section\b/g) || []).length;
  var closes = (html.match(/<\/section>/g) || []).length;
  if (opens !== closes) problems.push(tpl.id + ": section tags unbalanced (" + opens + "/" + closes + ")");

  var dOpens = (html.match(/<div\b/g) || []).length;
  var dCloses = (html.match(/<\/div>/g) || []).length;
  if (dOpens !== dCloses) problems.push(tpl.id + ": div tags unbalanced (" + dOpens + "/" + dCloses + ")");

  console.log(
    tpl.id.padEnd(12),
    String(html.length).padStart(7) + " chars",
    "| sections " + opens,
    "| divs " + dOpens,
    "| wa.me " + (html.indexOf("wa.me") > -1 ? "yes" : "no ")
  );
});

console.log("\nslugify:", JSON.stringify(T.slugify("Mama Rosa's Kitchen & Grill!")));
console.log("money:", T.helpers.money("12.5"), "|", T.helpers.money("$9"), "|", T.helpers.money("Quote"), "|", JSON.stringify(T.helpers.money("")));
console.log("readableOn(#ffffff):", T.helpers.readableOn("#ffffff"), " readableOn(#111827):", T.helpers.readableOn("#111827"));

if (problems.length) {
  console.log("\nPROBLEMS:");
  problems.forEach(function (p) { console.log(" - " + p); });
  process.exit(1);
}
console.log("\nAll template checks passed.");