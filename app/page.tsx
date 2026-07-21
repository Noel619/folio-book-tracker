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
  Code2,
  Compass,
  Download,
  Eye,
  FileImage,
  FileJson,
  FolderPlus,
  Gauge,
  Home,
  ImagePlus,
  Library,
  Link,
  ListPlus,
  LoaderCircle,
  Menu,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { type CSSProperties, ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type CatalogLanguage,
  type CatalogProvider,
  type CatalogQuality,
  cleanCatalogTitle,
  fetchCatalogJson as fetchJson,
  measureCatalogProvider,
  openLibraryCoverUrl as coverUrl,
  resolveCanonicalWork,
  searchCatalog,
} from "./folio-catalog";

type Status = "reading" | "read" | "wishlist" | "abandoned";
type View = "home" | "wishlist" | "abandoned" | "timeline" | "lists" | "settings" | "search";
type DetailOrigin = {
  view: View;
  activeQuery: string;
  searchInput: string;
  scrollY: number;
};
type FontChoice = "sans" | "serif" | "rounded";
type DensityChoice = "compact" | "comfortable" | "large";
type AccentChoice = "violet" | "sage" | "amber" | "blue" | "rose";
type ThemeChoice = "ink" | "graphite" | "oled" | "warm";
type RatingColorChoice = "neutral" | "yellow" | "accent";
type DetailModeChoice = "modal" | "page" | "full";
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
type RecommendationDiversity = "focused" | "balanced" | "broad";
type ListDisplayChoice = "grid" | "compact";
type ListSortChoice = "manual" | "title" | "rating";
type ExtensionIconChoice = "focus" | "gallery" | "compact" | "night" | "code";

type CustomList = {
  id: string;
  name: string;
  description: string;
  color: AccentChoice;
  bookIds: string[];
  createdAt: number;
  updatedAt: number;
};

type FolioExtension = {
  id: string;
  name: string;
  description?: string;
  icon?: ExtensionIconChoice;
  builtIn?: boolean;
  enabled: boolean;
  css: string;
  script: string;
  createdAt: number;
  updatedAt: number;
};

type DiscoveryProfile = {
  queries: string[];
  opened: Array<Pick<CatalogBook, "id" | "title" | "authors" | "subjects" | "pages" | "source"> & { openedAt: number }>;
  dismissed: Array<Pick<CatalogBook, "id" | "title" | "authors" | "subjects" | "source" | "canonicalWorkId" | "canonicalTitle"> & { dismissedAt: number }>;
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
  recommendationKind?: "fresh" | "series" | "text";
  recommendationSeedKind?: "text";
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
  catalogLanguage: CatalogLanguage;
  catalogQuality: CatalogQuality;
  preferCovers: boolean;
  preferDescriptions: boolean;
  hideIncomplete: boolean;
  showRecommendations: boolean;
  recommendationTotal: number;
  recommendationFreshCount: number;
  recommendationSeriesCount: number;
  recommendationTextCount: number;
  recommendationDiversity: RecommendationDiversity;
  recommendationMaxPerAuthor: number;
  enableLists: boolean;
  listDisplay: ListDisplayChoice;
  listSort: ListSortChoice;
  listShowCounts: boolean;
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
  catalogLanguage: "both-es",
  catalogQuality: "balanced",
  preferCovers: true,
  preferDescriptions: true,
  hideIncomplete: false,
  showRecommendations: true,
  recommendationTotal: 12,
  recommendationFreshCount: 8,
  recommendationSeriesCount: 2,
  recommendationTextCount: 2,
  recommendationDiversity: "balanced",
  recommendationMaxPerAuthor: 2,
  enableLists: false,
  listDisplay: "grid",
  listSort: "manual",
  listShowCounts: true,
};

const EMPTY_EXTENSION_DRAFT: FolioExtension = {
  id: "",
  name: "",
  description: "",
  icon: "code",
  builtIn: false,
  enabled: true,
  css: "",
  script: "",
  createdAt: 0,
  updatedAt: 0,
};

const BUILT_IN_EXTENSIONS: FolioExtension[] = [
  {
    id: "builtin-reading-room",
    name: "Sala de lectura",
    description: "Reduce el ruido visual y centra la atención en títulos, portadas y progreso.",
    icon: "focus",
    builtIn: true,
    enabled: false,
    css: `.app-shell .sidebar-note,
.app-shell .profile-pill > span,
.app-shell .section-count,
.app-shell .book-card-meta { opacity: .3; }
.app-shell .main-content { width: min(100%, 1320px); }
.app-shell .content-section { margin-bottom: 72px; }
.app-shell .section-heading { border-bottom: 1px solid var(--line-soft); padding-bottom: 13px; }`,
    script: "",
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "builtin-cover-gallery",
    name: "Galería de portadas",
    description: "Convierte las cubiertas en protagonistas con profundidad, luz y movimiento suave.",
    icon: "gallery",
    builtIn: true,
    enabled: false,
    css: `.app-shell .book-card .book-cover,
.app-shell .recommendation-card .book-cover,
.app-shell .reading-card .book-cover {
  box-shadow: 0 22px 55px rgba(0, 0, 0, .48), 0 0 0 1px rgba(255, 255, 255, .06);
  transition: transform 420ms cubic-bezier(.16, 1, .3, 1), filter 420ms ease, box-shadow 420ms ease;
}
.app-shell .book-card:hover .book-cover,
.app-shell .recommendation-card:hover .book-cover,
.app-shell .reading-card:hover .book-cover {
  transform: translateY(-7px) scale(1.025);
  filter: brightness(1.08) saturate(1.12);
  box-shadow: 0 30px 70px rgba(0, 0, 0, .58), 0 0 28px var(--accent-soft);
}`,
    script: "",
    createdAt: 2,
    updatedAt: 2,
  },
  {
    id: "builtin-compact-library",
    name: "Biblioteca compacta",
    description: "Muestra más títulos a la vez, ideal para bibliotecas con cientos o miles de libros.",
    icon: "compact",
    builtIn: true,
    enabled: false,
    css: `.app-shell .book-grid,
.app-shell .search-grid { grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 25px 14px; }
.app-shell .cover-shell { height: auto; aspect-ratio: 2 / 3; margin-bottom: 9px; }
.app-shell .book-card-title { margin-bottom: 4px; font-size: 11px; }
.app-shell .book-card-author,
.app-shell .book-card-meta { font-size: 8px; }
@media (max-width: 680px) {
  .app-shell .book-grid,
  .app-shell .search-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px 10px; }
}`,
    script: "",
    createdAt: 3,
    updatedAt: 3,
  },
  {
    id: "builtin-night-ink",
    name: "Tinta nocturna",
    description: "Una variante negra con matices salvia y paneles suaves para sesiones nocturnas.",
    icon: "night",
    builtIn: true,
    enabled: false,
    css: `.app-shell {
  --page: #050706 !important;
  --workspace-background: #050706 !important;
  --sidebar: #080b09 !important;
  --panel: #0d110f !important;
  --panel-2: #121814 !important;
  --panel-3: #19201b !important;
  --line: #253028 !important;
  --line-soft: #18211b !important;
  --accent: #9bc7a5 !important;
  --accent-soft: rgba(155, 199, 165, .13) !important;
  --accent-border: rgba(155, 199, 165, .34) !important;
}
.app-shell .workspace { background-image: radial-gradient(circle at 72% 16%, rgba(88, 126, 96, .08), transparent 31%); }`,
    script: "",
    createdAt: 4,
    updatedAt: 4,
  },
];

const BUILT_IN_EXTENSION_IDS = new Set(BUILT_IN_EXTENSIONS.map((extension) => extension.id));

function mergeBuiltInExtensions(value: unknown): FolioExtension[] {
  const stored = Array.isArray(value)
    ? value.filter((extension): extension is FolioExtension => Boolean(extension && typeof extension === "object" && typeof extension.id === "string"))
    : [];
  const storedById = new Map(stored.map((extension) => [extension.id, extension]));
  const builtIns = BUILT_IN_EXTENSIONS.map((extension) => ({
    ...extension,
    enabled: storedById.get(extension.id)?.enabled === true,
  }));
  const custom = stored
    .filter((extension) => !BUILT_IN_EXTENSION_IDS.has(extension.id))
    .map((extension) => ({ ...extension, icon: extension.icon || "code" as const, builtIn: false }));
  return [...builtIns, ...custom];
}

const EXTENSION_SETTING_VALUES: Partial<Record<keyof AppSettings, readonly unknown[]>> = {
  font: ["sans", "serif", "rounded"],
  density: ["compact", "comfortable", "large"],
  accent: ["violet", "sage", "amber", "blue", "rose"],
  theme: ["ink", "graphite", "oled", "warm"],
  ratingColor: ["neutral", "yellow", "accent"],
  detailMode: ["modal", "page", "full"],
  motion: ["off", "subtle", "fluid"],
  transition: ["fade", "slide", "zoom"],
  cardStyle: ["classic", "flat", "elevated"],
  corners: ["square", "soft", "rounded"],
  coverEffect: ["none", "lift", "glow"],
  coverQuality: ["data", "balanced", "sharp"],
  background: ["deep", "soft", "clear"],
  backgroundEffect: ["none", "halo", "paper"],
  panels: ["solid", "glass", "clear"],
  metadataColor: ["muted", "white", "accent", "varied"],
  showDetailRating: [true, false],
  catalogProvider: ["openlibrary", "google", "gutendex", "auto"],
  recommendationMode: ["basic", "local-ai"],
  catalogLanguage: ["es", "en", "both-es", "both-en"],
  catalogQuality: ["inclusive", "balanced", "strict"],
  preferCovers: [true, false],
  preferDescriptions: [true, false],
  hideIncomplete: [true, false],
  showRecommendations: [true, false],
  recommendationTotal: [6, 9, 12, 15, 18],
  recommendationFreshCount: [0, 2, 4, 6, 8, 10, 12, 15, 18],
  recommendationSeriesCount: [0, 1, 2, 3, 4, 5, 6],
  recommendationTextCount: [0, 1, 2, 3, 4, 5, 6],
  recommendationDiversity: ["focused", "balanced", "broad"],
  recommendationMaxPerAuthor: [1, 2, 3, 4],
  enableLists: [true, false],
  listDisplay: ["grid", "compact"],
  listSort: ["manual", "title", "rating"],
  listShowCounts: [true, false],
};

function sanitizeSettings(value: unknown): AppSettings {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const safe = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  Object.entries(EXTENSION_SETTING_VALUES).forEach(([key, allowed]) => {
    if (allowed?.includes(candidate[key])) safe[key] = candidate[key];
  });
  return safe as AppSettings;
}

const EXTENSION_CSS_VARIABLES = new Set([
  "--accent",
  "--accent-strong",
  "--radius",
  "--cover-radius",
  "--control-radius",
  "--font-scale",
  "--content-width",
]);

function extensionRuntimeDocument(extension: FolioExtension, settings: AppSettings, librarySize: number) {
  const safeScript = extension.script.slice(0, 40000).replace(/<\/script/gi, "<\\/script");
  const context = JSON.stringify({ settings, librarySize });
  return `<!doctype html><meta charset="utf-8"><script>
    const extensionId=${JSON.stringify(extension.id)};
    const send=(action,payload={})=>parent.postMessage({channel:"folio-extension-v1",extensionId,action,...payload},"*");
    window.folio=Object.freeze({
      context:Object.freeze(${context}),
      notify:(value)=>send("notify",{value:String(value)}),
      setSetting:(key,value)=>send("setSetting",{key,value}),
      setVariable:(key,value)=>send("setVariable",{key,value:String(value)}),
      addClass:(value)=>send("addClass",{value:String(value)})
    });
    addEventListener("error",event=>send("error",{value:event.message||"Error en la extensión"}));
  <\/script><script>${safeScript}<\/script>`;
}

