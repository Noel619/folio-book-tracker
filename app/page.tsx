"use client";

import {
  ArrowDownToLine,
  BookCheck,
  BookHeart,
  BookOpen,
  BookPlus,
  BookX,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Compass,
  Download,
  Eye,
  FileImage,
  FileJson,
  Home,
  ImagePlus,
  Library,
  Link,
  LoaderCircle,
  Menu,
  Palette,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  type CoverAssetExport,
  deleteCoverAsset,
  exportCoverAssets,
  getCoverAsset,
  importCoverAssets,
  prepareCoverFile,
  putCoverAsset,
  validateImageUrl,
} from "./folio-storage";

type Status = "reading" | "read" | "wishlist" | "abandoned";
type View = "home" | "wishlist" | "abandoned" | "timeline" | "settings" | "search";
type FontChoice = "sans" | "serif" | "rounded";
type DensityChoice = "compact" | "comfortable" | "large";
type AccentChoice = "violet" | "sage" | "amber" | "blue" | "rose";
type ThemeChoice = "ink" | "graphite" | "oled" | "warm";
type RatingColorChoice = "neutral" | "yellow" | "accent";
type DetailModeChoice = "modal" | "page";
type MotionChoice = "off" | "subtle" | "fluid";
type TransitionChoice = "fade" | "slide" | "zoom";
type CardStyleChoice = "classic" | "flat" | "elevated";
type CornerChoice = "square" | "soft" | "rounded";
type CoverEffectChoice = "none" | "lift" | "glow";

type CoverOverride =
  | { kind: "openlibrary"; coverId: number }
  | { kind: "url"; url: string }
  | { kind: "local"; assetId: string; updatedAt: number };

type Book = {
  id: string;
  title: string;
  authors: string[];
  coverId?: number;
  publishedYear?: number;
  pages?: number;
  description?: string;
  subjects?: string[];
  editionCount?: number;
  status?: Status;
  rating?: number;
  readYear?: number;
  progress?: number;
  addedAt?: number;
  coverOverride?: CoverOverride;
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

type AppSettings = {
  font: FontChoice;
  density: DensityChoice;
  accent: AccentChoice;
  theme: ThemeChoice;
  ratingColor: RatingColorChoice;
  detailMode: DetailModeChoice;
  motion: MotionChoice;
  transition: TransitionChoice;
  cardStyle: CardStyleChoice;
  corners: CornerChoice;
  coverEffect: CoverEffectChoice;
};

const DEFAULT_SETTINGS: AppSettings = {
  font: "sans",
  density: "comfortable",
  accent: "violet",
  theme: "ink",
  ratingColor: "neutral",
  detailMode: "modal",
  motion: "subtle",
  transition: "zoom",
  cardStyle: "classic",
  corners: "soft",
  coverEffect: "lift",
};

const SEED_LIBRARY: Book[] = [
  {
    id: "/works/OL274505W",
    title: "Cien años de soledad",
    authors: ["Gabriel García Márquez"],
    coverId: 12627383,
    publishedYear: 1967,
    pages: 471,
    description:
      "La historia de la familia Buendía a lo largo de siete generaciones en el pueblo imaginario de Macondo.",
    subjects: ["Realismo mágico", "Familias", "América Latina"],
    status: "reading",
    progress: 68,
    addedAt: 6,
  },
  {
    id: "/works/OL278437W",
    title: "La sombra del viento",
    authors: ["Carlos Ruiz Zafón"],
    coverId: 10107644,
    publishedYear: 2001,
    pages: 576,
    description:
      "Un joven descubre un libro maldito en el Cementerio de los Libros Olvidados y queda atrapado en su misterio.",
    subjects: ["Misterio", "Barcelona", "Ficción histórica"],
    status: "reading",
    progress: 31,
    addedAt: 5,
  },
  {
    id: "/works/OL8996439W",
    title: "El nombre de la rosa",
    authors: ["Umberto Eco"],
    coverId: 8598263,
    publishedYear: 1980,
    pages: 592,
    description:
      "Guillermo de Baskerville investiga una serie de muertes en una abadía benedictina medieval.",
    subjects: ["Misterio", "Historia", "Filosofía"],
    status: "read",
    rating: 92,
    readYear: 2026,
    addedAt: 4,
  },
  {
    id: "/works/OL1168083W",
    title: "1984",
    authors: ["George Orwell"],
    coverId: 9267242,
    publishedYear: 1949,
    pages: 328,
    description:
      "Winston Smith intenta conservar su libertad interior bajo la mirada constante del Gran Hermano.",
    subjects: ["Distopía", "Política", "Clásicos"],
    status: "read",
    rating: 96,
    readYear: 2025,
    addedAt: 3,
  },
  {
    id: "/works/OL14860424W",
    title: "Rayuela",
    authors: ["Julio Cortázar"],
    coverId: 1047466,
    publishedYear: 1963,
    pages: 736,
    description:
      "Una novela abierta que invita a recorrer de distintas formas la historia de Horacio Oliveira y la Maga.",
    subjects: ["Literatura argentina", "Novela experimental"],
    status: "wishlist",
    addedAt: 2,
  },
  {
    id: "/works/OL110969W",
    title: "El Aleph",
    authors: ["Jorge Luis Borges"],
    coverId: 14408958,
    publishedYear: 1949,
    pages: 224,
    description:
      "Una colección de relatos que explora el infinito, los laberintos, la identidad y la memoria.",
    subjects: ["Cuentos", "Fantasía", "Literatura argentina"],
    status: "read",
    rating: 89,
    readYear: 2024,
    addedAt: 1,
  },
];

const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "wishlist", label: "Por leer", icon: Compass },
  { id: "abandoned", label: "Abandonados", icon: BookX },
  { id: "timeline", label: "Cronograma", icon: CalendarDays },
  { id: "settings", label: "Configuración", icon: Settings },
];

const viewTitles: Record<View, { eyebrow: string; title: string }> = {
  home: { eyebrow: "Tu biblioteca", title: "Buenas lecturas" },
  wishlist: { eyebrow: "Próximas historias", title: "Por leer" },
  abandoned: { eyebrow: "También cuentan", title: "Libros abandonados" },
  timeline: { eyebrow: "Tu historia lectora", title: "Cronograma" },
  settings: { eyebrow: "A tu manera", title: "Configuración" },
  search: { eyebrow: "Catálogo abierto", title: "Resultados" },
};

const statusLabels: Record<Status, string> = {
  reading: "Leyendo",
  read: "Leído",
  wishlist: "Por leer",
  abandoned: "Abandonado",
};

