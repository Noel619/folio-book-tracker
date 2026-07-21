export type CoverAssetExport = {
  bookId: string;
  mimeType: string;
  dataUrl: string;
  updatedAt: number;
};

type CoverAssetRecord = {
  bookId: string;
  blob: Blob;
  mimeType: string;
  updatedAt: number;
};

const DB_NAME = "folio-assets-v1";
const STORE_NAME = "covers";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_HEIGHT = 1800;

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("El almacenamiento de imágenes no está disponible"));
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "bookId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(request.error || new Error("No se pudo abrir el almacenamiento de portadas"));
    };
  });

  return databasePromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    transaction.onerror = () => reject(transaction.error || new Error("No se pudo completar la operación"));
    operation(transaction.objectStore(STORE_NAME), resolve, reject);
  });
}

export async function getCoverAsset(bookId: string) {
  return withStore<Blob | undefined>("readonly", (store, resolve, reject) => {
    const request = store.get(bookId);
    request.onsuccess = () => resolve((request.result as CoverAssetRecord | undefined)?.blob);
    request.onerror = () => reject(request.error);
  });
}

export async function putCoverAsset(bookId: string, blob: Blob, updatedAt = Date.now()) {
  return withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.put({ bookId, blob, mimeType: blob.type || "image/webp", updatedAt } satisfies CoverAssetRecord);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCoverAsset(bookId: string) {
  return withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(bookId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearCoverAssets() {
  return withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("No se pudo preparar la portada"));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string) {
  const [header, encoded] = dataUrl.split(",", 2);
  const mimeType = header.match(/^data:([^;]+);base64$/)?.[1];
  if (!mimeType || !encoded) throw new Error("Portada de copia no válida");
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

export async function exportCoverAssets(bookIds: string[]) {
  const wanted = new Set(bookIds);
  return withStore<CoverAssetExport[]>("readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = async () => {
      try {
        const records = (request.result as CoverAssetRecord[]).filter((record) => wanted.has(record.bookId));
        resolve(await Promise.all(records.map(async (record) => ({
          bookId: record.bookId,
          mimeType: record.mimeType,
          dataUrl: await blobToDataUrl(record.blob),
          updatedAt: record.updatedAt,
        }))));
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function importCoverAssets(assets: CoverAssetExport[]) {
  const records = assets
    .filter((asset) => asset?.bookId && asset?.dataUrl)
    .map((asset) => ({
      bookId: asset.bookId,
      blob: dataUrlToBlob(asset.dataUrl),
      mimeType: asset.mimeType || "image/webp",
      updatedAt: asset.updatedAt || Date.now(),
    } satisfies CoverAssetRecord));
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("No se pudieron restaurar las portadas"));
    transaction.onabort = () => reject(transaction.error || new Error("No se pudieron restaurar las portadas"));
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    records.forEach((record) => store.put(record));
  });
}

export async function prepareCoverFile(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("La imagen supera el límite de 10 MB");

  let objectUrl = "";
  const source = typeof createImageBitmap === "function"
    ? await createImageBitmap(file)
    : await new Promise<HTMLImageElement>((resolve, reject) => {
        objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          objectUrl = "";
          reject(new Error("No se pudo abrir la imagen seleccionada"));
        };
        image.src = objectUrl;
      });
  try {
    const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    const scale = Math.min(1, MAX_IMAGE_WIDTH / sourceWidth, MAX_IMAGE_HEIGHT / sourceHeight);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("No se pudo procesar la portada");
    context.fillStyle = "#111216";
    context.fillRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!blob) throw new Error("No se pudo convertir la portada");
    return blob;
  } finally {
    if ("close" in source && typeof source.close === "function") source.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export function isAllowedImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateImageUrl(value: string, timeout = 10000) {
  if (!isAllowedImageUrl(value)) return Promise.reject(new Error("Usa un enlace HTTP o HTTPS válido"));
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => {
      image.src = "";
      reject(new Error("La imagen tardó demasiado en responder"));
    }, timeout);
    image.onload = () => {
      window.clearTimeout(timer);
      if (image.naturalWidth < 80 || image.naturalHeight < 120) {
        reject(new Error("La imagen es demasiado pequeña"));
      } else {
        resolve();
      }
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("No se pudo cargar la imagen del enlace"));
    };
    image.referrerPolicy = "no-referrer";
    image.src = value;
  });
}