function SettingPreview({ kind, label }: { kind: string; label?: string }) {
  const locations: Record<string, string> = {
    theme: "Afecta fondo, panel lateral, tarjetas y detalle.",
    font: "Cambia títulos, textos, botones y formularios.",
    density: "Modifica tamaño de texto y separación general.",
    accent: "Se ve en selecciones, progreso y botones activos.",
    rating: "Aparece en tarjetas, cronograma y tu nota.",
    background: "Aclara u oscurece el espacio detrás del contenido.",
    ambience: "Añade luz o textura decorativa al fondo.",
    panels: "Cambia la solidez de tarjetas y ventanas.",
    metadata: "Colorea año, páginas, ediciones y formato.",
    "detail-rating": "Controla la insignia Tu nota dentro del detalle.",
    "cover-quality": "Cambia la resolución solicitada al catálogo.",
    detail: "Compara la apertura del libro dentro del área principal.",
    motion: "Muestra la intensidad de respuesta de los elementos.",
    transition: "Simula la entrada de páginas y paneles.",
    cards: "Cambia fondo, contorno y sombra de cada libro.",
    corners: "Afecta tarjetas, botones, ventanas y portadas.",
    "cover-effect": "Simula la reacción al pasar sobre una portada.",
    language: "Ordena y filtra búsqueda y recomendaciones.",
    "result-quality": "Compara el orden según portada y sinopsis.",
    recommendations: "Se aplica únicamente a Recomendados de Inicio.",
    lists: "Muestra u oculta Listas en el panel izquierdo.",
    "list-display": "Alterna portadas o filas dentro de cada lista.",
  };
  return (
    <div className={`setting-preview preview-${kind}`} aria-hidden="true">
      <div className="preview-title"><span>Comparación animada</span>{label && <b>{label}</b>}</div>
      <div className="preview-scenes">
        <div className="preview-scene preview-before"><small>Base</small><span><i /><i /><i /></span></div>
        <div className="preview-scene preview-after"><small>Actual</small><span><i /><i /><i /></span></div>
      </div>
      <p>{locations[kind] || "La vista cambia al seleccionar cada opción."}</p>
    </div>
  );
}

const EXTENSION_ICON_COMPONENTS: Record<ExtensionIconChoice, typeof Code2> = {
  focus: Eye,
  gallery: ImagePlus,
  compact: Library,
  night: Sparkles,
  code: Code2,
};

function ExtensionLogo({ extension }: { extension: FolioExtension }) {
  const icon = extension.icon || "code";
  const Icon = EXTENSION_ICON_COMPONENTS[icon];
  return <span className={`extension-logo logo-${icon}`} aria-hidden="true"><Icon size={18} /></span>;
}

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
  { id: "lists", label: "Listas", icon: ListPlus },
  { id: "settings", label: "Configuración", icon: Settings },
];

const viewTitles: Record<View, { eyebrow: string; title: string }> = {
  home: { eyebrow: "Tu biblioteca", title: "Buenas lecturas" },
  wishlist: { eyebrow: "Próximas historias", title: "Por leer" },
  abandoned: { eyebrow: "También cuentan", title: "Libros abandonados" },
  timeline: { eyebrow: "Tu historia lectora", title: "Cronograma" },
  lists: { eyebrow: "Colecciones personales", title: "Tus listas" },
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
const RECOMMENDATION_ENGINE_VERSION = "v3-canonical-topics";
const SEARCH_CACHE = new Map<string, Book[]>();
const DETAIL_CACHE = new Map<string, Partial<Book>>();
const COVER_SUGGESTION_CACHE = new Map<string, number[]>();
const LOCAL_COVER_URL_CACHE = new Map<string, string>();
const LOCAL_COVER_PROMISE_CACHE = new Map<string, Promise<string>>();
const RECOMMENDATION_CACHE = new Map<string, Book[]>();
const EMPTY_DISCOVERY: DiscoveryProfile = { queries: [], opened: [], dismissed: [] };
const RADIATION_PARTICLES = Array.from({ length: 72 }, (_, index) => ({
  x: `${(index * 47 + 9) % 101}%`,
  size: `${2 + (index * 17) % 5}px`,
  duration: `${8 + ((index * 13) % 75) / 10}s`,
  delay: `-${((index * 37) % 140) / 10}s`,
  drift: `${-62 + (index * 29) % 124}px`,
  opacity: String(.26 + ((index * 11) % 52) / 100),
}));

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

const RECOMMENDATION_STOP_WORDS = new Set([
  "para", "como", "este", "esta", "desde", "sobre", "with", "from", "that", "the", "and", "una", "uno", "del", "las", "los", "por", "con",
  "book", "books", "ficcion", "fiction", "libro", "libros", "literatura", "literature", "novel", "novela", "novels", "general", "edition", "edicion",
  "reading", "readers", "stories", "story", "text", "texts", "obra", "obras", "volume", "volumen", "collection", "coleccion", "juvenile",
]);

const RECOMMENDATION_TOPIC_RULES = [
  { id: "science-fiction", label: "ciencia ficción", query: "subject:\"science fiction\"", pattern: /science fiction|ciencia ficcion|speculative fiction|dune|fundacion|foundation/i },
  { id: "post-apocalyptic", label: "ficción posapocalíptica", query: "subject:\"post apocalyptic fiction\"", pattern: /post.?apocal|apocalyp|metro 2033|metro 2034|nuclear survival/i },
  { id: "dystopia", label: "distopía", query: "subject:\"dystopian fiction\"", pattern: /dystop|distop|totalitarian|1984|animal farm|rebelion en la granja/i },
  { id: "space-opera", label: "ópera espacial", query: "subject:\"space opera\"", pattern: /space opera|interstellar|galactic|dune|planetary romance/i },
  { id: "epic-fantasy", label: "fantasía épica", query: "subject:\"epic fantasy\"", pattern: /epic fantasy|high fantasy|fantasia epica|lord of the rings|senor de los anillos|middle earth|tierra media/i },
  { id: "political-satire", label: "sátira política", query: "subject:\"political satire\"", pattern: /political satire|satira politica|animal farm|rebelion en la granja|orwell/i },
  { id: "resilience-memoir", label: "memorias de superación", query: "subject:\"motivational memoir\"", pattern: /memoir|memorias|autobiograph|self help|self improvement|superacion|resilien|motivation|david goggins|cant hurt me|never finished/i },
  { id: "mystery", label: "misterio", query: "subject:\"mystery\"", pattern: /mystery|misterio|detective|crime fiction|thriller/i },
  { id: "historical-fiction", label: "ficción histórica", query: "subject:\"historical fiction\"", pattern: /historical fiction|ficcion historica|historical novel/i },
] as const;

function normalizedText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, " ").trim();
}

function meaningfulTokens(value: string) {
  return normalizedText(value).split(/\s+/).filter((token) => token.length > 2 && !RECOMMENDATION_STOP_WORDS.has(token));
}

function recommendationTopics(book: Pick<Book, "title" | "description" | "subjects">) {
  const haystack = normalizedText([book.title, book.description || "", ...(book.subjects || [])].join(" "));
  return RECOMMENDATION_TOPIC_RULES.filter((topic) => topic.pattern.test(haystack));
}

function usefulRecommendationSubject(value: string) {
  const normalized = normalizedText(value);
  if (!normalized || normalized.length > 64 || /\d{4}|--|,/.test(value)) return false;
  const tokens = meaningfulTokens(value);
  return tokens.length > 0 && tokens.length <= 6 && !["fiction", "ficcion", "literature", "literatura", "general", "juvenile fiction"].includes(normalized);
}

function looksLikeSecondaryLiterature(book: Pick<Book, "title" | "authors">) {
  const title = normalizedText(book.title);
  const primaryAuthor = normalizedText(book.authors[0] || "");
  if (primaryAuthor && title === primaryAuthor) return true;
  const genericTopicTitles = new Set(["dystopian fiction", "historical fiction", "science fiction", "political satire", "epic fantasy", "mystery", "literary criticism"]);
  if (genericTopicTitles.has(title)) return true;
  return /\b(?:adaptation|a study of|studies in|study guide|companion to|bibliography of|critical essays|handbook of|encyclopedia of|dictionary of|political thought|literary criticism|complete novels|complete works|complete series|collected works|collected novels|omnibus|box set|trilogy)\b/.test(title)
    || /\b(?:dystopian|historical|science) fiction\b.*\b(?:thought|study|studies|theory|criticism)\b/.test(title);
}

function recommendationProfileScore(book: Book) {
  if (book.status === "abandoned" || book.status === "wishlist") return -1;
  if (book.status === "read") return 70 + (book.rating || 70);
  if (book.status === "reading") return 55 + Math.min(40, (book.progress || 0) * .4);
  return 0;
}

function recommendationProfileBooks(library: Book[]) {
  return [...library]
    .filter((book) => recommendationProfileScore(book) > 0)
    .sort((left, right) => recommendationProfileScore(right) - recommendationProfileScore(left) || (right.addedAt || 0) - (left.addedAt || 0));
}

function recommendationSeeds(library: Book[], mode: RecommendationMode) {
  const profile = recommendationProfileBooks(library);
  const subjects = new Map<string, number>();
  const topics = new Map<string, { query: string; authorWeights: Map<string, number> }>();
  profile.forEach((book) => {
    const weight = recommendationProfileScore(book) / 100;
    const authorKey = normalizedText(book.authors[0] || book.title);
    book.subjects?.filter(usefulRecommendationSubject).slice(0, 5).forEach((subject) => subjects.set(subject, (subjects.get(subject) || 0) + weight));
    recommendationTopics(book).forEach((topic) => {
      const current = topics.get(topic.id) || { query: topic.query, authorWeights: new Map<string, number>() };
      current.authorWeights.set(authorKey, Math.max(current.authorWeights.get(authorKey) || 0, weight));
      topics.set(topic.id, current);
    });
  });
  const topicCandidates = [...topics.entries()].map(([id, topic]) => ({
    id,
    query: topic.query,
    authors: new Set(topic.authorWeights.keys()),
    weight: [...topic.authorWeights.values()].reduce((sum, weight) => sum + weight, 0),
  }));
  const chosenTopics: typeof topicCandidates = [];
  while (chosenTopics.length < 3) {
    const next = topicCandidates
      .filter((topic) => !chosenTopics.some((chosen) => chosen.id === topic.id))
      .sort((left, right) => {
        const adjusted = (topic: typeof left) => topic.weight - chosenTopics.reduce((penalty, chosen) => penalty + [...topic.authors].filter((author) => chosen.authors.has(author)).length * 1.35, 0);
        return adjusted(right) - adjusted(left);
      })[0];
    if (!next) break;
    chosenTopics.push(next);
  }
  const topicSeeds = chosenTopics.map((topic) => topic.query);
  const subjectSeeds = [...subjects.entries()].sort((a, b) => b[1] - a[1]).map(([subject]) => `subject:"${subject.replaceAll("\"", "")}"`).slice(0, 3);
  const authorFrequency = new Map<string, number>();
  profile.forEach((book) => book.authors.forEach((author) => authorFrequency.set(normalizedText(author), (authorFrequency.get(normalizedText(author)) || 0) + 1)));
  const usedAuthors = new Set<string>();
  const signatureSeeds = [...profile].sort((left, right) => {
    const leftFrequency = authorFrequency.get(normalizedText(left.authors[0] || "")) || 0;
    const rightFrequency = authorFrequency.get(normalizedText(right.authors[0] || "")) || 0;
    return rightFrequency - leftFrequency || recommendationProfileScore(right) - recommendationProfileScore(left);
  }).flatMap((book) => {
    const author = book.authors[0] || "";
    const authorKey = normalizedText(author);
    if (!authorKey || usedAuthors.has(authorKey)) return [];
    usedAuthors.add(authorKey);
    return [`author:"${author.replaceAll("\"", "")}"`];
  }).slice(0, 2);
  const interestSeeds = topicSeeds.length ? topicSeeds : subjectSeeds;
  const seeds = [...interestSeeds.slice(0, 3), ...signatureSeeds, 'subject:"short stories"'];
  if (mode === "local-ai") seeds.push('subject:"essays"');
  const unique = Array.from(new Set(seeds.map((seed) => seed.trim()).filter(Boolean)));
  return (unique.length ? unique : ['subject:"dystopian fiction"', 'subject:"science fiction"', 'subject:"epic fantasy"', 'subject:"motivational memoir"', 'subject:"short stories"']).slice(0, mode === "local-ai" ? 7 : 6);
}