const GRID_PAGE_SIZE = 24;
const READING_PAGE_SIZE = 12;
const TIMELINE_PAGE_SIZE = 100;
const SEARCH_CACHE = new Map<string, Book[]>();
const DETAIL_CACHE = new Map<string, Partial<Book>>();
const COVER_SUGGESTION_CACHE = new Map<string, number[]>();
const LOCAL_COVER_URL_CACHE = new Map<string, string>();
const LOCAL_COVER_PROMISE_CACHE = new Map<string, Promise<string>>();

async function fetchJson(url: string, timeout = 9000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "force-cache" });
    if (!response.ok) throw new Error("La fuente de libros no respondió");
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

function coverUrl(coverId?: number, size: "S" | "M" | "L" = "M") {
  return coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`
    : "";
}

function bookDetailHash(bookId: string) {
  return `#/book/${encodeURIComponent(bookId)}`;
}

function bookIdFromHash(hash: string) {
  const match = hash.match(/^#\/book\/(.+)$/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

function loadLocalCoverUrl(assetId: string) {
  const cached = LOCAL_COVER_URL_CACHE.get(assetId);
  if (cached) return Promise.resolve(cached);
  const pending = LOCAL_COVER_PROMISE_CACHE.get(assetId);
  if (pending) return pending;
  const promise = getCoverAsset(assetId)
    .then((blob) => {
      if (!blob) return "";
      const url = URL.createObjectURL(blob);
      LOCAL_COVER_URL_CACHE.set(assetId, url);
      return url;
    })
    .finally(() => LOCAL_COVER_PROMISE_CACHE.delete(assetId));
  LOCAL_COVER_PROMISE_CACHE.set(assetId, promise);
  return promise;
}

function invalidateLocalCoverUrl(assetId: string) {
  const cached = LOCAL_COVER_URL_CACHE.get(assetId);
  if (cached) URL.revokeObjectURL(cached);
  LOCAL_COVER_URL_CACHE.delete(assetId);
  LOCAL_COVER_PROMISE_CACHE.delete(assetId);
}

function useBookCoverSource(book: Book, size: "S" | "M" | "L") {
  const override = book.coverOverride;
  const localAssetKey = override?.kind === "local" ? `${override.assetId}:${override.updatedAt}` : "";
  const [loadedLocal, setLoadedLocal] = useState<{ key: string; url: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (override?.kind !== "local") return;
    loadLocalCoverUrl(override.assetId).then((url) => {
      if (active) setLoadedLocal({ key: localAssetKey, url });
    }).catch(() => {
      if (active) setLoadedLocal({ key: localAssetKey, url: "" });
    });
    return () => {
      active = false;
    };
  }, [localAssetKey, override]);

  if (override?.kind === "openlibrary") return coverUrl(override.coverId, size);
  if (override?.kind === "url") return override.url;
  if (override?.kind === "local" && loadedLocal?.key === localAssetKey && loadedLocal.url) return loadedLocal.url;
  return coverUrl(book.coverId, size);
}

function BookCover({
  book,
  className = "",
  size = "M",
  priority = false,
}: {
  book: Book;
  className?: string;
  size?: "S" | "M" | "L";
  priority?: boolean;
}) {
  const [failedSource, setFailedSource] = useState("");
  const source = useBookCoverSource(book, size);
  const initials = book.title
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0])
    .join("");

  if (!source || failedSource === source) {
    return (
      <div className={`book-cover cover-fallback ${className}`} aria-label={`Portada de ${book.title}`}>
        <span>{initials}</span>
        <small>{book.authors[0] || "Autor desconocido"}</small>
      </div>
    );
  }

  return (
    // Open Library serves dynamic cover URLs, so a plain image keeps the app key-free and local.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`book-cover ${className}`}
      src={source}
      alt={`Portada de ${book.title}`}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      onError={() => setFailedSource(source)}
    />
  );
}

function BookCoverGlow({ book }: { book: Book }) {
  const source = useBookCoverSource(book, "M");
  if (!source) return null;
  return <div className="modal-cover-glow" style={{ backgroundImage: `url(${source})` }} aria-hidden="true" />;
}

