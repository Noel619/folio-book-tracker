import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders Folio's library home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Folio · Book Tracker<\/title>/i);
  assert.match(html, /Seguir leyendo/);
  assert.match(html, /Cien años de soledad/);
  assert.match(html, /Buscar por título, autor o ISBN/);
  assert.doesNotMatch(html, /Espacio de lectura|Tu próxima página|nota media/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("keeps local tracking and Open Library capabilities wired", async () => {
  const [page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /folio-library-v1/);
  assert.match(page, /openlibrary\.org\/search\.json/);
  assert.match(page, /exportJson/);
  assert.match(page, /exportCsv/);
  assert.match(page, /readYear/);
  assert.match(page, /rating/);
  assert.match(page, /const GRID_PAGE_SIZE = 24/);
  assert.match(page, /books\.slice\(0, limit\)/);
  assert.match(page, /TIMELINE_PAGE_SIZE/);
  assert.match(page, /scrollIntoView/);
  assert.match(layout, /<html lang="es">/);
  assert.match(layout, /folio-logo\.png/);
  assert.match(css, /\.modal-content::\-webkit-scrollbar/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("public/folio-logo.png", root));
  await assert.rejects(access(new URL("app/_sites-preview", root)));
});
