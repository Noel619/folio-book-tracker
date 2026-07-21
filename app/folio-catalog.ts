export type CatalogProvider = "openlibrary" | "google" | "gutendex" | "auto";
export type CatalogSource = "openlibrary" | "google" | "gutendex";
export type CatalogLanguage = "es" | "en" | "both-es" | "both-en";
export type CatalogQuality = "inclusive" | "balanced" | "strict";

export type CatalogBook = {
  id: string;
  title: string;
  authors: string[];
  coverId?: number;
  remoteCoverUrl?: string;
  publishedYear?: number;
  pages?: number;
  description?: string;
  subjects?: string[];
  editionCount?: number;
  source?: CatalogSource;
  sourceUrl?: string;
  freeText?: boolean;
  language?: string;
};

export type SearchOptions = {
  googleApiKey?: string;
  includeSubjects?: boolean;
  limit?: number;
  language?: CatalogLanguage;
  quality?: CatalogQuality;
  preferCovers?: boolean;
  preferDescriptions?: boolean;
  hideIncomplete?: boolean;
};

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  number_of_pages_median?: number;
  subject?: string[];
  edition_count?: number;
  first_sentence?: string | string[];
  language?: string[];
};

type GoogleVolume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    infoLink?: string;
    imageLinks?: Record<string, string>;
    language?: string;
  };
};

type GutendexBook = {
  id?: number;
  title?: string;
  authors?: Array<{ name?: string }>;
  summaries?: string[];
  subjects?: string[];
  bookshelves?: string[];
  formats?: Record<string, string>;
  media_type?: string;
  languages?: string[];
};

export const CATALOG_PROVIDER_INFO: Record<CatalogProvider, { name: string; badge: string; description: string }> = {
  openlibrary: {
    name: "Open Library",
    badge: "Predeterminada",
    description: "Catálogo amplio, sin clave y con muchas ediciones. Equilibrio general.",
  },
  google: {
    name: "Google Books",
    badge: "Más portadas",
    description: "Buena relevancia y varias resoluciones de imagen. Requiere una clave gratuita.",
  },
  gutendex: {
    name: "Gutendex",
    badge: "Textos gratuitos",
    description: "Clásicos y textos de Project Gutenberg. Catálogo menor, respuesta muy liviana.",
  },
  auto: {
    name: "Automático",
    badge: "Más cobertura",
    description: "Consulta en paralelo las fuentes disponibles y elimina resultados repetidos.",
  },
};

// Catalog payloads differ by endpoint; callers can provide a precise response shape when useful.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchCatalogJson<T = any>(url: string, timeout = 9000): Promise<T> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "force-cache" });
    if (!response.ok) {
      if (response.status === 429) throw new Error("La API alcanzó temporalmente su límite de consultas");
      throw new Error("La fuente de libros no respondió");
    }
    return await response.json() as T;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export function openLibraryCoverUrl(coverId?: number, size: "S" | "M" | "L" = "M") {
  return coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`
    : "";
}

function secureImageUrl(value?: string) {
  if (!value) return "";
  return value.replace(/^http:/, "https:").replace(/[?&]edge=curl/g, "");
}

function normalizeOpenLibraryId(value: string) {
  if (value.startsWith("/")) return value;
  return value.endsWith("W") ? `/works/${value}` : value;
}

async function searchOpenLibrary(query: string, options: SearchOptions) {
  const fields = ["key", "title", "author_name", "cover_i", "first_publish_year", "number_of_pages_median", "edition_count", "first_sentence", "language"];
  if (options.includeSubjects) fields.push("subject");
  const language = options.language || "both-es";
  const catalogQuery = language === "es" ? `${query} language:spa` : language === "en" ? `${query} language:eng` : query;
  const params = new URLSearchParams({
    q: catalogQuery,
    fields: fields.join(","),
    limit: String(Math.min(100, Math.max(options.limit || 24, (options.limit || 24) * 2))),
    lang: language === "en" || language === "both-en" ? "en" : "es",
  });
  const data = await fetchCatalogJson<{ docs?: OpenLibraryDoc[] }>(`https://openlibrary.org/search.json?${params.toString()}`);
  return (data.docs || [])
    .filter((doc) => doc.key && doc.title)
    .map((doc): CatalogBook => {
      const id = normalizeOpenLibraryId(doc.key as string);
      return {
        id,
        title: doc.title as string,
        authors: doc.author_name?.slice(0, 3) || ["Autor no disponible"],
        coverId: doc.cover_i,
        publishedYear: doc.first_publish_year,
        pages: doc.number_of_pages_median,
        editionCount: doc.edition_count,
        subjects: doc.subject?.slice(0, 10),
        description: Array.isArray(doc.first_sentence) ? doc.first_sentence[0] : doc.first_sentence,
        language: doc.language?.includes("spa") ? "es" : doc.language?.includes("eng") ? "en" : doc.language?.length ? "other" : undefined,
        source: "openlibrary",
        sourceUrl: id.startsWith("/") ? `https://openlibrary.org${id}` : "https://openlibrary.org",
      };
    });
}