function EmptyState({ icon: Icon, title, copy }: { icon: typeof BookOpen; title: string; copy: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={26} /></span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [library, setLibrary] = useState<Book[]>(SEED_LIBRARY);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editMode, setEditMode] = useState<"read" | "reading" | null>(null);
  const [scoreDraft, setScoreDraft] = useState(80);
  const [yearDraft, setYearDraft] = useState(new Date().getFullYear());
  const [progressDraft, setProgressDraft] = useState(0);
  const [timelineYear, setTimelineYear] = useState<number | "all">("all");
  const [timelineLimit, setTimelineLimit] = useState(TIMELINE_PAGE_SIZE);
  const [gridLimits, setGridLimits] = useState<Record<string, number>>({});
  const [toast, setToast] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
  const [coverSuggestions, setCoverSuggestions] = useState<number[]>([]);
  const [coverSuggestionsLoading, setCoverSuggestionsLoading] = useState(false);
  const [coverUrlDraft, setCoverUrlDraft] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [exporting, setExporting] = useState(false);
  const statusEditorRef = useRef<HTMLDivElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const detailTriggerRef = useRef<HTMLElement | null>(null);
  const historyInitializedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedLibrary = window.localStorage.getItem("folio-library-v1");
        const storedSettings = window.localStorage.getItem("folio-settings-v1");
        if (storedLibrary) setLibrary(JSON.parse(storedLibrary));
        if (storedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
      } catch {
        // A malformed backup should never prevent the app from opening.
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem("folio-library-v1", JSON.stringify(library));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [library, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem("folio-settings-v1", JSON.stringify(settings));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [settings, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !selectedBook) return;
      if (coverEditorOpen) {
        setCoverEditorOpen(false);
        setCoverError("");
      } else {
        setEditMode(null);
        if (settings.detailMode === "page" && bookIdFromHash(window.location.hash)) {
          if (window.history.state?.folioDetail) {
            window.history.back();
            return;
          }
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        }
        setSelectedBook(null);
        window.requestAnimationFrame(() => detailTriggerRef.current?.focus());
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [coverEditorOpen, selectedBook, settings.detailMode]);

  useEffect(() => () => {
    LOCAL_COVER_URL_CACHE.forEach((url) => URL.revokeObjectURL(url));
    LOCAL_COVER_URL_CACHE.clear();
  }, []);

  const reading = useMemo(() => library.filter((book) => book.status === "reading"), [library]);
  const read = useMemo(
    () => library.filter((book) => book.status === "read").sort((a, b) => (b.readYear || 0) - (a.readYear || 0)),
    [library],
  );
  const wishlist = useMemo(() => library.filter((book) => book.status === "wishlist"), [library]);
  const abandoned = useMemo(() => library.filter((book) => book.status === "abandoned"), [library]);
  const statusById = useMemo(
    () => new Map(library.map((book) => [book.id, book.status] as const)),
    [library],
  );
  const averageRating = read.length
    ? Math.round(read.reduce((sum, book) => sum + (book.rating || 0), 0) / read.length)
    : 0;
  const timelineYears = useMemo(
    () => Array.from(new Set(read.map((book) => book.readYear).filter(Boolean) as number[])).sort((a, b) => b - a),
    [read],
  );
  const timelineYearCounts = useMemo(() => {
    const counts = new Map<number, number>();
    read.forEach((book) => {
      if (book.readYear) counts.set(book.readYear, (counts.get(book.readYear) || 0) + 1);
    });
    return counts;
  }, [read]);

  useEffect(() => {
    function syncDetailFromHistory() {
      if (settings.detailMode !== "page") return;
      const bookId = bookIdFromHash(window.location.hash);
      if (!bookId) {
        setSelectedBook(null);
        setEditMode(null);
        setCoverEditorOpen(false);
        window.requestAnimationFrame(() => detailTriggerRef.current?.focus());
        return;
      }
      const stateBook = window.history.state?.folioBook as Book | undefined;
      const candidate = library.find((book) => book.id === bookId)
        || searchResults.find((book) => book.id === bookId)
        || (stateBook?.id === bookId ? stateBook : undefined);
      if (candidate) {
        void openBook(candidate, false);
      } else {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        setSelectedBook(null);
        setView("home");
        notify("Ese libro ya no está disponible en esta sesión");
      }
    }

    window.addEventListener("popstate", syncDetailFromHistory);
    if (hydrated && !historyInitializedRef.current) {
      historyInitializedRef.current = true;
      syncDetailFromHistory();
    }
    return () => window.removeEventListener("popstate", syncDetailFromHistory);
    // openBook intentionally stays outside the dependency list so book metadata updates do not reopen the detail.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, library, searchResults, settings.detailMode]);

  function navigate(nextView: View) {
    setSelectedBook(null);
    setEditMode(null);
    setCoverEditorOpen(false);
    if (bookIdFromHash(window.location.hash)) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    setView(nextView);
    setMobileNavOpen(false);
    if (nextView !== "search") {
      setActiveQuery("");
      setSearchResults([]);
      setSearchError("");
    }
  }

  function notify(message: string) {
    setToast(message);
  }

  function closeBookDetail() {
    setEditMode(null);
    setCoverEditorOpen(false);
    setCoverError("");
    if (settings.detailMode === "page" && bookIdFromHash(window.location.hash)) {
      if (window.history.state?.folioDetail) {
        window.history.back();
        return;
      }
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    setSelectedBook(null);
    window.requestAnimationFrame(() => detailTriggerRef.current?.focus());
  }

  function beginEdit(mode: "read" | "reading") {
    if (!selectedBook) return;
    if (mode === "read") {
      setScoreDraft(selectedBook.rating ?? 80);
      setYearDraft(selectedBook.readYear ?? new Date().getFullYear());
    } else {
      setProgressDraft(selectedBook.progress ?? 0);
    }
    setEditMode(mode);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        statusEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }

  async function openBook(book: Book, pushHistory = true) {
    const saved = library.find((item) => item.id === book.id);
    const merged = saved ? { ...book, ...saved } : book;
    if (pushHistory) detailTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedBook(merged);
    setScoreDraft(merged.rating ?? 80);
    setYearDraft(merged.readYear ?? new Date().getFullYear());
    setProgressDraft(merged.progress ?? 0);
    setEditMode(null);
    setCoverEditorOpen(false);
    setCoverError("");
    if (settings.detailMode === "page" && pushHistory) {
      const hash = bookDetailHash(merged.id);
      if (window.location.hash !== hash) {
        window.history.pushState({ folioDetail: true, folioBook: merged }, "", hash);
      }
      window.requestAnimationFrame(() => detailHeadingRef.current?.focus());
    }

    if (merged.description || !merged.id.startsWith("/works/")) return;
    const cachedDetail = DETAIL_CACHE.get(merged.id);
    if (cachedDetail) {
      setSelectedBook({ ...merged, ...cachedDetail });
      return;
    }
    setDetailLoading(true);
    try {
      const data = await fetchJson(`https://openlibrary.org${merged.id}.json`);
      const description =
        typeof data.description === "string"
          ? data.description
          : typeof data.description?.value === "string"
            ? data.description.value
            : undefined;
      const detailed: Book = {
        ...merged,
        description,
        subjects: Array.isArray(data.subjects) ? data.subjects.slice(0, 8) : merged.subjects,
      };
      DETAIL_CACHE.set(merged.id, {
        description: detailed.description,
        subjects: detailed.subjects,
      });
      setSelectedBook(detailed);
    } catch {
      // Search metadata is still enough to use every tracker action.
    } finally {
      setDetailLoading(false);
    }
  }

  function selectedCoverId(book: Book) {
    return book.coverOverride?.kind === "openlibrary" ? book.coverOverride.coverId : book.coverId;
  }

  async function fetchCoverSuggestions(book: Book) {
    const cached = COVER_SUGGESTION_CACHE.get(book.id);
    if (cached) return cached;

    const candidates: number[] = [];
    const append = (values: unknown) => {
      if (!Array.isArray(values)) return;
      values.forEach((value) => {
        if (Number.isInteger(value) && Number(value) > 0) candidates.push(Number(value));
      });
    };

    let workId = book.id.startsWith("/works/") ? book.id : "";
    if (!workId) {
      try {
        const params = new URLSearchParams({
          title: book.title,
          author: book.authors[0] || "",
          fields: "key,cover_i",
          limit: "3",
        });
        const searchData = await fetchJson(`https://openlibrary.org/search.json?${params.toString()}`);
        const match = Array.isArray(searchData.docs) ? searchData.docs.find((doc: OpenLibraryDoc) => doc.key?.startsWith("/works/")) : undefined;
        workId = match?.key || "";
        if (match?.cover_i) candidates.push(match.cover_i);
      } catch {
        // The editor can still use a file or a URL without catalogue suggestions.
      }
    }

    if (workId) {
      try {
        const workData = await fetchJson(`https://openlibrary.org${workId}.json`);
        append(workData.covers);
      } catch {
        // Editions below provide a second source for the same work.
      }
      if (new Set(candidates).size < 7) {
        try {
          const editionData = await fetchJson(`https://openlibrary.org${workId}/editions.json?limit=50`);
          if (Array.isArray(editionData.entries)) editionData.entries.forEach((edition: { covers?: number[] }) => append(edition.covers));
        } catch {
          // Suggestions are optional and should never block the editor.
        }
      }
    }

    if (book.coverId) candidates.unshift(book.coverId);
    const unique = Array.from(new Set(candidates)).slice(0, 24);
    COVER_SUGGESTION_CACHE.set(book.id, unique);
    return unique;
  }

  async function openCoverEditor() {
    if (!selectedBook || !library.some((book) => book.id === selectedBook.id)) return;
    setCoverEditorOpen(true);
    setCoverUrlDraft("");
    setCoverError("");
    setCoverSuggestionsLoading(true);
    try {
      const activeId = selectedCoverId(selectedBook);
      const suggestions = await fetchCoverSuggestions(selectedBook);
      setCoverSuggestions(suggestions.filter((coverId) => coverId !== activeId).slice(0, 6));
    } finally {
      setCoverSuggestionsLoading(false);
    }
  }

  function commitCoverOverride(coverOverride?: CoverOverride) {
    if (!selectedBook) return;
    const updatedSelected = { ...selectedBook, coverOverride };
    setLibrary((current) => current.map((book) => book.id === selectedBook.id ? { ...book, coverOverride } : book));
    setSelectedBook(updatedSelected);
    setCoverEditorOpen(false);
    setCoverError("");
    notify(coverOverride ? "Portada actualizada" : "Portada original restaurada");
  }

  async function removePreviousLocalCover(nextKind?: CoverOverride["kind"]) {
    if (selectedBook?.coverOverride?.kind !== "local" || nextKind === "local") return;
    const assetId = selectedBook.coverOverride.assetId;
    invalidateLocalCoverUrl(assetId);
    await deleteCoverAsset(assetId).catch(() => undefined);
  }

  async function chooseSuggestedCover(coverId: number) {
    if (!selectedBook || coverBusy) return;
    setCoverBusy(true);
    await removePreviousLocalCover("openlibrary");
    commitCoverOverride({ kind: "openlibrary", coverId });
    setCoverBusy(false);
  }

  async function useCoverUrl() {
    const value = coverUrlDraft.trim();
    if (!selectedBook || coverBusy) return;
    setCoverBusy(true);
    setCoverError("");
    try {
      await validateImageUrl(value);
      await removePreviousLocalCover("url");
      commitCoverOverride({ kind: "url", url: value });
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : "No se pudo usar ese enlace");
    } finally {
      setCoverBusy(false);
    }
  }

  async function useCoverFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!selectedBook || !file || coverBusy) return;
    setCoverBusy(true);
    setCoverError("");
    const assetId = selectedBook.id;
    try {
      const blob = await prepareCoverFile(file);
      const updatedAt = Date.now();
      await putCoverAsset(assetId, blob, updatedAt);
      invalidateLocalCoverUrl(assetId);
      commitCoverOverride({ kind: "local", assetId, updatedAt });
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : "No se pudo guardar la portada");
    } finally {
      setCoverBusy(false);
    }
  }

  async function restoreOriginalCover() {
    if (!selectedBook || coverBusy) return;
    setCoverBusy(true);
    await removePreviousLocalCover();
    commitCoverOverride(undefined);
    setCoverBusy(false);
  }

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = searchInput.trim();
    if (!raw) return;

    setView("search");
    setActiveQuery(raw);
    const cacheKey = raw.toLocaleLowerCase("es");
    const cachedResults = SEARCH_CACHE.get(cacheKey);
    if (cachedResults) {
      setSearchResults(cachedResults);
      setSearchError("");
      setSearching(false);
      return;
    }
    setSearchResults([]);
    setSearchError("");
    setSearching(true);

    try {
      const workMatch = raw.match(/openlibrary\.org\/(works\/OL\d+W)/i);
      if (workMatch) {
        const id = `/${workMatch[1]}`;
        const data = await fetchJson(`https://openlibrary.org${id}.json`);
        const linkedBook: Book = {
          id,
          title: data.title || "Libro sin título",
          authors: ["Autor no disponible"],
          coverId: Array.isArray(data.covers) ? data.covers[0] : undefined,
          description:
            typeof data.description === "string" ? data.description : data.description?.value,
          subjects: Array.isArray(data.subjects) ? data.subjects.slice(0, 8) : [],
        };
        SEARCH_CACHE.set(cacheKey, [linkedBook]);
        setSearchResults([linkedBook]);
        await openBook(linkedBook);
        return;
      }

      const normalizedIsbn = raw.replace(/[\s-]/g, "");
      const query = /^(97[89])?\d{9}[\dX]$/i.test(normalizedIsbn) ? `isbn:${normalizedIsbn}` : raw;
      const params = new URLSearchParams({
        q: query,
        fields: "key,title,author_name,cover_i,first_publish_year,number_of_pages_median,edition_count",
        limit: "24",
        lang: "es",
      });
      const data = await fetchJson(`https://openlibrary.org/search.json?${params.toString()}`);
      const books = (data.docs || [])
        .filter((doc: OpenLibraryDoc) => doc.key && doc.title)
        .map((doc: OpenLibraryDoc): Book => ({
          id: doc.key as string,
          title: doc.title as string,
          authors: doc.author_name?.slice(0, 3) || ["Autor no disponible"],
          coverId: doc.cover_i,
          publishedYear: doc.first_publish_year,
          pages: doc.number_of_pages_median,
          editionCount: doc.edition_count,
        }));
      SEARCH_CACHE.set(cacheKey, books);
      setSearchResults(books);
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      setSearchError(timedOut ? "La búsqueda tardó demasiado" : error instanceof Error ? error.message : "No pudimos completar la búsqueda");
    } finally {
      setSearching(false);
    }
  }

  function saveStatus(status: Status, patch: Partial<Book> = {}) {
    if (!selectedBook) return;
    const saved: Book = {
      ...selectedBook,
      ...patch,
      status,
      addedAt: selectedBook.addedAt ?? Date.now(),
    };
    setLibrary((current) => {
      const exists = current.some((book) => book.id === saved.id);
      return exists ? current.map((book) => (book.id === saved.id ? saved : book)) : [saved, ...current];
    });
    setSelectedBook(saved);
    setEditMode(null);
    notify(`${saved.title} · ${statusLabels[status]}`);
  }

  async function removeSelectedBook() {
    if (!selectedBook) return;
    if (selectedBook.coverOverride?.kind === "local") {
      invalidateLocalCoverUrl(selectedBook.coverOverride.assetId);
      await deleteCoverAsset(selectedBook.coverOverride.assetId).catch(() => undefined);
    }
    setLibrary((current) => current.filter((book) => book.id !== selectedBook.id));
    notify(`${selectedBook.title} se quitó de tu biblioteca`);
    closeBookDetail();
  }

  function downloadFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function exportJson() {
    if (exporting) return;
    setExporting(true);
    try {
      const localBookIds = library
        .filter((book) => book.coverOverride?.kind === "local")
        .map((book) => book.id);
      const coverAssets = localBookIds.length ? await exportCoverAssets(localBookIds) : [];
      downloadFile(
        `folio-biblioteca-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), settings, books: library, coverAssets }, null, 2),
        "application/json",
      );
      notify("Copia completa exportada");
    } catch {
      notify("No pudimos incluir las portadas en la copia");
    } finally {
      setExporting(false);
    }
  }

  function exportCsv() {
    const headers = ["Título", "Autor", "Estado", "Año de lectura", "Nota", "Progreso", "Publicación"];
    const rows = library.map((book) => [
      book.title,
      book.authors.join(", "),
      book.status ? statusLabels[book.status] : "",
      book.readYear ?? "",
      book.rating ?? "",
      book.progress ?? "",
      book.publishedYear ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    downloadFile(`folio-biblioteca-${new Date().toISOString().slice(0, 10)}.csv`, `\ufeff${csv}`, "text/csv");
    notify("Lista CSV exportada");
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const books = Array.isArray(parsed) ? parsed : parsed.books;
      if (!Array.isArray(books)) throw new Error("Formato no válido");
      const assets = Array.isArray(parsed.coverAssets) ? parsed.coverAssets as CoverAssetExport[] : null;
      if (assets) {
        await importCoverAssets(assets);
        LOCAL_COVER_URL_CACHE.forEach((url) => URL.revokeObjectURL(url));
        LOCAL_COVER_URL_CACHE.clear();
      }
      setLibrary(books);
      if (parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
      notify(`${books.length} libros importados`);
    } catch {
      notify("No pudimos leer esa copia de seguridad");
    }
  }

  function renderBookGrid(
    books: Book[],
    empty: { title: string; copy: string },
    resultGrid = false,
    gridKey = "default",
  ) {
    if (!books.length) return <EmptyState icon={resultGrid ? Search : BookOpen} {...empty} />;
    const limit = gridLimits[gridKey] ?? GRID_PAGE_SIZE;
    const visibleBooks = books.slice(0, limit);
    return (
      <>
        <div className={resultGrid ? "search-grid" : "book-grid"}>
          {visibleBooks.map((book) => {
            const savedStatus = statusById.get(book.id);
            return (
              <button className="book-card" key={book.id} onClick={() => openBook(book)} aria-label={`Abrir ${book.title}`}>
                <div className="cover-shell">
                  <BookCover book={book} size="M" />
                  {savedStatus && (
                    <span className={`status-badge status-${savedStatus}`}>
                      {savedStatus === "read" ? <Check size={12} /> : savedStatus === "reading" ? <BookOpen size={12} /> : savedStatus === "abandoned" ? <X size={12} /> : <BookHeart size={12} />}
                    </span>
                  )}
                  {book.rating !== undefined && <span className="score-badge">{book.rating}</span>}
                </div>
                <span className="book-card-title">{book.title}</span>
                <span className="book-card-author">{book.authors[0]}</span>
                {resultGrid && (
                  <span className="book-card-meta">
                    {book.publishedYear || "Año desconocido"}
                    {book.editionCount ? ` · ${book.editionCount} ediciones` : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {visibleBooks.length < books.length && (
          <button
            className="load-more"
            onClick={() => setGridLimits((current) => ({ ...current, [gridKey]: limit + GRID_PAGE_SIZE }))}
          >
            Mostrar {Math.min(GRID_PAGE_SIZE, books.length - visibleBooks.length)} más
            <span>{visibleBooks.length.toLocaleString("es")} de {books.length.toLocaleString("es")}</span>
          </button>
        )}
      </>
    );
  }

  function renderHome() {
    const readingLimit = gridLimits.reading ?? READING_PAGE_SIZE;
    const visibleReading = reading.slice(0, readingLimit);
    return (
      <>
        <section className="content-section">
          <div className="section-heading">
            <div><span className="section-index">01</span><h2>Seguir leyendo</h2></div>
            <span className="section-count">{reading.length} {reading.length === 1 ? "libro" : "libros"}</span>
          </div>
          {reading.length ? (
            <>
              <div className="reading-row">
                {visibleReading.map((book, index) => (
                  <button className="reading-card" key={book.id} onClick={() => openBook(book)}>
                    <BookCover book={book} size="M" priority={index < 3} />
                    <div className="reading-card-copy">
                      <span className="reading-label"><BookOpen size={13} /> En curso</span>
                      <h3>{book.title}</h3>
                      <p>{book.authors[0]}</p>
                      <div className="progress-copy"><span>{book.progress || 0}% completado</span><ChevronRight size={15} /></div>
                      <div className="progress-track"><span style={{ width: `${book.progress || 0}%` }} /></div>
                    </div>
                  </button>
                ))}
              </div>
              {visibleReading.length < reading.length && (
                <button className="load-more" onClick={() => setGridLimits((current) => ({ ...current, reading: readingLimit + READING_PAGE_SIZE }))}>
                  Mostrar más lecturas en curso
                  <span>{visibleReading.length.toLocaleString("es")} de {reading.length.toLocaleString("es")}</span>
                </button>
              )}
            </>
          ) : (
            <EmptyState icon={BookOpen} title="Ningún libro en curso" copy="Busca un libro y márcalo como “Leyendo ahora”." />
          )}
        </section>

        <section className="content-section read-section">
          <div className="section-heading">
            <div><span className="section-index">02</span><h2>Libros leídos</h2></div>
            <button className="text-button" onClick={() => navigate("timeline")}>Ver cronograma <ChevronRight size={15} /></button>
          </div>
          {renderBookGrid(read, { title: "Tu estante está esperando", copy: "Los libros que marques como leídos aparecerán aquí." }, false, "home-read")}
        </section>
      </>
    );
  }

  function renderTimeline() {
    const filteredTimelineBooks = timelineYear === "all" ? read : read.filter((book) => book.readYear === timelineYear);
    const visibleTimelineBooks = filteredTimelineBooks.slice(0, timelineLimit);
    const visibleYears = Array.from(new Set(visibleTimelineBooks.map((book) => book.readYear).filter(Boolean) as number[]));
    return (
      <section className="timeline-page">
        <div className="timeline-summary">
          <div><span>Total de lecturas</span><strong>{read.length.toString().padStart(2, "0")}</strong></div>
          <div><span>Nota media</span><strong>{averageRating || "—"}<small>/100</small></strong></div>
          <div><span>Años registrados</span><strong>{timelineYears.length.toString().padStart(2, "0")}</strong></div>
        </div>
        <div className="year-filter" aria-label="Filtrar por año">
          <button className={timelineYear === "all" ? "active" : ""} onClick={() => { setTimelineYear("all"); setTimelineLimit(TIMELINE_PAGE_SIZE); }}>Todos</button>
          {timelineYears.map((year) => <button className={timelineYear === year ? "active" : ""} key={year} onClick={() => { setTimelineYear(year); setTimelineLimit(TIMELINE_PAGE_SIZE); }}>{year}</button>)}
        </div>
        {visibleYears.length ? visibleYears.map((year) => {
          const yearBooks = visibleTimelineBooks.filter((book) => book.readYear === year);
          const totalYearBooks = timelineYearCounts.get(year) || yearBooks.length;
          return (
            <div className="timeline-year" key={year}>
              <div className="year-marker"><strong>{year}</strong><span>{totalYearBooks.toLocaleString("es")} {totalYearBooks === 1 ? "lectura" : "lecturas"}</span></div>
              <div className="timeline-list">
                {yearBooks.map((book, index) => (
                  <button className="timeline-book" key={book.id} onClick={() => openBook(book)}>
                    <span className="timeline-number">{String(index + 1).padStart(2, "0")}</span>
                    <BookCover book={book} size="S" />
                    <span className="timeline-info"><strong>{book.title}</strong><small>{book.authors[0]} · {book.publishedYear || "s. f."}</small></span>
                    <span className="timeline-score">{book.rating ?? "—"}<small>/100</small></span>
                    <ChevronRight size={17} />
                  </button>
                ))}
              </div>
            </div>
          );
        }) : <EmptyState icon={CalendarDays} title="Sin años registrados" copy="Al marcar un libro como leído podrás indicar el año y tu nota." />}
        {visibleTimelineBooks.length < filteredTimelineBooks.length && (
          <button className="load-more timeline-load-more" onClick={() => setTimelineLimit((current) => current + TIMELINE_PAGE_SIZE)}>
            Mostrar {Math.min(TIMELINE_PAGE_SIZE, filteredTimelineBooks.length - visibleTimelineBooks.length)} lecturas más
            <span>{visibleTimelineBooks.length.toLocaleString("es")} de {filteredTimelineBooks.length.toLocaleString("es")}</span>
          </button>
        )}
      </section>
    );
  }

  function renderSettings() {
    return (
      <div className="settings-grid">
        <section className="settings-card settings-appearance">
          <div className="settings-card-heading"><span><Palette size={19} /></span><div><h2>Apariencia</h2><p>Combina temas, tipografías y color sin perder la identidad de Folio.</p></div></div>
          <div className="setting-row">
            <div><strong>Tema</strong><span>Elige la temperatura general de la interfaz.</span></div>
            <div className="segmented-control wide-control">
              {(["ink", "graphite", "oled", "warm"] as ThemeChoice[]).map((theme) => (
                <button className={settings.theme === theme ? "active" : ""} key={theme} onClick={() => setSettings({ ...settings, theme })}>
                  {theme === "ink" ? "Tinta" : theme === "graphite" ? "Grafito" : theme === "oled" ? "OLED" : "Cálido"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Tipografía</strong><span>Elige el carácter de la interfaz.</span></div>
            <div className="segmented-control">
              <button className={settings.font === "sans" ? "active" : ""} onClick={() => setSettings({ ...settings, font: "sans" })}>Moderna</button>
              <button className={settings.font === "serif" ? "active" : ""} onClick={() => setSettings({ ...settings, font: "serif" })}>Editorial</button>
              <button className={settings.font === "rounded" ? "active" : ""} onClick={() => setSettings({ ...settings, font: "rounded" })}>Redonda</button>
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Tamaño</strong><span>Modifica texto y espacio entre elementos.</span></div>
            <div className="segmented-control">
              {(["compact", "comfortable", "large"] as DensityChoice[]).map((density) => (
                <button className={settings.density === density ? "active" : ""} key={density} onClick={() => setSettings({ ...settings, density })}>
                  {density === "compact" ? "S" : density === "comfortable" ? "M" : "L"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row accent-row">
            <div><strong>Color de acento</strong><span>Un detalle de color, nada más.</span></div>
            <div className="color-options">
              {(["violet", "sage", "amber", "blue", "rose"] as AccentChoice[]).map((accent) => (
                <button key={accent} className={`color-dot ${accent} ${settings.accent === accent ? "active" : ""}`} onClick={() => setSettings({ ...settings, accent })} aria-label={`Acento ${accent}`}>
                  {settings.accent === accent && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Color de la nota</strong><span>Se aplica a tarjetas, cronograma y editor.</span></div>
            <div className="segmented-control">
              {(["neutral", "yellow", "accent"] as RatingColorChoice[]).map((ratingColor) => (
                <button className={settings.ratingColor === ratingColor ? "active" : ""} key={ratingColor} onClick={() => setSettings({ ...settings, ratingColor })}>
                  {ratingColor === "neutral" ? "Neutra" : ratingColor === "yellow" ? "Amarilla" : "Acento"}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-card settings-behavior">
          <div className="settings-card-heading"><span><Sparkles size={19} /></span><div><h2>Comportamiento y movimiento</h2><p>Decide cómo se abren y reaccionan los elementos.</p></div></div>
          <div className="setting-row">
            <div><strong>Detalle del libro</strong><span>Ventana emergente o página con historial.</span></div>
            <div className="segmented-control">
              <button className={settings.detailMode === "modal" ? "active" : ""} onClick={() => setSettings({ ...settings, detailMode: "modal" })}>Modal</button>
              <button className={settings.detailMode === "page" ? "active" : ""} onClick={() => setSettings({ ...settings, detailMode: "page" })}>Página</button>
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Movimiento</strong><span>Controla la intensidad de todas las animaciones.</span></div>
            <div className="segmented-control">
              {(["off", "subtle", "fluid"] as MotionChoice[]).map((motion) => (
                <button className={settings.motion === motion ? "active" : ""} key={motion} onClick={() => setSettings({ ...settings, motion })}>
                  {motion === "off" ? "Nada" : motion === "subtle" ? "Sutil" : "Fluido"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Transición</strong><span>El efecto al abrir páginas y paneles.</span></div>
            <div className="segmented-control">
              {(["fade", "slide", "zoom"] as TransitionChoice[]).map((transition) => (
                <button className={settings.transition === transition ? "active" : ""} key={transition} onClick={() => setSettings({ ...settings, transition })}>
                  {transition === "fade" ? "Fundido" : transition === "slide" ? "Deslizar" : "Zoom"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Tarjetas</strong><span>Cambia profundidad, fondo y contorno.</span></div>
            <div className="segmented-control">
              {(["classic", "flat", "elevated"] as CardStyleChoice[]).map((cardStyle) => (
                <button className={settings.cardStyle === cardStyle ? "active" : ""} key={cardStyle} onClick={() => setSettings({ ...settings, cardStyle })}>
                  {cardStyle === "classic" ? "Clásico" : cardStyle === "flat" ? "Plano" : "Elevado"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Esquinas</strong><span>Desde geometría recta hasta formas suaves.</span></div>
            <div className="segmented-control">
              {(["square", "soft", "rounded"] as CornerChoice[]).map((corners) => (
                <button className={settings.corners === corners ? "active" : ""} key={corners} onClick={() => setSettings({ ...settings, corners })}>
                  {corners === "square" ? "Rectas" : corners === "soft" ? "Suaves" : "Redondas"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Efecto de portada</strong><span>Reacción visual al señalar un libro.</span></div>
            <div className="segmented-control">
              {(["none", "lift", "glow"] as CoverEffectChoice[]).map((coverEffect) => (
                <button className={settings.coverEffect === coverEffect ? "active" : ""} key={coverEffect} onClick={() => setSettings({ ...settings, coverEffect })}>
                  {coverEffect === "none" ? "Ninguno" : coverEffect === "lift" ? "Elevar" : "Brillo"}
                </button>
              ))}
            </div>
          </div>
          <button className="reset-settings" onClick={() => setSettings(DEFAULT_SETTINGS)}><RotateCcw size={16} /> Restablecer preferencias</button>
        </section>

        <section className="settings-card settings-data">
          <div className="settings-card-heading"><span><ArrowDownToLine size={19} /></span><div><h2>Tus datos</h2><p>Todo vive en este equipo. Guarda una copia cuando quieras.</p></div></div>
          <button className="data-action" onClick={exportJson} disabled={exporting}><span><FileJson size={20} /></span><div><strong>{exporting ? "Preparando copia…" : "Exportar copia completa"}</strong><small>Libros, portadas, notas, progreso y preferencias · JSON v2</small></div><Download size={18} /></button>
          <button className="data-action" onClick={exportCsv}><span><Library size={20} /></span><div><strong>Exportar lista</strong><small>Compatible con Excel y hojas de cálculo · CSV</small></div><Download size={18} /></button>
          <label className="data-action file-action"><span><Upload size={20} /></span><div><strong>Importar una copia</strong><small>Recupera una exportación anterior · JSON</small></div><ChevronRight size={18} /><input type="file" accept="application/json,.json" onChange={importJson} /></label>
        </section>

        <section className="settings-card settings-about">
          <div className="settings-card-heading"><span><CircleAlert size={19} /></span><div><h2>Acerca de Folio</h2><p>Un tracker privado y sin cuentas.</p></div></div>
          <div className="about-lines"><span>Catálogo de libros</span><strong>Open Library</strong><span>Almacenamiento</span><strong>Solo en este dispositivo</strong><span>Versión</span><strong>1.1</strong></div>
        </section>
      </div>
    );
  }

  function renderSearch() {
    return (
      <section className="search-page">
        <div className="search-summary">
          <p>{searching ? "Buscando en el catálogo…" : activeQuery ? `Coincidencias para “${activeQuery}”` : "Escribe un título, autor o ISBN"}</p>
          {!searching && activeQuery && <span>{searchResults.length} resultados</span>}
        </div>
        {searching && <div className="search-loading"><LoaderCircle className="spin" size={24} /><span>Revisando títulos, autores y ediciones</span></div>}
        {searchError && <EmptyState icon={CircleAlert} title="La búsqueda no respondió" copy={`${searchError}. Puedes intentarlo de nuevo en unos segundos.`} />}
        {!searching && !searchError && activeQuery && renderBookGrid(searchResults, { title: "Sin coincidencias", copy: "Prueba con el autor, el ISBN o una parte más corta del título." }, true, "search")}
        {!activeQuery && !searching && (
          <div className="search-tip"><Search size={22} /><div><strong>Una sola barra, varias formas de buscar</strong><p>Prueba con “Ursula K. Le Guin”, un ISBN o pega un enlace de Open Library.</p></div></div>
        )}
      </section>
    );
  }

  function renderView() {
    if (view === "home") return renderHome();
    if (view === "timeline") return renderTimeline();
    if (view === "settings") return renderSettings();
    if (view === "search") return renderSearch();
    if (view === "wishlist") return renderBookGrid(wishlist, { title: "Tu lista está vacía", copy: "Usa el icono de carpeta al descubrir un libro que quieras leer después." }, false, "wishlist");
    return renderBookGrid(abandoned, { title: "Ningún libro abandonado", copy: "Si un libro no era para este momento, puedes dejarlo aquí sin culpa." }, false, "abandoned");
  }

  const selectedSaved = selectedBook ? library.some((book) => book.id === selectedBook.id) : false;
  const currentTitle = viewTitles[view];

  function renderCoverEditor() {
    if (!selectedBook || !coverEditorOpen) return null;
    return (
      <div className="cover-editor" role="group" aria-label={`Cambiar portada de ${selectedBook.title}`} onDoubleClick={(event) => event.stopPropagation()}>
        <div className="cover-editor-heading">
          <span><ImagePlus size={17} /></span>
          <div><strong>Cambiar portada</strong><small>Archivo, enlace o una edición del catálogo.</small></div>
          <button onClick={() => { setCoverEditorOpen(false); setCoverError(""); }} aria-label="Cerrar editor de portada"><X size={16} /></button>
        </div>

        <div className="cover-source-actions">
          <button className="cover-file-action" onClick={() => coverFileRef.current?.click()} disabled={coverBusy}>
            <FileImage size={17} /><span><strong>Archivo local</strong><small>JPG, PNG, WebP · máximo 10 MB</small></span>
          </button>
          <input ref={coverFileRef} type="file" accept="image/*" onChange={useCoverFile} hidden />
          <div className="cover-link-action">
            <Link size={16} />
            <input value={coverUrlDraft} onChange={(event) => setCoverUrlDraft(event.target.value)} placeholder="https://…" aria-label="Enlace de la nueva portada" />
            <button onClick={useCoverUrl} disabled={coverBusy || !coverUrlDraft.trim()}>Usar</button>
          </div>
        </div>

        <div className="cover-suggestions-block">
          <div><strong>Sugerencias del mismo libro</strong><small>Portadas de otras ediciones en Open Library</small></div>
          {coverSuggestionsLoading ? (
            <span className="cover-suggestions-state"><LoaderCircle className="spin" size={15} /> Buscando ediciones…</span>
          ) : coverSuggestions.length ? (
            <div className="cover-suggestions">
              {coverSuggestions.map((coverId) => (
                <button key={coverId} onClick={() => chooseSuggestedCover(coverId)} disabled={coverBusy} aria-label="Usar esta portada sugerida">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverUrl(coverId, "M")} alt="Portada alternativa" loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
            <span className="cover-suggestions-state">No encontramos otras portadas para esta edición.</span>
          )}
        </div>

        {coverError && <p className="cover-error" role="alert">{coverError}</p>}
        {selectedBook.coverOverride && (
          <button className="restore-cover" onClick={restoreOriginalCover} disabled={coverBusy}><RotateCcw size={14} /> Restaurar portada original</button>
        )}
      </div>
    );
  }

  function renderBookDetail(surface: DetailModeChoice) {
    if (!selectedBook) return null;
    return (
      <article
        className={`book-detail book-detail-${surface} ${surface === "modal" ? "book-modal" : ""}`}
        role={surface === "modal" ? "dialog" : "region"}
        aria-modal={surface === "modal" ? true : undefined}
        aria-labelledby="book-detail-title"
      >
        <button className={surface === "modal" ? "modal-close" : "detail-page-back"} onClick={closeBookDetail} aria-label={surface === "modal" ? "Cerrar detalle" : "Volver a la biblioteca"}>
          {surface === "modal" ? <X size={20} /> : <><ChevronLeft size={17} /> Volver</>}
        </button>
        <div className="modal-visual detail-visual">
          <BookCoverGlow book={selectedBook} />
          <div
            className={`detail-cover-stage ${coverEditorOpen ? "editing" : ""}`}
            onDoubleClick={(event) => { event.preventDefault(); void openCoverEditor(); }}
            title={selectedSaved ? "Doble clic para cambiar la portada" : undefined}
          >
            <BookCover book={selectedBook} size="L" priority />
            {selectedSaved && !coverEditorOpen && (
              <button className="cover-edit-trigger" onClick={() => void openCoverEditor()}><ImagePlus size={16} /> Cambiar portada</button>
            )}
            {renderCoverEditor()}
          </div>
        </div>
        <div className="modal-content detail-content">
          <button className="modal-back-mobile" onClick={closeBookDetail}><ChevronLeft size={17} /> Volver</button>
          <div className="modal-eyebrow"><span>{selectedBook.publishedYear || "Año desconocido"}</span>{selectedBook.pages && <span>{selectedBook.pages} páginas</span>}{selectedBook.editionCount && <span>{selectedBook.editionCount} ediciones</span>}</div>
          <h2 id="book-detail-title" ref={detailHeadingRef} tabIndex={-1}>{selectedBook.title}</h2>
          <p className="modal-author">{selectedBook.authors.join(", ")}</p>
          <div className="subject-list">{selectedBook.subjects?.slice(0, 5).map((subject) => <span key={subject}>{subject}</span>)}</div>
          <div className="synopsis">
            <span>Sinopsis</span>
            {detailLoading ? <p className="detail-loading"><LoaderCircle className="spin" size={16} /> Cargando sinopsis…</p> : <p>{selectedBook.description || "Open Library no tiene una sinopsis disponible para esta edición. Aun así puedes guardarla y registrar tu lectura."}</p>}
          </div>

          <div className="book-actions" aria-label="Cambiar estado del libro">
            <button className={selectedBook.status === "reading" ? "active" : ""} onClick={() => beginEdit("reading")}><BookOpen size={19} /><span>Leyendo ahora</span></button>
            <button className={selectedBook.status === "read" ? "active" : ""} onClick={() => beginEdit("read")}><Eye size={19} /><span>Marcar leído</span></button>
            <button className={selectedBook.status === "wishlist" ? "active" : ""} onClick={() => saveStatus("wishlist")}><BookPlus size={19} /><span>Leer después</span></button>
            <button className={selectedBook.status === "abandoned" ? "active" : ""} onClick={() => saveStatus("abandoned")}><BookX size={19} /><span>Abandonar</span></button>
          </div>

          {editMode === "read" && (
            <div className="status-editor" ref={statusEditorRef}>
              <div className="status-editor-heading"><BookCheck size={19} /><div><strong>Registrar como leído</strong><span>Tu nota es personal y va de 0 a 100.</span></div></div>
              <button className="primary-action" onClick={() => saveStatus("read", { rating: scoreDraft, readYear: yearDraft, progress: 100 })}><Check size={17} /> Guardar lectura</button>
              <label className="year-field"><span>Año de lectura</span><input type="number" min="1900" max={new Date().getFullYear()} value={yearDraft} onChange={(event) => setYearDraft(Number(event.target.value))} /></label>
              <label className="score-field"><span>Tu nota</span><output>{scoreDraft}<small>/100</small></output><input type="range" min="0" max="100" value={scoreDraft} onChange={(event) => setScoreDraft(Number(event.target.value))} /></label>
            </div>
          )}

          {editMode === "reading" && (
            <div className="status-editor" ref={statusEditorRef}>
              <div className="status-editor-heading"><BookOpen size={19} /><div><strong>Progreso de lectura</strong><span>Puedes actualizarlo cada vez que vuelvas.</span></div></div>
              <button className="primary-action" onClick={() => saveStatus("reading", { progress: progressDraft })}><Check size={17} /> Guardar progreso</button>
              <label className="score-field progress-editor"><span>Completado</span><output>{progressDraft}<small>%</small></output><input type="range" min="0" max="100" value={progressDraft} onChange={(event) => setProgressDraft(Number(event.target.value))} /></label>
            </div>
          )}

          {selectedSaved && <button className="remove-action" onClick={removeSelectedBook}><RotateCcw size={15} /> Quitar de mi biblioteca</button>}
          <a className="source-link" href={`https://openlibrary.org${selectedBook.id}`} target="_blank" rel="noreferrer">Datos de Open Library <ChevronRight size={14} /></a>
        </div>
      </article>
    );
  }

  return (
    <div
      className="app-shell"
      data-font={settings.font}
      data-density={settings.density}
      data-accent={settings.accent}
      data-theme={settings.theme}
      data-rating={settings.ratingColor}
      data-detail={settings.detailMode}
      data-motion={settings.motion}
      data-transition={settings.transition}
      data-card-style={settings.cardStyle}
      data-corners={settings.corners}
      data-cover-effect={settings.coverEffect}
    >
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <button className="brand" onClick={() => navigate("home")} aria-label="Folio, ir al inicio"><span className="brand-mark" aria-hidden="true" /><strong>Folio</strong></button>
        <nav aria-label="Navegación principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)} title={item.label}><Icon size={20} /><span>{item.label}</span></button>;
          })}
        </nav>
        <div className="sidebar-note"><span>{library.length}</span><small>libros<br />guardados</small></div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="page-identity">
            <button className="mobile-menu" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Abrir menú"><Menu size={21} /></button>
            <div><span>{currentTitle.eyebrow}</span><h1>{currentTitle.title}</h1></div>
          </div>
          <form className="search-form" onSubmit={submitSearch} role="search">
            <Search size={18} />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar por título, autor o ISBN" aria-label="Buscar libros" />
            {searchInput && <button type="button" onClick={() => setSearchInput("")} aria-label="Borrar búsqueda"><X size={16} /></button>}
            <kbd>Enter</kbd>
          </form>
          <div className="profile-pill"><span>Mi biblioteca</span><div>LS</div></div>
        </header>

        <main className={`main-content ${selectedBook && settings.detailMode === "page" ? "showing-detail" : ""}`}>
          {selectedBook && settings.detailMode === "page" ? renderBookDetail("page") : renderView()}
        </main>
      </div>

      {selectedBook && settings.detailMode === "modal" && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeBookDetail(); }}>
          {renderBookDetail("modal")}
        </div>
      )}

      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    </div>
  );
}
