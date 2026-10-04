const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Load templates.js the same way templates-smoke.js does.
const src = fs.readFileSync(path.join("assets", "js", "templates.js"), "utf8");
const sandbox = { window: {}, console, Blob: function () { }, URL: {}, document: {}, setTimeout };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: "templates.js" });
const T = sandbox.window.Templates;

console.log("TEMPLATES IN REGISTRY: " + T.list.length);
T.list.forEach((t) => console.log("  - " + t.id.padEnd(12) + t.name.padEnd(10) + t.category));

// Every registry entry must have a render fn, sample data, and copy.
const bad = [];
T.list.forEach((t) => {
  if (typeof t.render !== "function") bad.push(t.id + ": no render fn");
  if (!t.sample || !t.sample.name) bad.push(t.id + ": no sample name");
  if (!t.tagline) bad.push(t.id + ": no tagline");
  if (!t.bestFor) bad.push(t.id + ": no bestFor");
  if (!t.category) bad.push(t.id + ": no category");
  // sample must actually render
  try { T.render(T.sampleSite(t.id)); } catch (e) { bad.push(t.id + ": render threw " + e.message); }
});

// The done-for-you dropdown must offer every template id.
const dfy = fs.readFileSync("done-for-you.html", "utf8");
const optIds = [...dfy.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
const tplIds = T.list.map((t) => t.id);
const missing = tplIds.filter((id) => !optIds.includes(id));
console.log("\nDROPDOWN OPTIONS: " + JSON.stringify(optIds));
console.log("templates missing from dropdown: " + (missing.length ? missing.join(", ") : "none"));

console.log(bad.length ? "\nPROBLEMS:\n - " + bad.join("\n - ") : "\nRegistry copy + samples OK");