function rankRecommendations(candidates: Book[], library: Book[], discovery: DiscoveryProfile, mode: RecommendationMode, settings: AppSettings) {
  const existingTitles = new Set(library.map((book) => normalizedText(book.title)));
  const existingIds = new Set(library.map((book) => book.id));
  const existingCanonicalIds = new Set(library.map((book) => book.canonicalWorkId).filter(Boolean) as string[]);
  const existingCanonicalTitles = new Set(library.map((book) => normalizedText(book.canonicalTitle || "")).filter(Boolean));
  const dismissedIds = new Set(discovery.dismissed.map((book) => `${book.source || "catalog"}:${book.id}`));
  const dismissedTitles = new Set(discovery.dismissed.map((book) => normalizedText(book.title)));
  const dismissedCanonicalIds = new Set(discovery.dismissed.map((book) => book.canonicalWorkId).filter(Boolean) as string[]);
  const dismissedCanonicalTitles = new Set(discovery.dismissed.map((book) => normalizedText(book.canonicalTitle || "")).filter(Boolean));
  const termWeights = new Map<string, number>();
  const topicWeights = new Map<string, number>();
  const negativeTerms = new Map<string, number>();
  const negativeTopics = new Map<string, number>();
  const preferredAuthors = new Set<string>();
  const libraryAuthors = new Set(library.filter((book) => book.status !== "abandoned").flatMap((book) => book.authors.map(normalizedText)));
  const libraryTitleSignals = library
    .filter((book) => book.status === "read" || book.status === "reading")
    .map((book) => ({ title: normalizedText(book.title), tokens: new Set(meaningfulTokens(book.title)), authors: new Set(book.authors.map(normalizedText)) }));
  const readPages = library.filter((book) => book.status === "read" && book.pages).map((book) => book.pages as number).sort((a, b) => a - b);
  const medianPages = readPages.length ? readPages[Math.floor(readPages.length / 2)] : 300;

  const addTerms = (values: string[], weight: number, target = termWeights) => {
    values.flatMap(meaningfulTokens).forEach((token) => target.set(token, (target.get(token) || 0) + weight));
  };
  library.forEach((book) => {
    if (book.status === "abandoned") {
      addTerms((book.subjects || []).filter(usefulRecommendationSubject), 1.8, negativeTerms);
      recommendationTopics(book).forEach((topic) => negativeTopics.set(topic.id, (negativeTopics.get(topic.id) || 0) + 2));
      return;
    }
    if (book.status === "wishlist") return;
    const weight = book.status === "read" ? 1.2 + (book.rating || 70) / 65 : book.status === "reading" ? 1.3 : 0.65;
    addTerms((book.subjects || []).filter(usefulRecommendationSubject), weight);
    recommendationTopics(book).forEach((topic) => topicWeights.set(topic.id, (topicWeights.get(topic.id) || 0) + weight * 2.2));
    if (book.status === "read" && (book.rating || 0) >= 75) book.authors.forEach((author) => preferredAuthors.add(normalizedText(author)));
  });
  const validatedQueries = discovery.queries.filter((query) => {
    const queryKey = normalizedText(query);
    return queryKey.length >= 4 && discovery.opened.some((book) => {
      const openedKey = normalizedText(`${book.title} ${book.authors.join(" ")}`);
      return openedKey.includes(queryKey) || queryKey.includes(normalizedText(book.title));
    });
  });
  validatedQueries.slice(0, 3).forEach((query) => addTerms([query], .2));
  discovery.opened.slice(0, 10).forEach((book) => {
    addTerms((book.subjects || []).filter(usefulRecommendationSubject), .22);
    recommendationTopics(book).forEach((topic) => topicWeights.set(topic.id, (topicWeights.get(topic.id) || 0) + .3));
  });
  discovery.dismissed.slice(0, 40).forEach((book) => {
    addTerms((book.subjects || []).filter(usefulRecommendationSubject), 1.1, negativeTerms);
    recommendationTopics(book).forEach((topic) => negativeTopics.set(topic.id, (negativeTopics.get(topic.id) || 0) + 1.25));
  });

  const uniqueCandidates = new Map<string, Book>();
  candidates.forEach((candidate) => {
    const title = normalizedText(candidate.title);
    const candidateTokens = new Set(meaningfulTokens(candidate.title));
    const candidateAuthors = new Set(candidate.authors.map(normalizedText));
    const canonicalId = candidate.canonicalWorkId;
    const canonicalTitle = normalizedText(candidate.canonicalTitle || "");
    const duplicatesKnownBook = libraryTitleSignals.some((known) => {
      if (known.title === title) return true;
      const sameAuthor = [...candidateAuthors].some((author) => known.authors.has(author));
      if (!sameAuthor || !known.tokens.size || !candidateTokens.size) return false;
      const overlap = [...candidateTokens].filter((token) => known.tokens.has(token)).length;
      const smaller = Math.min(candidateTokens.size, known.tokens.size);
      const combinedEdition = /[/&]/.test(candidate.title) && overlap === known.tokens.size;
      if (combinedEdition) return true;
      return smaller >= 2 && overlap / smaller >= .86;
    });
    if (!title || looksLikeSecondaryLiterature(candidate) || existingIds.has(candidate.id) || existingTitles.has(title) || dismissedIds.has(`${candidate.source || "catalog"}:${candidate.id}`) || dismissedTitles.has(title) || (canonicalId && (existingCanonicalIds.has(canonicalId) || dismissedCanonicalIds.has(canonicalId))) || (canonicalTitle && (existingCanonicalTitles.has(canonicalTitle) || dismissedCanonicalTitles.has(canonicalTitle))) || duplicatesKnownBook) return;
    const identity = `${title}|${normalizedText(candidate.authors[0] || "")}`;
    const previous = uniqueCandidates.get(identity);
    if (!previous || (!previous.recommendationSeedKind && candidate.recommendationSeedKind)) uniqueCandidates.set(identity, candidate);
  });

  const scored = [...uniqueCandidates.values()].flatMap((book) => {
    const titleTokens = new Set(meaningfulTokens(book.title));
    const candidateTopics = recommendationTopics(book);
    const tokens = new Set(meaningfulTokens((book.subjects || []).filter(usefulRecommendationSubject).join(" ")));
    const affinity = [...tokens].reduce((sum, token) => sum + Math.min(4, termWeights.get(token) || 0), 0);
    const topicAffinity = candidateTopics.reduce((sum, topic) => sum + Math.min(8, topicWeights.get(topic.id) || 0), 0);
    const rejection = [...tokens].reduce((sum, token) => sum + Math.min(3, negativeTerms.get(token) || 0), 0);
    const topicRejection = candidateTopics.reduce((sum, topic) => sum + Math.min(4, negativeTopics.get(topic.id) || 0), 0);
    const primaryAuthor = normalizedText(book.authors[0] || "");
    const sameKnownAuthor = libraryAuthors.has(primaryAuthor);
    const authorAffinity = preferredAuthors.has(primaryAuthor) ? 7 : sameKnownAuthor ? 3 : 0;
    const lengthAffinity = book.pages ? Math.max(0, 8 - Math.abs(book.pages - medianPages) / 45) : 2;
    const shortText = Boolean(book.freeText || (book.pages && book.pages <= 220) || (book.recommendationSeedKind === "text" && (!book.pages || book.pages <= 340)));
    const exploratoryText = Boolean(shortText && book.recommendationSeedKind === "text" && (book.catalogPopularity || 0) >= 15);
    const shortBonus = mode === "local-ai" && shortText ? 6 : 0;
    const hasCover = Boolean(book.remoteCoverUrl || book.coverId);
    const hasDescription = Boolean(book.description && book.description.trim().length >= 24);
    if (!hasCover && !hasDescription) return [];
    if ((settings.hideIncomplete || settings.catalogQuality === "strict") && (!hasCover || !hasDescription)) return [];
    if (affinity < 1.1 && topicAffinity <= 0 && authorAffinity <= 0 && !exploratoryText) return [];
    const metadataBonus = (settings.preferCovers && hasCover ? 10 : hasCover ? 2 : 0)
      + (settings.preferDescriptions && hasDescription ? 8 : hasDescription ? 1 : 0);
    const popularityBonus = book.catalogPopularity ? Math.min(14, Math.log2(book.catalogPopularity + 1) * 1.35) : 0;
    const familyAffinity = libraryTitleSignals.reduce((best, known) => {
      const overlap = [...titleTokens].filter((token) => known.tokens.has(token)).length;
      return Math.max(best, titleTokens.size && known.tokens.size ? overlap / Math.min(titleTokens.size, known.tokens.size) : 0);
    }, 0);
    const seriesLike = sameKnownAuthor || familyAffinity >= .5;
    const kind: "fresh" | "series" | "text" = shortText && !seriesLike ? "text" : seriesLike ? "series" : "fresh";
    const freshBonus = kind === "fresh" ? 5 : 0;
    if (!seriesLike && !shortText && affinity < 1.1 && topicAffinity <= 0) return [];
    const rawScore = affinity * (mode === "local-ai" ? 1.2 : 1) + topicAffinity * 1.55 + authorAffinity + metadataBonus + popularityBonus + freshBonus + (mode === "local-ai" ? lengthAffinity + shortBonus : 0) - rejection * 1.8 - topicRejection * 2.2;
    const matchingSubject = book.subjects?.filter(usefulRecommendationSubject).find((subject) => meaningfulTokens(subject).some((token) => (termWeights.get(token) || 0) >= 1.5));
    const matchingTopic = candidateTopics.sort((left, right) => (topicWeights.get(right.id) || 0) - (topicWeights.get(left.id) || 0))[0];
    const sameAuthor = preferredAuthors.has(primaryAuthor) ? book.authors[0] : undefined;
    const reason = kind === "series" && sameAuthor
      ? `Otra obra de ${sameAuthor}`
      : kind === "text"
        ? book.freeText ? "Texto gratuito y breve para variar" : matchingTopic && (topicWeights.get(matchingTopic.id) || 0) > 0 ? `Lectura breve de ${matchingTopic.label}` : "Una lectura breve reconocida para variar"
        : matchingTopic && (topicWeights.get(matchingTopic.id) || 0) > 0
        ? `Afinidad con ${matchingTopic.label}`
        : matchingSubject
        ? `Comparte ${matchingSubject.toLocaleLowerCase("es").slice(0, 38)}`
        : "Un título nuevo cercano a tus gustos";
    return [{
      ...book,
      recommendationReason: reason,
      recommendationMatch: Math.max(52, Math.min(96, Math.round(54 + Math.sqrt(Math.max(0, rawScore)) * 4.5))),
      recommendationKind: kind,
      _score: rawScore,
      _tokens: tokens,
      _familyKey: sameKnownAuthor ? `author:${primaryAuthor}` : matchingTopic ? `topic:${matchingTopic.id}` : `title:${[...titleTokens].slice(0, 2).join("-")}`,
    }];
  });

  const withoutRankMetadata = (ranked: typeof scored[number]) => {
    const book: Book & { _score?: number; _tokens?: Set<string>; _familyKey?: string } = { ...ranked };
    delete book._score;
    delete book._tokens;
    delete book._familyKey;
    delete book.recommendationSeedKind;
    return book;
  };

  const total = Math.max(4, Math.min(18, settings.recommendationTotal));
  const authorLimit = Math.max(1, Math.min(4, settings.recommendationMaxPerAuthor));
  const selected: typeof scored = [];
  const selectedIds = new Set<string>();
  const authorCounts = new Map<string, number>();
  const familyCounts = new Map<string, number>();
  const diversityStrength = settings.recommendationDiversity === "broad" ? 3.8 : settings.recommendationDiversity === "focused" ? .8 : 2.2;

  const adjustedScore = (candidate: typeof scored[number]) => {
    const overlapPenalty = selected.reduce((penalty, chosen) => {
      const overlap = [...candidate._tokens].filter((token) => chosen._tokens.has(token)).length;
      return Math.max(penalty, overlap * diversityStrength + (candidate._familyKey === chosen._familyKey ? 20 : 0));
    }, 0);
    return candidate._score - overlapPenalty;
  };
  const canSelect = (candidate: typeof scored[number]) => {
    if (selectedIds.has(`${candidate.source}:${candidate.id}`)) return false;
    const author = normalizedText(candidate.authors[0] || "autor no disponible");
    if ((authorCounts.get(author) || 0) >= authorLimit) return false;
    const familyLimit = candidate.recommendationKind === "series" ? Math.min(2, authorLimit) : settings.recommendationDiversity === "broad" ? 2 : 3;
    if ((familyCounts.get(candidate._familyKey) || 0) >= familyLimit) return false;
    return true;
  };
  const take = (kind: "fresh" | "series" | "text", amount: number) => {
    while (amount > 0 && selected.length < total) {
      const pool = scored
        .filter((candidate) => candidate.recommendationKind === kind && canSelect(candidate))
        .sort((left, right) => adjustedScore(right) - adjustedScore(left));
      const candidate = pool[0];
      if (!candidate) break;
      selected.push(candidate);
      selectedIds.add(`${candidate.source}:${candidate.id}`);
      const author = normalizedText(candidate.authors[0] || "autor no disponible");
      authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
      familyCounts.set(candidate._familyKey, (familyCounts.get(candidate._familyKey) || 0) + 1);
      amount -= 1;
    }
  };

  take("fresh", Math.min(total, settings.recommendationFreshCount));
  take("series", Math.min(total - selected.length, settings.recommendationSeriesCount));
  take("text", Math.min(total - selected.length, settings.recommendationTextCount));
  take("fresh", total - selected.length);
  return selected.map(withoutRankMetadata);
}

