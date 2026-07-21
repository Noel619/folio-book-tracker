export type CatalogProvider = "openlibrary" | "google" | "gutendex" | "auto";
export type CatalogSource = "openlibrary" | "google" | "gutendex";

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
};

type SearchOptions = {
  googleApiKey?: string;
  includeSubjects?: boolean;
  limit?: number;
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
  const fields = ["key", "title", "author_name", "cover_i", "first_publish_year", "number_of_pages_median", "edition_count"];
  if (options.includeSubjects) fields.push("subject");
  const params = new URLSearchParams({
    q: query,
    fields: fields.join(","),
    limit: String(options.limit || 24),
    lang: "es",
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
        source: "openlibrary",
        sourceUrl: id.startsWith("/") ? `https://openlibrary.org${id}` : "https://openlibrary.org",
      };
    });
}

async function searchGoogleBooks(query: string, options: SearchOptions) {
  const key = options.googleApiKey?.trim();
  if (!key) throw new Error("Google Books necesita una clave API en Configuración");
  const params = new URLSearchParams({
    q: query,
    maxResults: String(Math.min(40, options.limit || 24)),
    printType: "books",
    orderBy: "relevance",
    key,
    fields: "items(id,volumeInfo(title,authors,publishedDate,description,pageCount,categories,infoLink,imageLinks)),totalItems",
  });
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
        source: "google",
        sourceUrl: info.infoLink || `https://books.google.com/books?id=${item.id}`,
      };
    });
}

async function searchGutendex(query: string, options: SearchOptions) {
  const params = new URLSearchParams({ search: query });
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
      };
    });
}

function identityKey(book: CatalogBook) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, " ").trim();
  return `${normalize(book.title)}|${normalize(book.authors[0] || "")}`;
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
  if (provider === "openlibrary") return searchOpenLibrary(query, options);
  if (provider === "google") return searchGoogleBooks(query, options);
  if (provider === "gutendex") return interleaveAndDedupe([await searchGutendex(query, options)], options.limit || 24);

  const tasks = [searchOpenLibrary(query, options), searchGutendex(query, options)];
  if (options.googleApiKey?.trim()) tasks.push(searchGoogleBooks(query, options));
  const results = await Promise.allSettled(tasks.map((task) => withinTimeBudget(task, 5500)));
  const fulfilled = results.filter((result): result is PromiseFulfilledResult<CatalogBook[]> => result.status === "fulfilled");
  if (!fulfilled.length) throw results.find((result) => result.status === "rejected")?.reason || new Error("Ningún catálogo respondió");
  return interleaveAndDedupe(fulfilled.map((result) => result.value), options.limit || 24);
}

export async function measureCatalogProvider(provider: CatalogProvider, googleApiKey = "") {
  const started = performance.now();
  await searchCatalog(provider, "1984", { googleApiKey, limit: 1 });
  return Math.round(performance.now() - started);
}