async function searchGoogleBooks(query: string, options: SearchOptions) {
  const key = options.googleApiKey?.trim();
  if (!key) throw new Error("Google Books necesita una clave API en Configuración");
  const language = options.language || "both-es";
  const params = new URLSearchParams({
    q: query,
    maxResults: String(Math.min(40, options.limit || 24)),
    printType: "books",
    orderBy: "relevance",
    key,
    fields: "items(id,volumeInfo(title,authors,publishedDate,description,pageCount,categories,infoLink,imageLinks,language)),totalItems",
  });
  if (language === "es" || language === "en") params.set("langRestrict", language);
  const data = await fetchCatalogJson<{ items?: GoogleVolume[] }>(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
  return (data.items || [])
    .filter((item) => item.id && item.volumeInfo?.title)
    .map((item): CatalogBook => {
      const info = item.volumeInfo || {};
      const imageLinks = info.imageLinks || {};
      const cover = imageLinks.extraLarge || imageLinks.large || imageLinks.medium || imageLinks.small || imageLinks.thumbnail || imageLinks.smallThumbnail;
      const year = Number(info.publishedDate?.match(/\d{4}/)?.[0]);
      return {
        id: `google:${item.id}`,
        title: info.title || "Libro sin título",
        authors: info.authors?.slice(0, 3) || ["Autor no disponible"],
        remoteCoverUrl: secureImageUrl(cover),
        publishedYear: Number.isFinite(year) ? year : undefined,
        pages: info.pageCount,
        description: info.description,
        subjects: info.categories?.slice(0, 10),
        language: info.language,
        source: "google",
        sourceUrl: info.infoLink || `https://books.google.com/books?id=${item.id}`,
      };
    });
}

async function searchGutendex(query: string, options: SearchOptions) {
  const params = new URLSearchParams({ search: query });
  const language = options.language || "both-es";
  if (language === "es" || language === "en") params.set("languages", language);
  const data = await fetchCatalogJson<{ results?: GutendexBook[] }>(`https://gutendex.com/books?${params.toString()}`, 12000);
  return (data.results || [])
    .filter((item) => item.id && item.title)
    .slice(0, options.limit || 24)
    .map((item): CatalogBook => {
      const authors = item.authors?.map((author) => author.name || "").filter(Boolean).slice(0, 3) || [];
      return {
        id: `gutenberg:${item.id}`,
        title: item.title || "Texto sin título",
        authors: authors.length ? authors : ["Autor no disponible"],
        remoteCoverUrl: secureImageUrl(item.formats?.["image/jpeg"]),
        description: item.summaries?.[0],
        subjects: [...(item.bookshelves || []), ...(item.subjects || [])].slice(0, 10),
        source: "gutendex",
        sourceUrl: `https://www.gutenberg.org/ebooks/${item.id}`,
        freeText: item.media_type === "Text",
        language: item.languages?.[0],
      };
    });
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, " ").trim();
}

function identityKey(book: CatalogBook) {
  const title = normalize(book.title)
    .replace(/\b(illustrated|abridged|unabridged|edition|edicion|ebook|paperback|hardcover)\b.*$/g, "")
    .trim();
  const author = normalize(book.authors[0] || "").replace(/^(autor no disponible|unknown author)$/, "");
  return `${title}|${author}`;
}

const SEARCH_STOP_WORDS = new Set(["a", "al", "an", "and", "de", "del", "el", "en", "la", "las", "los", "of", "the", "un", "una", "y"]);

function queryTokens(query: string) {
  return normalize(query)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !SEARCH_STOP_WORDS.has(token) && token !== "isbn");
}

function hasCover(book: CatalogBook) {
  return Boolean(book.coverId || book.remoteCoverUrl);
}

function hasDescription(book: CatalogBook) {
  return Boolean(book.description && book.description.trim().length >= 24);
}

function languageAffinity(book: CatalogBook, preference: CatalogLanguage) {
  if (!book.language) return 0;
  if (preference === "es" || preference === "en") return book.language === preference ? 10 : -20;
  const preferred = preference === "both-en" ? "en" : "es";
  return book.language === preferred ? 6 : book.language === "es" || book.language === "en" ? 3 : -4;
}

