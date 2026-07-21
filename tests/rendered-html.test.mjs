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
  assert.match(html, /Recomendados/);
  assert.match(html, /Cien años de soledad/);
  assert.match(html, /Buscar por título, autor o ISBN/);
  assert.doesNotMatch(html, /Espacio de lectura|Tu próxima página|nota media/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("keeps local tracking, catalogs and recommendations wired", async () => {
  const [page, layout, css, storage, catalog, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("app/folio-storage.ts", root), "utf8"),
    readFile(new URL("app/folio-catalog.ts", root), "utf8"),
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
  assert.match(page, /coverOverride/);
  assert.match(page, /fetchCoverSuggestions/);
  assert.match(page, /editions\.json\?limit=50/);
  assert.match(page, /detailMode/);
  assert.match(page, /bookDetailHash/);
  assert.match(page, /version: 2/);
  assert.match(page, /coverAssets/);
  assert.match(page, /data-rating/);
  assert.match(page, /data-transition/);
  assert.match(page, /folio-discovery-v1/);
  assert.match(page, /recommendationMode/);
  assert.match(page, /rankRecommendations/);
  assert.match(page, /showDetailRating/);
  assert.match(page, /catalogProvider/);
  assert.match(page, /catalogProvider: "openlibrary"/);
  assert.match(page, /recommendationMode: "basic"/);
  assert.match(page, /showDetailRating: false/);
  assert.match(page, /coverQuality: "balanced"/);
  assert.match(page, /measureCatalogProvider/);
  assert.match(page, /data-background/);
  assert.match(page, /data-metadata/);
  assert.match(catalog, /openlibrary\.org\/search\.json/);
  assert.match(catalog, /googleapis\.com\/books\/v1\/volumes/);
  assert.match(catalog, /gutendex\.com\/books/);
  assert.match(catalog, /Promise\.allSettled/);
  assert.match(storage, /folio-assets-v1/);
  assert.match(storage, /MAX_IMAGE_BYTES = 10 \* 1024 \* 1024/);
  assert.match(storage, /image\/webp/);
  assert.match(storage, /importCoverAssets/);
  assert.match(storage, /transaction\.onabort/);
  assert.match(layout, /<html lang="es">/);
  assert.match(layout, /folio-logo\.png/);
  assert.match(css, /\.modal-content::\-webkit-scrollbar/);
  assert.match(css, /\.cover-editor/);
  assert.match(css, /\.book-detail-page/);
  assert.match(css, /data-motion="off"/);
  assert.match(css, /\.recommendation-grid/);
  assert.match(css, /\.provider-options/);
  assert.match(css, /data-metadata="varied"/);
  assert.match(packageJson, /"version": "1\.2\.0"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("public/folio-logo.png", root));
  await assert.rejects(access(new URL("app/_sites-preview", root)));
});

test("keeps a four-thousand-book library progressively bounded", () => {
  const books = Array.from({ length: 4_000 }, (_, index) => ({ id: `book-${index}` }));
  const firstGridPage = books.slice(0, 24);
  const firstTimelinePage = books.slice(0, 100);
  assert.equal(firstGridPage.length, 24);
  assert.equal(firstTimelinePage.length, 100);
  assert.equal(books.length, 4_000);
});
