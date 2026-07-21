"use client";

import {
  ArrowDownToLine,
  BrainCircuit,
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
  Gauge,
  Home,
  ImagePlus,
  Library,
  Link,
  LoaderCircle,
  Menu,
  Palette,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Star,
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
import {
  CATALOG_PROVIDER_INFO,
  type CatalogBook,
  type CatalogProvider,
  fetchCatalogJson as fetchJson,
  measureCatalogProvider,
  openLibraryCoverUrl as coverUrl,
  searchCatalog,
} from "./folio-catalog";

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
type CoverQualityChoice = "data" | "balanced" | "sharp";
type BackgroundChoice = "deep" | "soft" | "clear";
type BackgroundEffectChoice = "none" | "halo" | "paper";
type PanelChoice = "solid" | "glass" | "clear";
type MetadataColorChoice = "muted" | "white" | "accent" | "varied";
type RecommendationMode = "basic" | "local-ai";

type DiscoveryProfile = {
  queries: string[];
  opened: Array<Pick<CatalogBook, "id" | "title" | "authors" | "subjects" | "pages" | "source"> & { openedAt: number }>;
};

type ProviderTestState = { state: "idle" | "testing" | "done" | "error"; milliseconds?: number; message?: string };

type CoverOverride =
  | { kind: "openlibrary"; coverId: number }
  | { kind: "url"; url: string }
  | { kind: "local"; assetId: string; updatedAt: number };

type Book = CatalogBook & {
  status?: Status;
  rating?: number;
  readYear?: number;
  progress?: number;
  addedAt?: number;
  coverOverride?: CoverOverride;
  recommendationReason?: string;
  recommendationMatch?: number;
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
  coverQuality: CoverQualityChoice;
  background: BackgroundChoice;
  backgroundEffect: BackgroundEffectChoice;
  panels: PanelChoice;
  metadataColor: MetadataColorChoice;
  showDetailRating: boolean;
  catalogProvider: CatalogProvider;
  recommendationMode: RecommendationMode;
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
  coverQuality: "balanced",
  background: "deep",
  backgroundEffect: "none",
  panels: "solid",
  metadataColor: "muted",
  showDetailRating: false,
  catalogProvider: "openlibrary",
  recommendationMode: "basic",
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
const RECOMMENDATION_CACHE = new Map<string, Book[]>();
const EMPTY_DISCOVERY: DiscoveryProfile = { queries: [], opened: [] };

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

function qualityCoverSize(size: "S" | "M" | "L", quality: CoverQualityChoice) {
  if (quality === "data") return size;
  if (quality === "sharp") return "L" as const;
  return size === "S" ? "M" as const : "L" as const;
}

function useBookCoverSource(book: Book, size: "S" | "M" | "L", quality: CoverQualityChoice) {
  const override = book.coverOverride;
  const requestedSize = qualityCoverSize(size, quality);
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

  if (override?.kind === "openlibrary") return coverUrl(override.coverId, requestedSize);
  if (override?.kind === "url") return override.url;
  if (override?.kind === "local" && loadedLocal?.key === localAssetKey && loadedLocal.url) return loadedLocal.url;
  return book.remoteCoverUrl || coverUrl(book.coverId, requestedSize);
}

function BookCover({
  book,
  className = "",
  size = "M",
  priority = false,
  quality = "balanced",
}: {
  book: Book;
  className?: string;
  size?: "S" | "M" | "L";
  priority?: boolean;
  quality?: CoverQualityChoice;
}) {
  const [failedSource, setFailedSource] = useState("");
  const source = useBookCoverSource(book, size, quality);
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

function BookCoverGlow({ book, quality }: { book: Book; quality: CoverQualityChoice }) {
  const source = useBookCoverSource(book, "M", quality);
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

const RECOMMENDATION_STOP_WORDS = new Set(["para", "como", "este", "esta", "desde", "sobre", "with", "from", "that", "the", "and", "una", "uno", "del", "las", "los", "por", "con"]);

function normalizedText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, " ").trim();
}

function meaningfulTokens(value: string) {
  return normalizedText(value).split(/\s+/).filter((token) => token.length > 2 && !RECOMMENDATION_STOP_WORDS.has(token));
}

function recommendationSeeds(library: Book[], discovery: DiscoveryProfile, mode: RecommendationMode) {
  const subjects = new Map<string, number>();
  const authors = new Map<string, number>();
  library.forEach((book) => {
    if (book.status === "abandoned") return;
    const weight = book.status === "read" ? 1 + (book.rating || 70) / 100 : book.status === "reading" ? 1.2 : 0.7;
    book.subjects?.slice(0, 5).forEach((subject) => subjects.set(subject, (subjects.get(subject) || 0) + weight));
    book.authors.slice(0, 2).forEach((author) => authors.set(author, (authors.get(author) || 0) + weight));
  });
  const bestSubjects = [...subjects.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
  const bestAuthors = [...authors.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
  const seeds = [discovery.queries[0], bestSubjects[0], bestAuthors[0], bestSubjects[1]].filter(Boolean) as string[];
  if (mode === "local-ai") seeds.push("cuentos ensayos breves");
  const unique = Array.from(new Set(seeds.map((seed) => seed.trim()).filter(Boolean)));
  return (unique.length ? unique : ["literatura contemporánea", "cuentos clásicos"]).slice(0, mode === "local-ai" ? 3 : 2);
}

function rankRecommendations(candidates: Book[], library: Book[], discovery: DiscoveryProfile, mode: RecommendationMode) {
  const existingTitles = new Set(library.map((book) => normalizedText(book.title)));
  const existingIds = new Set(library.map((book) => book.id));
  const termWeights = new Map<string, number>();
  const negativeTerms = new Map<string, number>();
  const preferredAuthors = new Set<string>();
  const readPages = library.filter((book) => book.status === "read" && book.pages).map((book) => book.pages as number).sort((a, b) => a - b);
  const medianPages = readPages.length ? readPages[Math.floor(readPages.length / 2)] : 300;

  const addTerms = (values: string[], weight: number, target = termWeights) => {
    values.flatMap(meaningfulTokens).forEach((token) => target.set(token, (target.get(token) || 0) + weight));
  };
  library.forEach((book) => {
    if (book.status === "abandoned") {
      addTerms([book.title, ...book.authors, ...(book.subjects || [])], 1.8, negativeTerms);
      return;
    }
    const weight = book.status === "read" ? 1.2 + (book.rating || 70) / 65 : book.status === "reading" ? 1.3 : 0.65;
    addTerms([book.title, ...book.authors, ...(book.subjects || [])], weight);
    if (book.status === "read" && (book.rating || 0) >= 75) book.authors.forEach((author) => preferredAuthors.add(normalizedText(author)));
  });
  discovery.queries.slice(0, 8).forEach((query, index) => addTerms([query], Math.max(0.35, 1.2 - index * 0.1)));
  discovery.opened.slice(0, 12).forEach((book) => addTerms([book.title, ...book.authors, ...(book.subjects || [])], 0.35));

  const uniqueCandidates = new Map<string, Book>();
  candidates.forEach((candidate) => {
    const title = normalizedText(candidate.title);
    if (!title || existingIds.has(candidate.id) || existingTitles.has(title)) return;
    const identity = `${title}|${normalizedText(candidate.authors[0] || "")}`;
    if (!uniqueCandidates.has(identity)) uniqueCandidates.set(identity, candidate);
  });

  const scored = [...uniqueCandidates.values()].map((book) => {
    const tokens = new Set(meaningfulTokens([book.title, ...book.authors, ...(book.subjects || [])].join(" ")));
    const affinity = [...tokens].reduce((sum, token) => sum + Math.min(4, termWeights.get(token) || 0), 0);
    const rejection = [...tokens].reduce((sum, token) => sum + Math.min(3, negativeTerms.get(token) || 0), 0);
    const authorAffinity = book.authors.some((author) => preferredAuthors.has(normalizedText(author))) ? 7 : 0;
    const lengthAffinity = book.pages ? Math.max(0, 8 - Math.abs(book.pages - medianPages) / 45) : 2;
    const shortBonus = mode === "local-ai" && (book.freeText || (book.pages && book.pages <= 260)) ? 6 : 0;
    const metadataBonus = (book.remoteCoverUrl || book.coverId ? 2 : 0) + (book.description ? 1 : 0);
    const rawScore = affinity * (mode === "local-ai" ? 1.35 : 1) + authorAffinity + metadataBonus + (mode === "local-ai" ? lengthAffinity + shortBonus : 0) - rejection * 1.8;
    const matchingSubject = book.subjects?.find((subject) => meaningfulTokens(subject).some((token) => (termWeights.get(token) || 0) >= 1.5));
    const sameAuthor = book.authors.find((author) => preferredAuthors.has(normalizedText(author)));
    const reason = sameAuthor
      ? `Ya disfrutaste a ${sameAuthor}`
      : matchingSubject
        ? `Afinidad con ${matchingSubject}`
        : book.freeText
          ? "Texto gratuito para una lectura distinta"
          : book.pages && book.pages <= 260
            ? "Una lectura breve dentro de tus intereses"
            : "Cercano a tus búsquedas y lecturas";
    return {
      ...book,
      recommendationReason: reason,
      recommendationMatch: Math.max(52, Math.min(96, Math.round(54 + Math.sqrt(Math.max(0, rawScore)) * 4.5))),
      _score: rawScore,
      _tokens: tokens,
    };
  });

  const withoutRankMetadata = (ranked: typeof scored[number]) => {
    const book: Book & { _score?: number; _tokens?: Set<string> } = { ...ranked };
    delete book._score;
    delete book._tokens;
    return book;
  };

  if (mode === "basic") return scored.sort((a, b) => b._score - a._score).slice(0, 12).map(withoutRankMetadata);

  const selected: typeof scored = [];
  const remaining = [...scored];
  while (selected.length < 12 && remaining.length) {
    remaining.sort((a, b) => {
      const diversityPenalty = (candidate: typeof a) => selected.reduce((penalty, chosen) => {
        const overlap = [...candidate._tokens].filter((token) => chosen._tokens.has(token)).length;
        return Math.max(penalty, overlap * 2.2 + (candidate.authors[0] === chosen.authors[0] ? 18 : 0));
      }, 0);
      return (b._score - diversityPenalty(b)) - (a._score - diversityPenalty(a));
    });
    selected.push(remaining.shift() as typeof scored[number]);
  }
  return selected.map(withoutRankMetadata);
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
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [discovery, setDiscovery] = useState<DiscoveryProfile>(EMPTY_DISCOVERY);
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");
  const [recommendationRefresh, setRecommendationRefresh] = useState(0);
  const [recommendationsVisible, setRecommendationsVisible] = useState(false);
  const [providerTests, setProviderTests] = useState<Record<CatalogProvider, ProviderTestState>>({
    openlibrary: { state: "idle" },
    google: { state: "idle" },
    gutendex: { state: "idle" },
    auto: { state: "idle" },
  });
  const statusEditorRef = useRef<HTMLDivElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const detailTriggerRef = useRef<HTMLElement | null>(null);
  const historyInitializedRef = useRef(false);
  const recommendationSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedLibrary = window.localStorage.getItem("folio-library-v1");
        const storedSettings = window.localStorage.getItem("folio-settings-v1");
        const storedDiscovery = window.localStorage.getItem("folio-discovery-v1");
        const storedGoogleKey = window.localStorage.getItem("folio-google-books-key-v1");
        if (storedLibrary) setLibrary(JSON.parse(storedLibrary));
        if (storedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
        if (storedDiscovery) setDiscovery({ ...EMPTY_DISCOVERY, ...JSON.parse(storedDiscovery) });
        if (storedGoogleKey) setGoogleApiKey(storedGoogleKey);
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
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem("folio-discovery-v1", JSON.stringify(discovery));
      if (googleApiKey.trim()) window.localStorage.setItem("folio-google-books-key-v1", googleApiKey.trim());
      else window.localStorage.removeItem("folio-google-books-key-v1");
    }, 180);
    return () => window.clearTimeout(timer);
  }, [discovery, googleApiKey, hydrated]);

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
    if (!hydrated || view !== "home" || !recommendationSectionRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setRecommendationsVisible(true);
    }, { rootMargin: "420px 0px" });
    observer.observe(recommendationSectionRef.current);
    return () => observer.disconnect();
  }, [hydrated, view]);

  useEffect(() => {
    if (!hydrated || view !== "home" || !recommendationsVisible) return;
    const profileKey = library
      .map((book) => `${book.id}:${book.status || ""}:${book.rating || ""}`)
      .sort()
      .join("|");
    const cacheKey = `${settings.catalogProvider}|${settings.recommendationMode}|${googleApiKey ? "key" : "nokey"}|${profileKey}|${discovery.queries.slice(0, 5).join("|")}|${recommendationRefresh}`;
    const cached = RECOMMENDATION_CACHE.get(cacheKey);
    if (cached) {
      setRecommendations(cached);
      setRecommendationError("");
      return;
    }

    setRecommendations([]);
    let active = true;
    const timer = window.setTimeout(async () => {
      setRecommendationsLoading(true);
      setRecommendationError("");
      try {
        const seeds = recommendationSeeds(library, discovery, settings.recommendationMode);
        const resultGroups = await Promise.allSettled(seeds.map((seed) => searchCatalog(settings.catalogProvider, seed, {
          googleApiKey,
          includeSubjects: settings.recommendationMode === "local-ai",
          limit: settings.recommendationMode === "local-ai" ? 14 : 10,
        })));
        const candidates = resultGroups
          .filter((result): result is PromiseFulfilledResult<Book[]> => result.status === "fulfilled")
          .flatMap((result) => result.value);
        if (!candidates.length) {
          const rejected = resultGroups.find((result) => result.status === "rejected");
          throw rejected?.reason || new Error("No encontramos candidatos nuevos");
        }
        const ranked = rankRecommendations(candidates, library, discovery, settings.recommendationMode);
        RECOMMENDATION_CACHE.set(cacheKey, ranked);
        if (active) setRecommendations(ranked);
      } catch (error) {
        if (active) {
          setRecommendations([]);
          setRecommendationError(error instanceof Error ? error.message : "No pudimos preparar recomendaciones");
        }
      } finally {
        if (active) setRecommendationsLoading(false);
      }
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [discovery, googleApiKey, hydrated, library, recommendationRefresh, recommendationsVisible, settings.catalogProvider, settings.recommendationMode, view]);

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

  function rememberSearch(query: string) {
    const cleaned = query.trim();
    if (!cleaned || /^https?:\/\//i.test(cleaned)) return;
    setDiscovery((current) => ({
      ...current,
      queries: [cleaned, ...current.queries.filter((item) => normalizedText(item) !== normalizedText(cleaned))].slice(0, 12),
    }));
  }

  function rememberOpened(book: Book) {
    const signal = {
      id: book.id,
      title: book.title,
      authors: book.authors,
      subjects: book.subjects,
      pages: book.pages,
      source: book.source,
      openedAt: Date.now(),
    };
    setDiscovery((current) => ({
      ...current,
      opened: [signal, ...current.opened.filter((item) => item.id !== book.id)].slice(0, 24),
    }));
  }

  async function testProviderSpeed(provider: CatalogProvider) {
    setProviderTests((current) => ({ ...current, [provider]: { state: "testing" } }));
    try {
      const milliseconds = await measureCatalogProvider(provider, googleApiKey);
      setProviderTests((current) => ({ ...current, [provider]: { state: "done", milliseconds } }));
    } catch (error) {
      setProviderTests((current) => ({
        ...current,
        [provider]: { state: "error", message: error instanceof Error ? error.message : "No respondió" },
      }));
    }
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
    if (pushHistory) rememberOpened(merged);
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
        const match = Array.isArray(searchData.docs) ? searchData.docs.find((doc: { key?: string }) => doc.key?.startsWith("/works/")) as { key?: string; cover_i?: number } | undefined : undefined;
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
    rememberSearch(raw);
    const cacheKey = `${settings.catalogProvider}:${googleApiKey ? "key" : "nokey"}:${raw.toLocaleLowerCase("es")}`;
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
          source: "openlibrary",
          sourceUrl: `https://openlibrary.org${id}`,
        };
        SEARCH_CACHE.set(cacheKey, [linkedBook]);
        setSearchResults([linkedBook]);
        await openBook(linkedBook);
        return;
      }

      const normalizedIsbn = raw.replace(/[\s-]/g, "");
      const query = /^(97[89])?\d{9}[\dX]$/i.test(normalizedIsbn) ? `isbn:${normalizedIsbn}` : raw;
      const books = await searchCatalog(settings.catalogProvider, query, { googleApiKey, limit: 24 });
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
        JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), settings, discovery, books: library, coverAssets }, null, 2),
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
      if (parsed.discovery) setDiscovery({ ...EMPTY_DISCOVERY, ...parsed.discovery });
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
                  <BookCover book={book} size="M" quality={settings.coverQuality} />
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
                    <BookCover book={book} size="M" priority={index < 3} quality={settings.coverQuality} />
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

        <section className="content-section recommendations-section" ref={recommendationSectionRef}>
          <div className="section-heading">
            <div><span className="section-index">03</span><h2>Recomendados</h2></div>
            <div className="recommendation-heading-actions">
              <span className="recommendation-mode"><BrainCircuit size={14} /> {settings.recommendationMode === "basic" ? "Algoritmo básico" : "IA local"}</span>
              <button className="text-button" onClick={() => setRecommendationRefresh((value) => value + 1)} disabled={recommendationsLoading}><RefreshCw size={14} /> Renovar</button>
            </div>
          </div>
          {recommendationsLoading && !recommendations.length ? (
            <div className="search-loading"><LoaderCircle className="spin" size={24} /><span>Aprendiendo de tus lecturas y búsquedas</span></div>
          ) : recommendationError ? (
            <div className="recommendation-error"><EmptyState icon={CircleAlert} title="No pudimos recomendar ahora" copy={recommendationError} /><button className="text-button" onClick={() => setRecommendationRefresh((value) => value + 1)}>Intentar otra vez</button></div>
          ) : recommendations.length ? (
            <div className="recommendation-grid">
              {recommendations.map((book) => (
                <button className="recommendation-card" key={`${book.source || "catalog"}:${book.id}`} onClick={() => openBook(book)}>
                  <BookCover book={book} size="M" quality={settings.coverQuality} />
                  <span className="recommendation-match">{book.recommendationMatch}% afinidad</span>
                  <span className="recommendation-card-copy"><strong>{book.title}</strong><small>{book.authors[0]}</small><em>{book.recommendationReason}</em></span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={Sparkles} title="Folio está conociendo tus gustos" copy="Busca libros o registra algunas lecturas para recibir sugerencias personales." />
          )}
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
                    <BookCover book={book} size="S" quality={settings.coverQuality} />
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
          <div className="setting-row">
            <div><strong>Fondo</strong><span>Aclara el espacio general sin cambiar el tema.</span></div>
            <div className="segmented-control">
              {(["deep", "soft", "clear"] as BackgroundChoice[]).map((background) => (
                <button className={settings.background === background ? "active" : ""} key={background} onClick={() => setSettings({ ...settings, background })}>
                  {background === "deep" ? "Profundo" : background === "soft" ? "Suave" : "Claro"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Ambiente del fondo</strong><span>Agrega luz o textura; desactivado inicialmente.</span></div>
            <div className="segmented-control">
              {(["none", "halo", "paper"] as BackgroundEffectChoice[]).map((backgroundEffect) => (
                <button className={settings.backgroundEffect === backgroundEffect ? "active" : ""} key={backgroundEffect} onClick={() => setSettings({ ...settings, backgroundEffect })}>
                  {backgroundEffect === "none" ? "Ninguno" : backgroundEffect === "halo" ? "Halo" : "Papel"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Transparencia de paneles</strong><span>Desde superficies sólidas hasta cristal ligero.</span></div>
            <div className="segmented-control">
              {(["solid", "glass", "clear"] as PanelChoice[]).map((panels) => (
                <button className={settings.panels === panels ? "active" : ""} key={panels} onClick={() => setSettings({ ...settings, panels })}>
                  {panels === "solid" ? "Sólidos" : panels === "glass" ? "Cristal" : "Livianos"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Datos del libro</strong><span>Color para año, ediciones, páginas y formato.</span></div>
            <div className="segmented-control wide-control">
              {(["muted", "white", "accent", "varied"] as MetadataColorChoice[]).map((metadataColor) => (
                <button className={settings.metadataColor === metadataColor ? "active" : ""} key={metadataColor} onClick={() => setSettings({ ...settings, metadataColor })}>
                  {metadataColor === "muted" ? "Discretos" : metadataColor === "white" ? "Blancos" : metadataColor === "accent" ? "Acento" : "Variados"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Tu nota en el detalle</strong><span>Muestra tu calificación al abrir un libro leído.</span></div>
            <div className="segmented-control">
              <button className={!settings.showDetailRating ? "active" : ""} onClick={() => setSettings({ ...settings, showDetailRating: false })}>Oculta</button>
              <button className={settings.showDetailRating ? "active" : ""} onClick={() => setSettings({ ...settings, showDetailRating: true })}>Visible</button>
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Calidad de portadas</strong><span>Equilibrada usa imágenes grandes solo donde aportan nitidez.</span></div>
            <div className="segmented-control">
              {(["data", "balanced", "sharp"] as CoverQualityChoice[]).map((coverQuality) => (
                <button className={settings.coverQuality === coverQuality ? "active" : ""} key={coverQuality} onClick={() => setSettings({ ...settings, coverQuality })}>
                  {coverQuality === "data" ? "Ahorro" : coverQuality === "balanced" ? "Equilibrada" : "Nítida"}
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

        <section className="settings-card settings-catalog">
          <div className="settings-card-heading"><span><Gauge size={19} /></span><div><h2>Catálogo y recomendaciones</h2><p>Elige la fuente que mejor responde desde tu conexión.</p></div></div>
          <div className="provider-options" aria-label="Fuente del catálogo">
            {(Object.keys(CATALOG_PROVIDER_INFO) as CatalogProvider[]).map((provider) => {
              const info = CATALOG_PROVIDER_INFO[provider];
              const test = providerTests[provider];
              return (
                <div className={`provider-option ${settings.catalogProvider === provider ? "active" : ""}`} key={provider}>
                  <button className="provider-select" onClick={() => setSettings({ ...settings, catalogProvider: provider })} aria-pressed={settings.catalogProvider === provider}>
                    <span><strong>{info.name}</strong><em>{info.badge}</em></span>
                    <small>{info.description}</small>
                  </button>
                  <button className="provider-speed" onClick={() => void testProviderSpeed(provider)} disabled={test.state === "testing"}>
                    {test.state === "testing" ? <><LoaderCircle className="spin" size={13} /> Midiendo…</> : test.state === "done" ? <><Check size={13} /> {test.milliseconds} ms</> : test.state === "error" ? <><CircleAlert size={13} /> {test.message}</> : <><Gauge size={13} /> Probar velocidad</>}
                  </button>
                </div>
              );
            })}
          </div>
          <label className="api-key-field">
            <span><strong>Clave de Google Books</strong><small>Solo se guarda en este dispositivo y no entra en las copias.</small></span>
            <input type="password" value={googleApiKey} onChange={(event) => setGoogleApiKey(event.target.value)} placeholder="AIza…" autoComplete="off" />
          </label>
          <div className="setting-row recommendation-setting">
            <div><strong>Motor de recomendaciones</strong><span>El básico sigue temas y autores. La IA local pondera nota, abandonos, extensión, variedad y textos breves.</span></div>
            <div className="segmented-control">
              <button className={settings.recommendationMode === "basic" ? "active" : ""} onClick={() => setSettings({ ...settings, recommendationMode: "basic" })}>Básico</button>
              <button className={settings.recommendationMode === "local-ai" ? "active" : ""} onClick={() => setSettings({ ...settings, recommendationMode: "local-ai" })}><BrainCircuit size={14} /> IA local</button>
            </div>
          </div>
          <button className="reset-settings subtle-reset" onClick={() => { setDiscovery(EMPTY_DISCOVERY); RECOMMENDATION_CACHE.clear(); setRecommendationRefresh((value) => value + 1); }}><RotateCcw size={16} /> Borrar aprendizaje de búsquedas</button>
        </section>

        <section className="settings-card settings-data">
          <div className="settings-card-heading"><span><ArrowDownToLine size={19} /></span><div><h2>Tus datos</h2><p>Todo vive en este equipo. Guarda una copia cuando quieras.</p></div></div>
          <button className="data-action" onClick={exportJson} disabled={exporting}><span><FileJson size={20} /></span><div><strong>{exporting ? "Preparando copia…" : "Exportar copia completa"}</strong><small>Libros, portadas, notas, progreso, aprendizaje y preferencias · JSON v2</small></div><Download size={18} /></button>
          <button className="data-action" onClick={exportCsv}><span><Library size={20} /></span><div><strong>Exportar lista</strong><small>Compatible con Excel y hojas de cálculo · CSV</small></div><Download size={18} /></button>
          <label className="data-action file-action"><span><Upload size={20} /></span><div><strong>Importar una copia</strong><small>Recupera una exportación anterior · JSON</small></div><ChevronRight size={18} /><input type="file" accept="application/json,.json" onChange={importJson} /></label>
        </section>

        <section className="settings-card settings-about">
          <div className="settings-card-heading"><span><CircleAlert size={19} /></span><div><h2>Acerca de Folio</h2><p>Un tracker privado y sin cuentas.</p></div></div>
          <div className="about-lines"><span>Catálogo activo</span><strong>{CATALOG_PROVIDER_INFO[settings.catalogProvider].name}</strong><span>Recomendaciones</span><strong>{settings.recommendationMode === "basic" ? "Algoritmo básico" : "IA local"}</strong><span>Almacenamiento</span><strong>Solo en este dispositivo</strong><span>Versión</span><strong>1.2</strong></div>
        </section>
      </div>
    );
  }

  function renderSearch() {
    const providerName = CATALOG_PROVIDER_INFO[settings.catalogProvider].name;
    return (
      <section className="search-page">
        <div className="search-summary">
          <p>{searching ? "Buscando en el catálogo…" : activeQuery ? `Coincidencias para “${activeQuery}”` : "Escribe un título, autor o ISBN"}</p>
          {!searching && activeQuery && <span>{searchResults.length} resultados</span>}
        </div>
        {searching && <div className="search-loading"><LoaderCircle className="spin" size={24} /><span>Buscando con {providerName}</span></div>}
        {searchError && <EmptyState icon={CircleAlert} title="La búsqueda no respondió" copy={`${searchError}. Puedes intentarlo de nuevo en unos segundos.`} />}
        {!searching && !searchError && activeQuery && renderBookGrid(searchResults, { title: "Sin coincidencias", copy: "Prueba con el autor, el ISBN o una parte más corta del título." }, true, "search")}
        {!activeQuery && !searching && (
          <div className="search-tip"><Search size={22} /><div><strong>{providerName} está listo</strong><p>Prueba con “Ursula K. Le Guin”, un ISBN o pega un enlace de Open Library.</p></div></div>
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
    const sourceName = selectedBook.source === "google" ? "Google Books" : selectedBook.source === "gutendex" ? "Project Gutenberg" : "Open Library";
    const sourceUrl = selectedBook.sourceUrl || (selectedBook.id.startsWith("/") ? `https://openlibrary.org${selectedBook.id}` : "https://openlibrary.org");
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
          <BookCoverGlow book={selectedBook} quality={settings.coverQuality} />
          <div
            className={`detail-cover-stage ${coverEditorOpen ? "editing" : ""}`}
            onDoubleClick={(event) => { event.preventDefault(); void openCoverEditor(); }}
            title={selectedSaved ? "Doble clic para cambiar la portada" : undefined}
          >
            <BookCover book={selectedBook} size="L" priority quality={settings.coverQuality} />
            {selectedSaved && !coverEditorOpen && (
              <button className="cover-edit-trigger" onClick={() => void openCoverEditor()}><ImagePlus size={16} /> Cambiar portada</button>
            )}
            {renderCoverEditor()}
          </div>
        </div>
        <div className="modal-content detail-content">
          <button className="modal-back-mobile" onClick={closeBookDetail}><ChevronLeft size={17} /> Volver</button>
          <div className="modal-eyebrow"><span>{selectedBook.publishedYear || "Año desconocido"}</span>{selectedBook.editionCount && <span>{selectedBook.editionCount} ediciones</span>}{selectedBook.pages && <span>{selectedBook.pages} páginas</span>}{selectedBook.freeText && <span>Texto gratuito</span>}</div>
          <h2 id="book-detail-title" ref={detailHeadingRef} tabIndex={-1}>{selectedBook.title}</h2>
          <p className="modal-author">{selectedBook.authors.join(", ")}</p>
          {settings.showDetailRating && selectedBook.rating !== undefined && (
            <div className="detail-user-rating" aria-label={`Tu nota ${selectedBook.rating} de 100`}><Star size={17} fill="currentColor" /><span>Tu nota</span><strong>{selectedBook.rating}<small>/100</small></strong></div>
          )}
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
          <a className="source-link" href={sourceUrl} target="_blank" rel="noreferrer">Datos de {sourceName} <ChevronRight size={14} /></a>
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
      data-cover-quality={settings.coverQuality}
      data-background={settings.background}
      data-background-effect={settings.backgroundEffect}
      data-panels={settings.panels}
      data-metadata={settings.metadataColor}
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
            <button type="submit" className="search-submit" aria-label={`Buscar con ${CATALOG_PROVIDER_INFO[settings.catalogProvider].name}`}><Search size={18} /></button>
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