function polishResults(books: CatalogBook[], query: string, options: SearchOptions) {
  const quality = options.quality || "balanced";
  const language = options.language || "both-es";
  const tokens = queryTokens(query);
  const normalizedQuery = normalize(query.replace(/^isbn:/i, ""));
  const isIsbn = /^isbn:/i.test(query) || /^\d{9,13}[\dx]$/i.test(normalizedQuery.replace(/\s/g, ""));
  const seen = new Map<string, CatalogBook & { _score: number }>();

  books.forEach((book, sourceIndex) => {
    const title = normalize(book.title);
    const authors = normalize(book.authors.join(" "));
    const subjects = normalize((book.subjects || []).join(" "));
    const titleHits = tokens.filter((token) => title.includes(token)).length;
    const authorHits = tokens.filter((token) => authors.includes(token)).length;
    const subjectHits = tokens.filter((token) => subjects.includes(token)).length;
    const relevant = isIsbn || !tokens.length || titleHits > 0 || authorHits > 0 || subjectHits > 0;
    const cover = hasCover(book);
    const description = hasDescription(book);
    if (options.hideIncomplete && (!cover || !description)) return;
    if (quality === "strict" && ((!cover && !description) || !relevant)) return;
    if (quality === "balanced" && !relevant) return;
    if ((language === "es" || language === "en") && book.language && book.language !== language) return;
    if ((language === "both-es" || language === "both-en") && book.language && book.language !== "es" && book.language !== "en") return;

    let score = Math.max(0, 16 - sourceIndex * 0.08);
    if (title === normalizedQuery) score += 90;
    else if (normalizedQuery.length > 2 && title.includes(normalizedQuery)) score += 55;
    score += titleHits * 18 + authorHits * 13 + subjectHits * 4;
    if (tokens.length && titleHits === tokens.length) score += 20;
    if (relevant) score += 8;
    if (options.preferCovers !== false && cover) score += 18;
    if (options.preferDescriptions !== false && description) score += 14;
    if (book.pages) score += 2;
    if (book.editionCount && book.editionCount > 1) score += Math.min(5, Math.log2(book.editionCount));
    score += languageAffinity(book, language);
    const enriched = { ...book, _score: score };
    const key = identityKey(book);
    const previous = seen.get(key);
    if (!previous || previous._score < score) seen.set(key, enriched);
  });

  return [...seen.values()]
    .sort((a, b) => b._score - a._score)
    .slice(0, options.limit || 24)
    .map((entry) => {
      const book = { ...entry } as CatalogBook & { _score?: number };
      delete book._score;
      return book;
    });
}

function interleaveAndDedupe(groups: CatalogBook[][], limit: number) {
  const output: CatalogBook[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < longest && output.length < limit; index += 1) {
    for (const group of groups) {
      const book = group[index];
      if (!book) continue;
      const key = identityKey(book);
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(book);
      if (output.length >= limit) break;
    }
  }
  return output;
}

function withinTimeBudget<T>(promise: Promise<T>, milliseconds: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = globalThis.setTimeout(() => reject(new DOMException("La fuente tardó demasiado", "AbortError")), milliseconds);
    promise.then(
      (value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        globalThis.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function searchCatalog(provider: CatalogProvider, query: string, options: SearchOptions = {}) {
  if (provider === "openlibrary") return polishResults(await searchOpenLibrary(query, options), query, options);
  if (provider === "google") return polishResults(await searchGoogleBooks(query, options), query, options);
  if (provider === "gutendex") return polishResults(interleaveAndDedupe([await searchGutendex(query, options)], (options.limit || 24) * 2), query, options);

  const tasks = [searchOpenLibrary(query, options), searchGutendex(query, options)];
  if (options.googleApiKey?.trim()) tasks.push(searchGoogleBooks(query, options));
  const results = await Promise.allSettled(tasks.map((task) => withinTimeBudget(task, 5500)));
  const fulfilled = results.filter((result): result is PromiseFulfilledResult<CatalogBook[]> => result.status === "fulfilled");
  if (!fulfilled.length) throw results.find((result) => result.status === "rejected")?.reason || new Error("Ningún catálogo respondió");
  return polishResults(interleaveAndDedupe(fulfilled.map((result) => result.value), (options.limit || 24) * 2), query, options);
}

export async function measureCatalogProvider(provider: CatalogProvider, googleApiKey = "") {
  const started = performance.now();
  await searchCatalog(provider, "1984", { googleApiKey, limit: 1 });
  return Math.round(performance.now() - started);
}