async function canonicalizeRecommendationData(library: Book[], candidates: Book[]) {
  const profile = recommendationProfileBooks(library).slice(0, 16);
  const knownAuthors = new Set(profile.flatMap((book) => book.authors.map(normalizedText)));
  const libraryMatches = await Promise.all(profile.map(async (book) => ({ book, canonical: await resolveCanonicalWork(book) })));
  const resolvedByLibraryId = new Map(libraryMatches.map(({ book, canonical }) => [book.id, canonical] as const));
  const canonicalLibrary = library.map((book) => {
    const canonical = resolvedByLibraryId.get(book.id);
    return canonical?.id || canonical?.title
      ? { ...book, canonicalWorkId: canonical.id || book.canonicalWorkId, canonicalTitle: canonical.title || book.canonicalTitle, canonicalResolved: canonical.resolved || book.canonicalResolved }
      : book;
  });

  const needsResolution = candidates
    .filter((book) => !book.canonicalWorkId && book.authors.some((author) => knownAuthors.has(normalizedText(author))))
    .slice(0, 18);
  const candidateMatches = await Promise.all(needsResolution.map(async (book) => ({ book, canonical: await resolveCanonicalWork(book) })));
  const resolvedByCandidateId = new Map(candidateMatches.map(({ book, canonical }) => [`${book.source || "catalog"}:${book.id}`, canonical] as const));
  const canonicalCandidates = candidates.map((book) => {
    const canonical = resolvedByCandidateId.get(`${book.source || "catalog"}:${book.id}`);
    return canonical?.id || canonical?.title
      ? { ...book, canonicalWorkId: canonical.id || book.canonicalWorkId, canonicalTitle: canonical.title || book.canonicalTitle, canonicalResolved: canonical.resolved || book.canonicalResolved }
      : book;
  });
  return { library: canonicalLibrary, candidates: canonicalCandidates };
}

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [library, setLibrary] = useState<Book[]>(SEED_LIBRARY);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [extensions, setExtensions] = useState<FolioExtension[]>(() => mergeBuiltInExtensions([]));
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [listCreatorOpen, setListCreatorOpen] = useState(false);
  const [listNameDraft, setListNameDraft] = useState("");
  const [listDescriptionDraft, setListDescriptionDraft] = useState("");
  const [listColorDraft, setListColorDraft] = useState<AccentChoice>("violet");
  const [pendingListDelete, setPendingListDelete] = useState("");
  const [extensionDraft, setExtensionDraft] = useState<FolioExtension | null>(null);
  const [pendingExtensionDelete, setPendingExtensionDelete] = useState<string | null>(null);
  const [extensionVariables, setExtensionVariables] = useState<Record<string, string>>({});
  const [extensionClasses, setExtensionClasses] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [radiationSnow, setRadiationSnow] = useState(false);
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
  const detailOriginRef = useRef<DetailOrigin | null>(null);
  const detailRequestRef = useRef(0);
  const historyInitializedRef = useRef(false);
  const recommendationSectionRef = useRef<HTMLElement>(null);

  const restoreBookDetailOrigin = useCallback(() => {
    const origin = detailOriginRef.current;
    const nextView = origin?.view || (activeQuery ? "search" : "home");
    if (origin?.view === "search") {
      setActiveQuery(origin.activeQuery);
      setSearchInput(origin.searchInput);
    }
    setView(nextView);
    detailRequestRef.current += 1;
    setSelectedBook(null);
    setDetailLoading(false);
    setEditMode(null);
    setCoverEditorOpen(false);
    setCoverError("");
    detailOriginRef.current = null;
    window.requestAnimationFrame(() => {
      detailTriggerRef.current?.focus();
      if (origin) window.scrollTo({ top: origin.scrollY, behavior: "auto" });
    });
  }, [activeQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedLibrary = window.localStorage.getItem("folio-library-v1");
        const storedSettings = window.localStorage.getItem("folio-settings-v1");
        const storedDiscovery = window.localStorage.getItem("folio-discovery-v1");
        const storedGoogleKey = window.localStorage.getItem("folio-google-books-key-v1");
        const storedExtensions = window.localStorage.getItem("folio-extensions-v1");
        const storedLists = window.localStorage.getItem("folio-lists-v1");
        if (storedLibrary) {
          const parsedLibrary = JSON.parse(storedLibrary);
          if (Array.isArray(parsedLibrary)) setLibrary(parsedLibrary.map((book: Book) => ({ ...book, title: cleanCatalogTitle(book.title, book.authors) })));
        }
        if (storedSettings) setSettings(sanitizeSettings(JSON.parse(storedSettings)));
        if (storedDiscovery) setDiscovery({ ...EMPTY_DISCOVERY, ...JSON.parse(storedDiscovery) });
        if (storedGoogleKey) setGoogleApiKey(storedGoogleKey);
        if (storedExtensions) {
          const parsedExtensions = JSON.parse(storedExtensions);
          setExtensions(mergeBuiltInExtensions(parsedExtensions));
        }
        if (storedLists) {
          const parsedLists = JSON.parse(storedLists);
          if (Array.isArray(parsedLists)) {
            setCustomLists(parsedLists);
            if (parsedLists[0]?.id) setSelectedListId(parsedLists[0].id);
          }
        }
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
      window.localStorage.setItem("folio-extensions-v1", JSON.stringify(extensions));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [extensions, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem("folio-lists-v1", JSON.stringify(customLists));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [customLists, hydrated]);

  useEffect(() => {
    if (!settings.enableLists && view === "lists") setView("home");
  }, [settings.enableLists, view]);

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
    setExtensionVariables({});
    setExtensionClasses([]);
  }, [extensions]);

  useEffect(() => {
    function handleExtensionMessage(event: MessageEvent) {
      const message = event.data as { channel?: string; extensionId?: string; action?: string; key?: string; value?: unknown };
      if (message?.channel !== "folio-extension-v1" || !extensions.some((extension) => extension.id === message.extensionId && extension.enabled)) return;
      if (message.action === "notify") {
        notify(String(message.value || "Extensión ejecutada").slice(0, 160));
        return;
      }
      if (message.action === "error") {
        notify(`Extensión: ${String(message.value || "error desconocido").slice(0, 130)}`);
        return;
      }
      if (message.action === "setVariable" && typeof message.key === "string" && EXTENSION_CSS_VARIABLES.has(message.key)) {
        const value = String(message.value || "").slice(0, 80);
        if (/url\s*\(|expression\s*\(|javascript:/i.test(value)) return;
        setExtensionVariables((current) => ({ ...current, [message.key as string]: value }));
        return;
      }
      if (message.action === "addClass") {
        const value = String(message.value || "");
        if (!/^ext-[a-z0-9-]{1,40}$/.test(value)) return;
        setExtensionClasses((current) => current.includes(value) ? current : [...current, value]);
        return;
      }
      if (message.action === "setSetting" && typeof message.key === "string" && message.key in EXTENSION_SETTING_VALUES) {
        const key = message.key as keyof AppSettings;
        if (!EXTENSION_SETTING_VALUES[key]?.includes(message.value as never)) return;
        setSettings((current) => current[key] === message.value ? current : ({ ...current, [key]: message.value } as AppSettings));
      }
    }
    window.addEventListener("message", handleExtensionMessage);
    return () => window.removeEventListener("message", handleExtensionMessage);
  }, [extensions]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !selectedBook) return;
      if (coverEditorOpen) {
        setCoverEditorOpen(false);
        setCoverError("");
      } else {
        if (settings.detailMode !== "modal" && bookIdFromHash(window.location.hash)) {
          if (window.history.state?.folioDetail) {
            window.history.back();
            return;
          }
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        }
        restoreBookDetailOrigin();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [coverEditorOpen, restoreBookDetailOrigin, selectedBook, settings.detailMode]);

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
  const libraryById = useMemo(() => new Map(library.map((book) => [book.id, book] as const)), [library]);
  const selectedCustomList = useMemo(
    () => customLists.find((list) => list.id === selectedListId) || customLists[0] || null,
    [customLists, selectedListId],
  );
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
    if (!hydrated || view !== "home" || !settings.showRecommendations || !recommendationSectionRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setRecommendationsVisible(true);
    }, { rootMargin: "420px 0px" });
    observer.observe(recommendationSectionRef.current);
    return () => observer.disconnect();
  }, [hydrated, settings.showRecommendations, view]);

  useEffect(() => {
    if (!hydrated || view !== "home" || !settings.showRecommendations || !recommendationsVisible) return;
    const profileKey = library
      .map((book) => `${book.id}:${book.status || ""}:${book.rating || ""}`)
      .sort()
      .join("|");
    const preferenceKey = [
      settings.catalogLanguage,
      settings.catalogQuality,
      settings.preferCovers,
      settings.preferDescriptions,
      settings.hideIncomplete,
      settings.recommendationTotal,
      settings.recommendationFreshCount,
      settings.recommendationSeriesCount,
      settings.recommendationTextCount,
      settings.recommendationDiversity,
      settings.recommendationMaxPerAuthor,
    ].join("|");
    const learningKey = [
      ...discovery.opened.slice(0, 8).map((book) => `open:${book.source || "catalog"}:${book.id}`),
      ...(discovery.dismissed || []).slice(0, 20).map((book) => `hide:${book.source || "catalog"}:${book.id}`),
    ].join("|");
    const cacheKey = `${RECOMMENDATION_ENGINE_VERSION}|${settings.catalogProvider}|${settings.recommendationMode}|${preferenceKey}|${googleApiKey ? "key" : "nokey"}|${profileKey}|${learningKey}|${recommendationRefresh}`;
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
        const seeds = recommendationSeeds(library, settings.recommendationMode);
        const resultGroups = await Promise.allSettled(seeds.map((seed) => searchCatalog(settings.catalogProvider, seed, {
          googleApiKey,
          includeSubjects: true,
          limit: settings.recommendationMode === "local-ai" ? 22 : 18,
          language: settings.catalogLanguage,
          quality: settings.catalogQuality,
          preferCovers: settings.preferCovers,
          preferDescriptions: settings.preferDescriptions,
          hideIncomplete: settings.hideIncomplete,
          ranking: "relevance",
        })));
        const candidates = resultGroups.flatMap((result, index) => result.status === "fulfilled"
          ? result.value.map((book) => ({
            ...book,
            recommendationSeedKind: /subject:\"(?:short stories|essays)\"/.test(seeds[index]) ? "text" as const : undefined,
          }))
          : []);
        if (!candidates.length) {
          const rejected = resultGroups.find((result) => result.status === "rejected");
          throw rejected?.reason || new Error("No encontramos candidatos nuevos");
        }
        const canonicalized = await canonicalizeRecommendationData(library, candidates);
        const enrichedLibrary = canonicalized.library;
        if (active && enrichedLibrary.some((book, index) => book.canonicalWorkId !== library[index]?.canonicalWorkId || book.canonicalTitle !== library[index]?.canonicalTitle || book.canonicalResolved !== library[index]?.canonicalResolved)) {
          setLibrary(enrichedLibrary);
        }
        const ranked = rankRecommendations(canonicalized.candidates, enrichedLibrary, discovery, settings.recommendationMode, settings);
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
  }, [discovery, googleApiKey, hydrated, library, recommendationRefresh, recommendationsVisible, settings, view]);

  useEffect(() => {
    function syncDetailFromHistory() {
      if (settings.detailMode === "modal") return;
      const bookId = bookIdFromHash(window.location.hash);
      if (!bookId) {
        restoreBookDetailOrigin();
        return;
      }
      const stateBook = window.history.state?.folioBook as Book | undefined;
      const stateOrigin = window.history.state?.folioOrigin as DetailOrigin | undefined;
      if (stateOrigin) detailOriginRef.current = stateOrigin;
      const candidate = library.find((book) => book.id === bookId)
        || searchResults.find((book) => book.id === bookId)
        || (stateBook?.id === bookId ? stateBook : undefined);
      if (candidate) {
        void openBook(candidate, false);
      } else {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        restoreBookDetailOrigin();
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
  }, [hydrated, library, restoreBookDetailOrigin, searchResults, settings.detailMode]);

  function navigate(nextView: View) {
    detailRequestRef.current += 1;
    detailOriginRef.current = null;
    setSelectedBook(null);
    setDetailLoading(false);
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

  function setListsEnabled(enabled: boolean) {
    setSettings((current) => current.enableLists === enabled ? current : { ...current, enableLists: enabled });
    if (!enabled) {
      setListCreatorOpen(false);
      setPendingListDelete("");
      setSelectedListId("");
      if (view === "lists") setView("home");
    }
    notify(enabled ? "Listas visibles" : "Listas ocultas");
  }

  function setRecommendationsEnabled(enabled: boolean) {
    setSettings((current) => current.showRecommendations === enabled ? current : { ...current, showRecommendations: enabled });
    if (!enabled) {
      setRecommendationsVisible(false);
      setRecommendationsLoading(false);
    }
    notify(enabled ? "Recomendados visibles en Inicio" : "Recomendados ocultos de Inicio");
  }

  function toggleExtension(extension: FolioExtension) {
    const enabled = !extension.enabled;
    setExtensions((current) => current.map((item) => item.id === extension.id ? { ...item, enabled, updatedAt: Date.now() } : item));
    notify(`${extension.name} ${enabled ? "activada" : "desactivada"}`);
  }

  function updateSearchInput(value: string) {
    if (value.trim().toLocaleUpperCase("es") === "HESOYAM") {
      const next = !radiationSnow;
      setRadiationSnow(next);
      setSearchInput("");
      notify(next ? "HESOYAM · nevada radiactiva activada" : "HESOYAM · nevada radiactiva detenida");
      return;
    }
    setSearchInput(value);
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

  function dismissRecommendation(book: Book) {
    const signal = {
      id: book.id,
      title: book.title,
      authors: book.authors,
      subjects: book.subjects,
      source: book.source,
      canonicalWorkId: book.canonicalWorkId,
      canonicalTitle: book.canonicalTitle,
      dismissedAt: Date.now(),
    };
    setDiscovery((current) => ({
      ...current,
      dismissed: [signal, ...(current.dismissed || []).filter((item) => `${item.source || "catalog"}:${item.id}` !== `${book.source || "catalog"}:${book.id}`)].slice(0, 100),
    }));
    setRecommendations((current) => current.filter((item) => `${item.source || "catalog"}:${item.id}` !== `${book.source || "catalog"}:${book.id}`));
    notify("La tendremos menos en cuenta");
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
    if (settings.detailMode !== "modal" && bookIdFromHash(window.location.hash)) {
      if (window.history.state?.folioDetail) {
        window.history.back();
        return;
      }
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    restoreBookDetailOrigin();
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
    const detailRequestId = ++detailRequestRef.current;
    const saved = libraryById.get(book.id);
    const merged = saved ? { ...book, ...saved } : book;
    const origin: DetailOrigin = { view, activeQuery, searchInput, scrollY: window.scrollY };
    if (pushHistory) {
      detailTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      detailOriginRef.current = origin;
    }
    if (pushHistory) rememberOpened(merged);
    setSelectedBook(merged);
    setScoreDraft(merged.rating ?? 80);
    setYearDraft(merged.readYear ?? new Date().getFullYear());
    setProgressDraft(merged.progress ?? 0);
    setEditMode(null);
    setCoverEditorOpen(false);
    setCoverError("");
    if (settings.detailMode !== "modal" && pushHistory) {
      const hash = bookDetailHash(merged.id);
      if (window.location.hash !== hash) {
        window.history.pushState({ folioDetail: true, folioBook: merged, folioOrigin: origin }, "", hash);
      }
      window.requestAnimationFrame(() => detailHeadingRef.current?.focus());
    }

    if (merged.description || !merged.id.startsWith("/works/")) return;
    const cachedDetail = DETAIL_CACHE.get(merged.id);
    if (cachedDetail) {
      if (detailRequestRef.current === detailRequestId) setSelectedBook({ ...merged, ...cachedDetail });
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
      if (detailRequestRef.current === detailRequestId) setSelectedBook(detailed);
    } catch {
      // Search metadata is still enough to use every tracker action.
    } finally {
      if (detailRequestRef.current === detailRequestId) setDetailLoading(false);
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
    if (!selectedBook || !libraryById.has(selectedBook.id)) return;
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

    detailRequestRef.current += 1;
    detailOriginRef.current = null;
    setSelectedBook(null);
    setDetailLoading(false);
    setEditMode(null);
    setCoverEditorOpen(false);
    setCoverError("");
    if (bookIdFromHash(window.location.hash)) {
      window.history.replaceState(
        { folioView: "search", folioQuery: raw },
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
    setView("search");
    setActiveQuery(raw);
    rememberSearch(raw);
    const cacheKey = [
      settings.catalogProvider,
      settings.catalogLanguage,
      settings.catalogQuality,
      settings.preferCovers,
      settings.preferDescriptions,
      settings.hideIncomplete,
      googleApiKey ? "key" : "nokey",
      raw.toLocaleLowerCase("es"),
    ].join(":");
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
      const books = await searchCatalog(settings.catalogProvider, query, {
        googleApiKey,
        limit: 24,
        language: settings.catalogLanguage,
        quality: settings.catalogQuality,
        preferCovers: settings.preferCovers,
        preferDescriptions: settings.preferDescriptions,
        hideIncomplete: settings.hideIncomplete,
      });
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
    setCustomLists((current) => current.map((list) => ({ ...list, bookIds: list.bookIds.filter((bookId) => bookId !== selectedBook.id), updatedAt: Date.now() })));
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
        JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), settings, discovery, extensions, lists: customLists, books: library, coverAssets }, null, 2),
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
      setLibrary(books.map((book: Book) => ({ ...book, title: cleanCatalogTitle(book.title, book.authors) })));
      if (parsed.settings) setSettings(sanitizeSettings(parsed.settings));
      if (parsed.discovery) setDiscovery({ ...EMPTY_DISCOVERY, ...parsed.discovery });
      if (Array.isArray(parsed.extensions)) setExtensions(mergeBuiltInExtensions(parsed.extensions));
      if (Array.isArray(parsed.lists)) {
        setCustomLists(parsed.lists);
        setSelectedListId(parsed.lists[0]?.id || "");
      }
      notify(`${books.length} libros importados`);
    } catch {
      notify("No pudimos leer esa copia de seguridad");
    }
  }

  function exportSettings() {
    downloadFile(
      `folio-configuracion-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ type: "folio-settings", version: 1, exportedAt: new Date().toISOString(), settings, extensions }, null, 2),
      "application/json",
    );
    notify("Configuración exportada");
  }

  async function importSettings(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.type !== "folio-settings" || !parsed.settings || typeof parsed.settings !== "object") throw new Error("Formato no válido");
      setSettings(sanitizeSettings(parsed.settings));
      if (Array.isArray(parsed.extensions)) setExtensions(mergeBuiltInExtensions(parsed.extensions));
      SEARCH_CACHE.clear();
      RECOMMENDATION_CACHE.clear();
      setRecommendationRefresh((value) => value + 1);
      notify("Configuración importada");
    } catch {
      notify("Ese archivo no contiene una configuración de Folio válida");
    }
  }

  function createCustomList() {
    const name = listNameDraft.trim().slice(0, 60);
    if (!name) {
      notify("Escribe un nombre para la lista");
      return;
    }
    const now = Date.now();
    const list: CustomList = {
      id: `list-${crypto.randomUUID()}`,
      name,
      description: listDescriptionDraft.trim().slice(0, 240),
      color: listColorDraft,
      bookIds: [],
      createdAt: now,
      updatedAt: now,
    };
    setCustomLists((current) => [...current, list]);
    setSelectedListId(list.id);
    setListCreatorOpen(false);
    setListNameDraft("");
    setListDescriptionDraft("");
    notify(`${name} creada`);
  }

  function updateCustomList(id: string, patch: Partial<Pick<CustomList, "name" | "description" | "color">>) {
    setCustomLists((current) => current.map((list) => list.id === id ? { ...list, ...patch, updatedAt: Date.now() } : list));
  }

  function deleteCustomList(id: string) {
    const remaining = customLists.filter((list) => list.id !== id);
    setCustomLists(remaining);
    setSelectedListId(remaining[0]?.id || "");
    notify("Lista eliminada");
  }

  function toggleBookInList(listId: string, bookId: string) {
    setCustomLists((current) => current.map((list) => {
      if (list.id !== listId) return list;
      const contains = list.bookIds.includes(bookId);
      return { ...list, bookIds: contains ? list.bookIds.filter((id) => id !== bookId) : [...list.bookIds, bookId], updatedAt: Date.now() };
    }));
  }

  function createExtension() {
    const now = Date.now();
    setExtensionDraft({
      ...EMPTY_EXTENSION_DRAFT,
      id: `extension-${crypto.randomUUID()}`,
      name: "Mi extensión",
      createdAt: now,
      updatedAt: now,
    });
    setPendingExtensionDelete(null);
  }

  function editExtension(extension: FolioExtension) {
    setExtensionDraft({ ...extension });
    setPendingExtensionDelete(null);
  }

  function saveExtension() {
    if (!extensionDraft) return;
    const name = extensionDraft.name.trim().slice(0, 60);
    if (!name) {
      notify("La extensión necesita un nombre");
      return;
    }
    const saved = {
      ...extensionDraft,
      name,
      css: extensionDraft.css.slice(0, 60000),
      script: extensionDraft.script.slice(0, 40000),
      updatedAt: Date.now(),
    };
    setExtensions((current) => current.some((extension) => extension.id === saved.id)
      ? current.map((extension) => extension.id === saved.id ? saved : extension)
      : [...current, saved]);
    setExtensionDraft(null);
    notify(`${name} guardada`);
  }

  function deleteExtension(id: string) {
    const extension = extensions.find((item) => item.id === id);
    setExtensions((current) => current.filter((item) => item.id !== id));
    setPendingExtensionDelete(null);
    if (extensionDraft?.id === id) setExtensionDraft(null);
    notify(`${extension?.name || "Extensión"} eliminada`);
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

        {settings.showRecommendations && <section className="content-section recommendations-section" ref={recommendationSectionRef}>
          <div className="section-heading">
            <div><span className="section-index">03</span><h2>Recomendados</h2></div>
            <div className="recommendation-heading-actions">
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
                <article className="recommendation-card" key={`${book.source || "catalog"}:${book.id}`}>
                  <button className="recommendation-open" onClick={() => openBook(book)} aria-label={`Abrir recomendación ${book.title}`}>
                    <BookCover book={book} size="M" quality={settings.coverQuality} />
                    <span className="recommendation-match">{book.recommendationMatch}% afinidad</span>
                    <span className={`recommendation-kind kind-${book.recommendationKind || "fresh"}`}>{book.recommendationKind === "series" ? "Relacionado" : book.recommendationKind === "text" ? "Texto breve" : "Nuevo título"}</span>
                    <span className="recommendation-card-copy"><strong>{book.title}</strong><small>{book.authors[0]}</small><em>{book.recommendationReason}</em></span>
                  </button>
                  <button className="recommendation-dismiss" onClick={() => dismissRecommendation(book)} aria-label={`No me interesa ${book.title}`} title="No me interesa"><X size={13} /> No me interesa</button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={Sparkles} title="Folio está conociendo tus gustos" copy="Busca libros o registra algunas lecturas para recibir sugerencias personales." />
          )}
        </section>}
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

  function renderLists() {
    const listBooks = selectedCustomList
      ? selectedCustomList.bookIds.map((bookId) => libraryById.get(bookId)).filter((book): book is Book => Boolean(book))
      : [];
    const sortedListBooks = [...listBooks].sort((left, right) => {
      if (settings.listSort === "title") return left.title.localeCompare(right.title, "es");
      if (settings.listSort === "rating") return (right.rating || 0) - (left.rating || 0);
      return (selectedCustomList?.bookIds.indexOf(left.id) ?? 0) - (selectedCustomList?.bookIds.indexOf(right.id) ?? 0);
    });
    const pickerLimitKey = `list-picker-${selectedCustomList?.id || "none"}`;
    const pickerLimit = gridLimits[pickerLimitKey] ?? 48;
    const visibleLibrary = library.slice(0, pickerLimit);

    return (
      <section className="lists-page">
        <div className="lists-intro">
          <div><span>Organiza sin cambiar el estado de lectura</span><h2>Colecciones hechas por ti</h2><p>Un libro puede estar en varias listas: sagas, favoritos, regalos, investigación o lo que necesites.</p></div>
          <button onClick={() => setListCreatorOpen((open) => !open)}><FolderPlus size={17} /> Nueva lista</button>
        </div>

        {listCreatorOpen && (
          <div className="list-creator">
            <div><strong>Crear una lista</strong><span>Podrás cambiar estos datos después.</span></div>
            <label><span>Nombre</span><input value={listNameDraft} maxLength={60} onChange={(event) => setListNameDraft(event.target.value)} placeholder="Ej. Ciencia ficción esencial" /></label>
            <label><span>Descripción</span><input value={listDescriptionDraft} maxLength={240} onChange={(event) => setListDescriptionDraft(event.target.value)} placeholder="Qué reúne esta lista" /></label>
            <div className="list-color-picker" aria-label="Color de la lista">
              {(["violet", "sage", "amber", "blue", "rose"] as AccentChoice[]).map((color) => <button key={color} className={`color-dot ${color} ${listColorDraft === color ? "active" : ""}`} onClick={() => setListColorDraft(color)} aria-label={`Color ${color}`}>{listColorDraft === color && <Check size={13} />}</button>)}
            </div>
            <div className="list-creator-actions"><button onClick={() => setListCreatorOpen(false)}>Cancelar</button><button className="primary" onClick={createCustomList}><Plus size={15} /> Crear lista</button></div>
          </div>
        )}

        {!customLists.length ? (
          <EmptyState icon={ListPlus} title="Crea tu primera lista" copy="Agrupa sagas, favoritos, regalos, temas de investigación o cualquier selección personal." />
        ) : (
          <>
            <div className="custom-list-tabs" aria-label="Tus listas">
              {customLists.map((list) => (
                <button key={list.id} className={`list-tab list-color-${list.color} ${selectedCustomList?.id === list.id ? "active" : ""}`} onClick={() => setSelectedListId(list.id)}>
                  <span>{list.name}</span>{settings.listShowCounts && <small>{list.bookIds.length}</small>}
                </button>
              ))}
            </div>

            {selectedCustomList && (
              <div className="custom-list-workspace">
                <div className="list-editor-panel">
                  <div className="list-editor-fields">
                    <label><span>Nombre de la lista</span><input value={selectedCustomList.name} maxLength={60} onChange={(event) => updateCustomList(selectedCustomList.id, { name: event.target.value })} /></label>
                    <label><span>Descripción</span><textarea value={selectedCustomList.description} maxLength={240} onChange={(event) => updateCustomList(selectedCustomList.id, { description: event.target.value })} placeholder="Añade una nota sobre esta colección" /></label>
                    <div className="list-color-picker" aria-label="Cambiar color de la lista">{(["violet", "sage", "amber", "blue", "rose"] as AccentChoice[]).map((color) => <button key={color} className={`color-dot ${color} ${selectedCustomList.color === color ? "active" : ""}`} onClick={() => updateCustomList(selectedCustomList.id, { color })} aria-label={`Color ${color}`}>{selectedCustomList.color === color && <Check size={13} />}</button>)}</div>
                  </div>
                  <div className="list-delete-actions">
                    {pendingListDelete === selectedCustomList.id ? <><button className="danger" onClick={() => deleteCustomList(selectedCustomList.id)}>Confirmar eliminación</button><button onClick={() => setPendingListDelete("")}>Cancelar</button></> : <button className="danger" onClick={() => setPendingListDelete(selectedCustomList.id)}><Trash2 size={14} /> Eliminar lista</button>}
                  </div>
                </div>

                <div className="list-section-heading"><div><span>Libros dentro</span><strong>{sortedListBooks.length} {sortedListBooks.length === 1 ? "título" : "títulos"}</strong></div><small>{settings.listDisplay === "grid" ? "Vista de portadas" : "Vista compacta"}</small></div>
                {settings.listDisplay === "grid" ? renderBookGrid(sortedListBooks, { title: "Esta lista está vacía", copy: "Elige libros de tu biblioteca en el panel inferior." }, false, `custom-list-${selectedCustomList.id}`) : (
                  sortedListBooks.length ? <div className="compact-list-books">{sortedListBooks.map((book) => <button key={book.id} onClick={() => openBook(book)}><BookCover book={book} size="S" quality={settings.coverQuality} /><span><strong>{book.title}</strong><small>{book.authors[0]}{book.rating !== undefined ? ` · ${book.rating}/100` : ""}</small></span><ChevronRight size={16} /></button>)}</div> : <EmptyState icon={ListPlus} title="Esta lista está vacía" copy="Elige libros de tu biblioteca en el panel inferior." />
                )}

                <div className="list-picker">
                  <div className="list-section-heading"><div><span>Agregar o quitar</span><strong>Tu biblioteca</strong></div><small>Los cambios se guardan al instante</small></div>
                  <div className="list-picker-grid">
                    {visibleLibrary.map((book) => {
                      const included = selectedCustomList.bookIds.includes(book.id);
                      return <button key={book.id} className={included ? "active" : ""} onClick={() => toggleBookInList(selectedCustomList.id, book.id)} aria-pressed={included}><BookCover book={book} size="S" quality={settings.coverQuality} /><span><strong>{book.title}</strong><small>{included ? "Dentro de la lista" : "Agregar"}</small></span>{included ? <Check size={15} /> : <Plus size={15} />}</button>;
                    })}
                  </div>
                  {visibleLibrary.length < library.length && <button className="load-more" onClick={() => setGridLimits((current) => ({ ...current, [pickerLimitKey]: pickerLimit + 48 }))}>Mostrar más libros<span>{visibleLibrary.length} de {library.length}</span></button>}
                </div>
              </div>
            )}
          </>
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
            <div><strong>Tema</strong><span>Elige la temperatura general de la interfaz.</span><SettingPreview kind="theme" /></div>
            <div className="segmented-control wide-control">
              {(["ink", "graphite", "oled", "warm"] as ThemeChoice[]).map((theme) => (
                <button className={settings.theme === theme ? "active" : ""} key={theme} onClick={() => setSettings({ ...settings, theme })}>
                  {theme === "ink" ? "Tinta" : theme === "graphite" ? "Grafito" : theme === "oled" ? "OLED" : "Cálido"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Tipografía</strong><span>Elige el carácter de la interfaz.</span><SettingPreview kind="font" label="Aa" /></div>
            <div className="segmented-control">
              <button className={settings.font === "sans" ? "active" : ""} onClick={() => setSettings({ ...settings, font: "sans" })}>Moderna</button>
              <button className={settings.font === "serif" ? "active" : ""} onClick={() => setSettings({ ...settings, font: "serif" })}>Editorial</button>
              <button className={settings.font === "rounded" ? "active" : ""} onClick={() => setSettings({ ...settings, font: "rounded" })}>Redonda</button>
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Tamaño</strong><span>Modifica texto y espacio entre elementos.</span><SettingPreview kind="density" /></div>
            <div className="segmented-control">
              {(["compact", "comfortable", "large"] as DensityChoice[]).map((density) => (
                <button className={settings.density === density ? "active" : ""} key={density} onClick={() => setSettings({ ...settings, density })}>
                  {density === "compact" ? "S" : density === "comfortable" ? "M" : "L"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row accent-row">
            <div><strong>Color de acento</strong><span>Un detalle de color, nada más.</span><SettingPreview kind="accent" /></div>
            <div className="color-options">
              {(["violet", "sage", "amber", "blue", "rose"] as AccentChoice[]).map((accent) => (
                <button key={accent} className={`color-dot ${accent} ${settings.accent === accent ? "active" : ""}`} onClick={() => setSettings({ ...settings, accent })} aria-label={`Acento ${accent}`}>
                  {settings.accent === accent && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Color de la nota</strong><span>Se aplica a tarjetas, cronograma y editor.</span><SettingPreview kind="rating" label="92" /></div>
            <div className="segmented-control">
              {(["neutral", "yellow", "accent"] as RatingColorChoice[]).map((ratingColor) => (
                <button className={settings.ratingColor === ratingColor ? "active" : ""} key={ratingColor} onClick={() => setSettings({ ...settings, ratingColor })}>
                  {ratingColor === "neutral" ? "Neutra" : ratingColor === "yellow" ? "Amarilla" : "Acento"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Fondo</strong><span>Aclara el espacio general sin cambiar el tema.</span><SettingPreview kind="background" /></div>
            <div className="segmented-control">
              {(["deep", "soft", "clear"] as BackgroundChoice[]).map((background) => (
                <button className={settings.background === background ? "active" : ""} key={background} onClick={() => setSettings({ ...settings, background })}>
                  {background === "deep" ? "Profundo" : background === "soft" ? "Suave" : "Claro"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Ambiente del fondo</strong><span>Agrega luz o textura; desactivado inicialmente.</span><SettingPreview kind="ambience" /></div>
            <div className="segmented-control">
              {(["none", "halo", "paper"] as BackgroundEffectChoice[]).map((backgroundEffect) => (
                <button className={settings.backgroundEffect === backgroundEffect ? "active" : ""} key={backgroundEffect} onClick={() => setSettings({ ...settings, backgroundEffect })}>
                  {backgroundEffect === "none" ? "Ninguno" : backgroundEffect === "halo" ? "Halo" : "Papel"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Transparencia de paneles</strong><span>Desde superficies sólidas hasta cristal ligero.</span><SettingPreview kind="panels" /></div>
            <div className="segmented-control">
              {(["solid", "glass", "clear"] as PanelChoice[]).map((panels) => (
                <button className={settings.panels === panels ? "active" : ""} key={panels} onClick={() => setSettings({ ...settings, panels })}>
                  {panels === "solid" ? "Sólidos" : panels === "glass" ? "Cristal" : "Livianos"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Datos del libro</strong><span>Color para año, ediciones, páginas y formato.</span><SettingPreview kind="metadata" label="2021 · 8 · 200" /></div>
            <div className="segmented-control wide-control">
              {(["muted", "white", "accent", "varied"] as MetadataColorChoice[]).map((metadataColor) => (
                <button className={settings.metadataColor === metadataColor ? "active" : ""} key={metadataColor} onClick={() => setSettings({ ...settings, metadataColor })}>
                  {metadataColor === "muted" ? "Discretos" : metadataColor === "white" ? "Blancos" : metadataColor === "accent" ? "Acento" : "Variados"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Tu nota en el detalle</strong><span>Muestra tu calificación al abrir un libro leído.</span><SettingPreview kind="detail-rating" label={settings.showDetailRating ? "Tu nota 92" : "Oculta"} /></div>
            <div className="segmented-control">
              <button className={!settings.showDetailRating ? "active" : ""} onClick={() => setSettings({ ...settings, showDetailRating: false })}>Oculta</button>
              <button className={settings.showDetailRating ? "active" : ""} onClick={() => setSettings({ ...settings, showDetailRating: true })}>Visible</button>
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Calidad de portadas</strong><span>Equilibrada usa imágenes grandes solo donde aportan nitidez.</span><SettingPreview kind="cover-quality" /></div>
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
            <div><strong>Detalle del libro</strong><span>Cambia dónde se abre: sobre la biblioteca, dentro del contenido o ocupando toda el área sin el marco exterior.</span><SettingPreview kind="detail" label={settings.detailMode === "modal" ? "Ventana" : settings.detailMode === "page" ? "Página" : "Página total"} /></div>
            <div className="segmented-control wide-control">
              <button className={settings.detailMode === "modal" ? "active" : ""} onClick={() => setSettings({ ...settings, detailMode: "modal" })}>Modal</button>
              <button className={settings.detailMode === "page" ? "active" : ""} onClick={() => setSettings({ ...settings, detailMode: "page" })}>Página</button>
              <button className={settings.detailMode === "full" ? "active" : ""} onClick={() => setSettings({ ...settings, detailMode: "full" })}>Página total</button>
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Movimiento</strong><span>Controla la intensidad de todas las animaciones.</span><SettingPreview kind="motion" /></div>
            <div className="segmented-control">
              {(["off", "subtle", "fluid"] as MotionChoice[]).map((motion) => (
                <button className={settings.motion === motion ? "active" : ""} key={motion} onClick={() => setSettings({ ...settings, motion })}>
                  {motion === "off" ? "Nada" : motion === "subtle" ? "Sutil" : "Fluido"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Transición</strong><span>El efecto al abrir páginas y paneles.</span><SettingPreview kind="transition" /></div>
            <div className="segmented-control">
              {(["fade", "slide", "zoom"] as TransitionChoice[]).map((transition) => (
                <button className={settings.transition === transition ? "active" : ""} key={transition} onClick={() => setSettings({ ...settings, transition })}>
                  {transition === "fade" ? "Fundido" : transition === "slide" ? "Deslizar" : "Zoom"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Tarjetas</strong><span>Cambia profundidad, fondo y contorno.</span><SettingPreview kind="cards" /></div>
            <div className="segmented-control">
              {(["classic", "flat", "elevated"] as CardStyleChoice[]).map((cardStyle) => (
                <button className={settings.cardStyle === cardStyle ? "active" : ""} key={cardStyle} onClick={() => setSettings({ ...settings, cardStyle })}>
                  {cardStyle === "classic" ? "Clásico" : cardStyle === "flat" ? "Plano" : "Elevado"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Esquinas</strong><span>Desde geometría recta hasta formas suaves.</span><SettingPreview kind="corners" /></div>
            <div className="segmented-control">
              {(["square", "soft", "rounded"] as CornerChoice[]).map((corners) => (
                <button className={settings.corners === corners ? "active" : ""} key={corners} onClick={() => setSettings({ ...settings, corners })}>
                  {corners === "square" ? "Rectas" : corners === "soft" ? "Suaves" : "Redondas"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div><strong>Efecto de portada</strong><span>Reacción visual al señalar un libro.</span><SettingPreview kind="cover-effect" /></div>
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
          <div className="catalog-preference-block">
            <div className="catalog-preference-heading"><div><strong>Idiomas de los resultados</strong><span>Filtra el catálogo o decide cuál aparece primero.</span></div><SettingPreview kind="language" /></div>
            <div className="language-options" aria-label="Idiomas de búsqueda y recomendaciones">
              {([
                ["es", "🇪🇸", "Solo español", "Oculta ediciones detectadas en otros idiomas"],
                ["en", "🇬🇧", "Only English", "Muestra únicamente resultados en inglés"],
                ["both-es", "🇪🇸 🇬🇧", "Ambos · español primero", "Incluye inglés, priorizando español"],
                ["both-en", "🇬🇧 🇪🇸", "Both · English first", "Incluye español, priorizando inglés"],
              ] as [CatalogLanguage, string, string, string][]).map(([value, emoji, title, copy]) => (
                <button key={value} className={settings.catalogLanguage === value ? "active" : ""} onClick={() => setSettings({ ...settings, catalogLanguage: value })}>
                  <span>{emoji}</span><div><strong>{title}</strong><small>{copy}</small></div>{settings.catalogLanguage === value && <Check size={15} />}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row catalog-quality-setting">
            <div><strong>Exigencia de resultados</strong><span>Equilibrada descarta coincidencias sin relación; estricta además exige portada o sinopsis.</span><SettingPreview kind="result-quality" /></div>
            <div className="segmented-control">
              {(["inclusive", "balanced", "strict"] as CatalogQuality[]).map((catalogQuality) => (
                <button className={settings.catalogQuality === catalogQuality ? "active" : ""} key={catalogQuality} onClick={() => setSettings({ ...settings, catalogQuality })}>
                  {catalogQuality === "inclusive" ? "Amplia" : catalogQuality === "balanced" ? "Equilibrada" : "Estricta"}
                </button>
              ))}
            </div>
          </div>
          <div className="quality-toggle-grid">
            <button className={settings.preferCovers ? "active" : ""} onClick={() => setSettings({ ...settings, preferCovers: !settings.preferCovers })} aria-pressed={settings.preferCovers}>
              <FileImage size={17} /><span><strong>Priorizar portadas</strong><small>Las portadas reales suben en el orden.</small></span><em>{settings.preferCovers ? "Sí" : "No"}</em>
            </button>
            <button className={settings.preferDescriptions ? "active" : ""} onClick={() => setSettings({ ...settings, preferDescriptions: !settings.preferDescriptions })} aria-pressed={settings.preferDescriptions}>
              <BookOpen size={17} /><span><strong>Priorizar sinopsis</strong><small>Los libros descritos aparecen antes.</small></span><em>{settings.preferDescriptions ? "Sí" : "No"}</em>
            </button>
            <button className={settings.hideIncomplete ? "active" : ""} onClick={() => setSettings({ ...settings, hideIncomplete: !settings.hideIncomplete })} aria-pressed={settings.hideIncomplete}>
              <Eye size={17} /><span><strong>Ocultar incompletos</strong><small>Exige portada y sinopsis en toda búsqueda.</small></span><em>{settings.hideIncomplete ? "Sí" : "No"}</em>
            </button>
          </div>
          <div className="setting-row recommendation-visibility-setting">
            <div><strong>Recomendados en Inicio</strong><span>Desactívalos para eliminar por completo la sección y sus consultas al catálogo.</span><SettingPreview kind="recommendations" label={settings.showRecommendations ? "Visible" : "Oculta"} /></div>
            <div className="segmented-control"><button type="button" className={!settings.showRecommendations ? "active" : ""} onClick={() => setRecommendationsEnabled(false)} aria-pressed={!settings.showRecommendations}>Ocultar</button><button type="button" className={settings.showRecommendations ? "active" : ""} onClick={() => setRecommendationsEnabled(true)} aria-pressed={settings.showRecommendations}>Mostrar</button></div>
          </div>
          {settings.showRecommendations && <>
          <div className="setting-row recommendation-setting">
            <div><strong>Motor de recomendaciones</strong><span>Cambia el cálculo usado exclusivamente en la sección Recomendados de Inicio.</span><SettingPreview kind="recommendations" label={settings.recommendationMode === "basic" ? "Afinidad" : "IA local"} /></div>
            <div className="segmented-control">
              <button className={settings.recommendationMode === "basic" ? "active" : ""} onClick={() => setSettings({ ...settings, recommendationMode: "basic" })}>Básico</button>
              <button className={settings.recommendationMode === "local-ai" ? "active" : ""} onClick={() => setSettings({ ...settings, recommendationMode: "local-ai" })}><BrainCircuit size={14} /> IA local</button>
            </div>
          </div>
          <div className="recommendation-composer">
            <div className="recommendation-composer-heading"><div><strong>Composición de cada tanda</strong><span>Decide cuántos descubrimientos, continuaciones relacionadas y textos breves intentará mostrar Folio.</span></div><span className="recommendation-total-badge">{settings.recommendationTotal} lugares</span></div>
            <div className="setting-row compact-setting-row">
              <div><strong>Total visible</strong><span>Cantidad máxima de tarjetas en Inicio.</span></div>
              <div className="segmented-control">{([6, 9, 12, 15, 18] as const).map((recommendationTotal) => <button key={recommendationTotal} className={settings.recommendationTotal === recommendationTotal ? "active" : ""} onClick={() => setSettings({
                ...settings,
                recommendationTotal,
                recommendationFreshCount: Math.min(settings.recommendationFreshCount, recommendationTotal),
                recommendationSeriesCount: Math.min(settings.recommendationSeriesCount, recommendationTotal),
                recommendationTextCount: Math.min(settings.recommendationTextCount, recommendationTotal),
              })}>{recommendationTotal}</button>)}</div>
            </div>
            <div className="recommendation-quota-grid">
              <label><span><strong>Nuevos títulos</strong><small>Autores o universos distintos</small></span><output>{settings.recommendationFreshCount}</output><input type="range" min="0" max={settings.recommendationTotal} value={Math.min(settings.recommendationFreshCount, settings.recommendationTotal)} onChange={(event) => setSettings({ ...settings, recommendationFreshCount: Number(event.target.value) })} /></label>
              <label><span><strong>Relacionados</strong><small>Secuelas u otras obras conocidas</small></span><output>{settings.recommendationSeriesCount}</output><input type="range" min="0" max={Math.min(6, settings.recommendationTotal)} value={Math.min(settings.recommendationSeriesCount, settings.recommendationTotal)} onChange={(event) => setSettings({ ...settings, recommendationSeriesCount: Number(event.target.value) })} /></label>
              <label><span><strong>Textos breves</strong><small>Cuentos, ensayos o lecturas cortas</small></span><output>{settings.recommendationTextCount}</output><input type="range" min="0" max={Math.min(6, settings.recommendationTotal)} value={Math.min(settings.recommendationTextCount, settings.recommendationTotal)} onChange={(event) => setSettings({ ...settings, recommendationTextCount: Number(event.target.value) })} /></label>
            </div>
            <div className="setting-row compact-setting-row">
              <div><strong>Diversidad</strong><span>Amplia evita que una lectura reciente, como Dune, domine toda la tanda.</span></div>
              <div className="segmented-control">{(["focused", "balanced", "broad"] as RecommendationDiversity[]).map((recommendationDiversity) => <button key={recommendationDiversity} className={settings.recommendationDiversity === recommendationDiversity ? "active" : ""} onClick={() => setSettings({ ...settings, recommendationDiversity })}>{recommendationDiversity === "focused" ? "Cercana" : recommendationDiversity === "balanced" ? "Equilibrada" : "Amplia"}</button>)}</div>
            </div>
            <div className="setting-row compact-setting-row">
              <div><strong>Máximo por autor</strong><span>Límite aplicado a cada tanda para impedir repeticiones.</span></div>
              <div className="segmented-control">{([1, 2, 3, 4] as const).map((recommendationMaxPerAuthor) => <button key={recommendationMaxPerAuthor} className={settings.recommendationMaxPerAuthor === recommendationMaxPerAuthor ? "active" : ""} onClick={() => setSettings({ ...settings, recommendationMaxPerAuthor })}>{recommendationMaxPerAuthor}</button>)}</div>
            </div>
            <p className="recommendation-composer-note"><Sparkles size={14} /> Los libros ya guardados se excluyen incluso si otra API usa una edición o identificador diferente. Si una categoría no tiene suficientes candidatos, Folio completa con títulos nuevos antes de repetir una saga.</p>
          </div>
          <button className="reset-settings subtle-reset" onClick={() => { setDiscovery(EMPTY_DISCOVERY); RECOMMENDATION_CACHE.clear(); setRecommendationRefresh((value) => value + 1); }}><RotateCcw size={16} /> Borrar aprendizaje y descartes</button>
          </>}
        </section>

        <section className="settings-card settings-lists">
          <div className="settings-card-heading"><span><ListPlus size={19} /></span><div><h2>Listas personales</h2><p>Una función opcional para crear colecciones propias sin cambiar el estado de lectura.</p></div></div>
          <div className="setting-row">
            <div><strong>Activar Listas</strong><span>Agrega el icono Listas al panel izquierdo y controles dentro del detalle de cada libro.</span><SettingPreview kind="lists" label={settings.enableLists ? "Visible" : "Oculta"} /></div>
            <div className="segmented-control"><button type="button" className={!settings.enableLists ? "active" : ""} onClick={() => setListsEnabled(false)} aria-pressed={!settings.enableLists}>Ocultar</button><button type="button" className={settings.enableLists ? "active" : ""} onClick={() => setListsEnabled(true)} aria-pressed={settings.enableLists}>Mostrar</button></div>
          </div>
          {settings.enableLists && <>
            <div className="setting-row"><div><strong>Vista de libros</strong><span>Cambia cómo se muestran los títulos dentro de una lista.</span><SettingPreview kind="list-display" /></div><div className="segmented-control"><button className={settings.listDisplay === "grid" ? "active" : ""} onClick={() => setSettings({ ...settings, listDisplay: "grid" })}>Portadas</button><button className={settings.listDisplay === "compact" ? "active" : ""} onClick={() => setSettings({ ...settings, listDisplay: "compact" })}>Compacta</button></div></div>
            <div className="setting-row"><div><strong>Orden de las listas</strong><span>Se aplica dentro de cada colección personal.</span></div><div className="segmented-control"><button className={settings.listSort === "manual" ? "active" : ""} onClick={() => setSettings({ ...settings, listSort: "manual" })}>Agregado</button><button className={settings.listSort === "title" ? "active" : ""} onClick={() => setSettings({ ...settings, listSort: "title" })}>Título</button><button className={settings.listSort === "rating" ? "active" : ""} onClick={() => setSettings({ ...settings, listSort: "rating" })}>Nota</button></div></div>
            <div className="setting-row"><div><strong>Contadores</strong><span>Muestra cuántos libros contiene cada lista en sus pestañas.</span></div><div className="segmented-control"><button className={!settings.listShowCounts ? "active" : ""} onClick={() => setSettings({ ...settings, listShowCounts: false })}>Ocultos</button><button className={settings.listShowCounts ? "active" : ""} onClick={() => setSettings({ ...settings, listShowCounts: true })}>Visibles</button></div></div>
          </>}
        </section>

        <section className="settings-card settings-extensions">
          <div className="settings-card-heading extension-heading">
            <span><Code2 size={19} /></span>
            <div><h2>Extensiones de Folio</h2><p>Personaliza la interfaz con CSS y automatizaciones locales aisladas.</p></div>
            <button className="new-extension" onClick={createExtension}><Plus size={15} /> Nueva</button>
          </div>
          <div className="extension-safety"><CircleAlert size={16} /><span>Usa código que entiendas. El JavaScript se ejecuta aislado y solo puede cambiar opciones mediante la API permitida; el CSS sí modifica la apariencia de Folio.</span></div>

          {extensions.length ? (
            <div className="extension-list">
              {extensions.map((extension) => (
                <div className={`extension-item ${extension.enabled ? "enabled" : ""}`} key={extension.id}>
                  <button type="button" className="extension-toggle" onClick={() => toggleExtension(extension)} aria-pressed={extension.enabled} aria-label={`${extension.enabled ? "Desactivar" : "Activar"} ${extension.name}`}>
                    <ExtensionLogo extension={extension} />
                    <span className="extension-copy"><strong>{extension.name}</strong><small>{extension.description || `${extension.css.trim() ? "CSS" : "sin CSS"} · ${extension.script.trim() ? "JavaScript" : "sin JavaScript"}`}</small><em className="extension-state">{extension.enabled ? "Activa" : "Desactivada"}</em></span>
                    <span className="toggle-track"><i /></span>
                  </button>
                  <div className="extension-actions">
                    {extension.builtIn ? <span className="built-in-label">Integrada</span> : <>
                      <button onClick={() => editExtension(extension)}><Pencil size={14} /> Editar</button>
                      {pendingExtensionDelete === extension.id ? (
                        <><button className="danger" onClick={() => deleteExtension(extension.id)}>Confirmar</button><button onClick={() => setPendingExtensionDelete(null)}>Cancelar</button></>
                      ) : <button className="danger" onClick={() => setPendingExtensionDelete(extension.id)}><Trash2 size={14} /> Eliminar</button>}
                    </>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="extensions-empty"><Code2 size={22} /><div><strong>No hay extensiones todavía</strong><span>Crea una para cambiar estilos, opciones o pequeños comportamientos sin modificar Folio.</span></div></div>
          )}

          {extensionDraft && (
            <div className="extension-editor">
              <div className="extension-editor-heading"><div><strong>{extensions.some((extension) => extension.id === extensionDraft.id) ? "Editar extensión" : "Nueva extensión"}</strong><span>Se guarda únicamente en este dispositivo y dentro de tu copia JSON.</span></div><button onClick={() => setExtensionDraft(null)} aria-label="Cerrar editor"><X size={16} /></button></div>
              <label><span>Nombre</span><input value={extensionDraft.name} maxLength={60} onChange={(event) => setExtensionDraft({ ...extensionDraft, name: event.target.value })} /></label>
              <div className="extension-code-grid">
                <label><span>CSS</span><small>Apunta a clases de Folio, por ejemplo <code>.book-card</code>.</small><textarea spellCheck={false} value={extensionDraft.css} onChange={(event) => setExtensionDraft({ ...extensionDraft, css: event.target.value })} placeholder={".book-card {\n  filter: saturate(1.15);\n}"} /></label>
                <label><span>JavaScript aislado</span><small>API: <code>folio.notify()</code>, <code>setSetting()</code>, <code>setVariable()</code> y <code>addClass()</code>.</small><textarea spellCheck={false} value={extensionDraft.script} onChange={(event) => setExtensionDraft({ ...extensionDraft, script: event.target.value })} placeholder={'folio.setSetting("accent", "sage");\nfolio.notify("Extensión activa");'} /></label>
              </div>
              <details className="extension-api-help"><summary>Ver opciones admitidas</summary><p><code>{'folio.setSetting("theme", "oled")'}</code> · <code>{'folio.setSetting("showRecommendations", false)'}</code> · <code>{'folio.setVariable("--radius", "24px")'}</code> · <code>{'folio.addClass("ext-mi-estilo")'}</code>. El contexto de solo lectura está en <code>folio.context</code>.</p></details>
              <div className="extension-editor-actions"><button onClick={() => setExtensionDraft(null)}>Cancelar</button><button className="primary" onClick={saveExtension}><Check size={15} /> Guardar extensión</button></div>
            </div>
          )}
        </section>

        <section className="settings-card settings-data">
          <div className="settings-card-heading"><span><ArrowDownToLine size={19} /></span><div><h2>Tus datos</h2><p>Todo vive en este equipo. Guarda una copia cuando quieras.</p></div></div>
          <button className="data-action" onClick={exportJson} disabled={exporting}><span><FileJson size={20} /></span><div><strong>{exporting ? "Preparando copia…" : "Exportar copia completa"}</strong><small>Libros, portadas, listas, notas, aprendizaje y preferencias · JSON v2</small></div><Download size={18} /></button>
          <button className="data-action" onClick={exportSettings}><span><SlidersHorizontal size={20} /></span><div><strong>Exportar configuración</strong><small>Solo apariencia, comportamiento, catálogo, recomendaciones y extensiones · JSON</small></div><Download size={18} /></button>
          <label className="data-action file-action"><span><SlidersHorizontal size={20} /></span><div><strong>Importar configuración</strong><small>Aplica preferencias sin reemplazar tus libros, notas ni listas</small></div><Upload size={18} /><input type="file" accept="application/json,.json" onChange={importSettings} /></label>
          <button className="data-action" onClick={exportCsv}><span><Library size={20} /></span><div><strong>Exportar lista</strong><small>Compatible con Excel y hojas de cálculo · CSV</small></div><Download size={18} /></button>
          <label className="data-action file-action"><span><Upload size={20} /></span><div><strong>Importar una copia</strong><small>Recupera una exportación anterior · JSON</small></div><ChevronRight size={18} /><input type="file" accept="application/json,.json" onChange={importJson} /></label>
        </section>

        <section className="settings-card settings-about">
          <div className="settings-card-heading"><span><CircleAlert size={19} /></span><div><h2>Acerca de Folio</h2><p>Un tracker privado y sin cuentas.</p></div></div>
          <div className="about-lines"><span>Catálogo activo</span><strong>{CATALOG_PROVIDER_INFO[settings.catalogProvider].name}</strong><span>Recomendaciones</span><strong>{settings.showRecommendations ? (settings.recommendationMode === "basic" ? "Personalizadas" : "IA local") : "Ocultas"}</strong><span>Listas</span><strong>{settings.enableLists ? `${customLists.length} creadas` : "Desactivadas"}</strong><span>Extensiones</span><strong>{extensions.filter((extension) => extension.enabled).length} activas</strong><span>Almacenamiento</span><strong>Solo en este dispositivo</strong><span>Versión</span><strong>1.5.0</strong></div>
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
    if (view === "lists") return renderLists();
    if (view === "settings") return renderSettings();
    if (view === "search") return renderSearch();
    if (view === "wishlist") return renderBookGrid(wishlist, { title: "Tu lista está vacía", copy: "Usa el icono de carpeta al descubrir un libro que quieras leer después." }, false, "wishlist");
    return renderBookGrid(abandoned, { title: "Ningún libro abandonado", copy: "Si un libro no era para este momento, puedes dejarlo aquí sin culpa." }, false, "abandoned");
  }

  const selectedSaved = selectedBook ? libraryById.has(selectedBook.id) : false;
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

          {settings.enableLists && selectedSaved && (
            <div className="detail-lists">
              <div><ListPlus size={17} /><span><strong>Listas personales</strong><small>Añade este libro a una o varias colecciones.</small></span></div>
              {customLists.length ? <div className="detail-list-options">{customLists.map((list) => {
                const included = list.bookIds.includes(selectedBook.id);
                return <button key={list.id} className={`list-color-${list.color} ${included ? "active" : ""}`} onClick={() => toggleBookInList(list.id, selectedBook.id)} aria-pressed={included}>{included ? <Check size={13} /> : <Plus size={13} />}{list.name}</button>;
              })}</div> : <button className="create-list-from-detail" onClick={() => { closeBookDetail(); setView("lists"); setListCreatorOpen(true); }}><FolderPlus size={14} /> Crear la primera lista</button>}
            </div>
          )}

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
      className={`app-shell ${extensionClasses.join(" ")}`}
      style={extensionVariables as CSSProperties}
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
      data-catalog-language={settings.catalogLanguage}
      data-catalog-quality={settings.catalogQuality}
      data-recommendation-mode={settings.recommendationMode}
      data-recommendations={settings.showRecommendations ? "on" : "off"}
      data-radiation={radiationSnow ? "on" : "off"}
      data-lists={settings.enableLists ? "on" : "off"}
      data-list-display={settings.listDisplay}
    >
      {extensions.filter((extension) => extension.enabled && extension.css.trim()).map((extension) => (
        <style key={`style-${extension.id}`}>{extension.css.slice(0, 60000)}</style>
      ))}
      {extensions.filter((extension) => extension.enabled && extension.script.trim()).map((extension) => (
        <iframe
          className="extension-runtime"
          key={`runtime-${extension.id}-${extension.updatedAt}`}
          title={`Extensión ${extension.name}`}
          sandbox="allow-scripts"
          srcDoc={extensionRuntimeDocument(extension, settings, library.length)}
        />
      ))}
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <button className="brand" onClick={() => navigate("home")} aria-label="Folio, ir al inicio"><span className="brand-mark" aria-hidden="true" /><strong>Folio</strong></button>
        <nav aria-label="Navegación principal">
          {navItems.filter((item) => item.id !== "lists" || settings.enableLists).map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)} title={item.label}><Icon size={20} /><span>{item.label}</span></button>;
          })}
        </nav>
        <div className="sidebar-note"><span>{library.length}</span><small>libros<br />guardados</small></div>
      </aside>

      <div className="workspace">
        {radiationSnow && (
          <div className="radiation-snow" aria-hidden="true">
            {RADIATION_PARTICLES.map((particle, index) => (
              <i
                key={index}
                className="radiation-particle"
                style={{
                  "--radiation-x": particle.x,
                  "--radiation-size": particle.size,
                  "--radiation-duration": particle.duration,
                  "--radiation-delay": particle.delay,
                  "--radiation-drift": particle.drift,
                  "--radiation-opacity": particle.opacity,
                } as CSSProperties}
              />
            ))}
          </div>
        )}
        <header className="topbar">
          <div className="page-identity">
            <button className="mobile-menu" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Abrir menú"><Menu size={21} /></button>
            <div><span>{currentTitle.eyebrow}</span><h1>{currentTitle.title}</h1></div>
          </div>
          <form className="search-form" onSubmit={submitSearch} role="search">
            <button type="submit" className="search-submit" aria-label={`Buscar con ${CATALOG_PROVIDER_INFO[settings.catalogProvider].name}`}><Search size={18} /></button>
            <input
              value={searchInput}
              onChange={(event) => updateSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }}
              enterKeyHint="search"
              placeholder="Buscar por título, autor o ISBN"
              aria-label="Buscar libros"
            />
            {searchInput && <button type="button" onClick={() => setSearchInput("")} aria-label="Borrar búsqueda"><X size={16} /></button>}
            <kbd>Enter</kbd>
          </form>
          <div className="profile-pill"><span>Mi biblioteca</span><div>LS</div></div>
        </header>

        <main className={`main-content ${selectedBook && settings.detailMode !== "modal" ? "showing-detail" : ""} ${selectedBook && settings.detailMode === "full" ? "showing-detail-full" : ""}`}>
          {selectedBook && settings.detailMode !== "modal" ? renderBookDetail(settings.detailMode) : renderView()}
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
