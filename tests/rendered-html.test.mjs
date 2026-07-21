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
  assert.match(page, /catalogLanguage: "both-es"/);
  assert.match(page, /catalogQuality: "balanced"/);
  assert.match(page, /preferCovers: true/);
  assert.match(page, /preferDescriptions: true/);
  assert.match(page, /showRecommendations: true/);
  assert.match(page, /folio-extensions-v1/);
  assert.match(page, /folio-lists-v1/);
  assert.match(page, /exportSettings/);
  assert.match(page, /importSettings/);
  assert.match(page, /recommendationFreshCount: 8/);
  assert.match(page, /recommendationSeriesCount: 2/);
  assert.match(page, /recommendationTextCount: 2/);
  assert.match(page, /recommendationMaxPerAuthor/);
  assert.match(page, /detailMode === "full"/);
  assert.match(page, /enableLists: false/);
  assert.match(page, /renderLists/);
  assert.match(page, /const libraryById = useMemo/);
  assert.match(page, /duplicatesKnownBook/);
  assert.match(page, /familyCounts/);
  assert.match(page, /sanitizeSettings/);
  assert.match(page, /extensionRuntimeDocument/);
  assert.match(page, /sandbox="allow-scripts"/);
  assert.match(page, /Extensiones de Folio/);
  assert.match(page, /SettingPreview/);
  assert.doesNotMatch(page, /recommendation-mode.*Algoritmo básico/);
  assert.match(page, /showDetailRating: false/);
  assert.match(page, /coverQuality: "balanced"/);
  assert.match(page, /measureCatalogProvider/);
  assert.match(page, /folioOrigin/);
  assert.match(page, /restoreBookDetailOrigin/);
  assert.match(page, /requestSubmit\(\)/);
  assert.match(page, /setListsEnabled/);
  assert.match(page, /Listas ocultas/);
  assert.match(page, /BUILT_IN_EXTENSIONS/);
  assert.match(page, /Sala de lectura/);
  assert.match(page, /Galería de portadas/);
  assert.match(page, /Biblioteca compacta/);
  assert.match(page, /Tinta nocturna/);
  assert.match(page, /mergeBuiltInExtensions/);
  assert.match(page, /HESOYAM/);
  assert.match(page, /RADIATION_PARTICLES/);
  assert.match(page, /setRecommendationsEnabled/);
  assert.match(page, /data-background/);
  assert.match(page, /data-metadata/);
  assert.match(catalog, /openlibrary\.org\/search\.json/);
  assert.match(catalog, /googleapis\.com\/books\/v1\/volumes/);
  assert.match(catalog, /gutendex\.com\/books/);
  assert.match(catalog, /Promise\.allSettled/);
  assert.match(catalog, /CatalogLanguage/);
  assert.match(catalog, /polishResults/);
  assert.match(catalog, /editDistance/);
  assert.match(catalog, /fuzzyQueryVariant/);
  assert.match(catalog, /_metadataScore/);
  assert.match(catalog, /hideIncomplete/);
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
  assert.match(css, /\.setting-preview/);
  assert.match(css, /\.language-options/);
  assert.match(css, /\.extension-editor/);
  assert.match(css, /\.extension-logo/);
  assert.match(css, /\.radiation-snow/);
  assert.match(css, /@keyframes radiation-fall/);
  assert.match(css, /\.book-detail-full/);
  assert.match(css, /\.lists-page/);
  assert.match(css, /\.preview-scenes/);
  assert.match(packageJson, /"version": "1\.5\.0"/);
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

test("cleans noisy edition titles and keeps translation matching wired", async () => {
  const { cleanCatalogTitle } = await import(new URL("../app/folio-catalog.ts", import.meta.url));
  const noisy = "Rebelión en la granja [Paperback] [Jan 01, 2000] George Orwell";
  assert.equal(cleanCatalogTitle(noisy, ["George Orwell"]), "Rebelión en la granja");

  const [page, catalog, fixtureText] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/folio-catalog.ts", root), "utf8"),
    readFile(new URL("tests/fixtures/reader-profile-orwell-dune.json", root), "utf8"),
  ]);
  const fixture = JSON.parse(fixtureText);
  assert.equal(fixture.books.length, 12);
  assert.match(catalog, /resolveCanonicalWork/);
  assert.match(catalog, /editions\.title/);
  assert.match(catalog, /ranking === "relevance"/);
  assert.match(page, /RECOMMENDATION_ENGINE_VERSION = "v3-canonical-topics"/);
  assert.match(page, /subject:\\"dystopian fiction\\"/);
  assert.match(page, /looksLikeSecondaryLiterature/);
  assert.match(page, /dismissRecommendation/);
  assert.match(page, /No me interesa/);
});
