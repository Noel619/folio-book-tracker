# Folio

Folio es un Book Tracker local, privado y minimalista. Permite buscar títulos en varios catálogos y organizar una biblioteca personal sin cuentas ni servidores propios.

## Funciones

- libros en curso con progreso de lectura;
- historial de libros leídos, año y nota de 0 a 100;
- listas de “Por leer” y “Abandonados”;
- cronograma filtrado por año;
- búsqueda por título, autor, ISBN o enlace de Open Library con proveedor configurable;
- portadas personalizadas mediante archivo, enlace o sugerencias de otras ediciones;
- calidad de portada configurable y preferencia por imágenes grandes en tarjetas visibles;
- detalle configurable como modal o página completa con historial del navegador;
- nota personal y metadatos del libro opcionales dentro del detalle;
- temas, fondos, transparencias, tipografías, densidad, acentos, notas, tarjetas, esquinas y movimiento configurables;
- recomendaciones mediante algoritmo básico o un modelo local que pondera notas, búsquedas, abandonos, extensión y diversidad;
- exportación completa en JSON v2 —incluidas las portadas locales y el aprendizaje—, lista en CSV e importación de copias JSON v1 y v2.

Los libros, ajustes y portadas se guardan únicamente en el almacenamiento local del navegador de este equipo. Conviene exportar una copia JSON de vez en cuando.

## Cambiar una portada

Abre un libro guardado y haz doble clic sobre su portada, o usa el botón **Cambiar portada**. Puedes seleccionar una imagen local de hasta 10 MB, pegar un enlace HTTP/HTTPS o elegir una de las portadas sugeridas por Open Library. La portada original siempre se puede restaurar.

Desde **Configuración** puedes decidir si los libros se abren en una ventana o en una página completa, además de personalizar el tema, el fondo, la transparencia, los metadatos, la nota personal, las transiciones y el estilo general de Folio.

## Ejecutar en local

Puedes iniciar Folio sin escribir comandos:

- **Windows:** abre `Folio.exe` con doble clic.
- **macOS:** abre `Folio.command` con doble clic. La primera vez, si macOS bloquea la apertura, haz clic derecho sobre el archivo y elige **Abrir**. Si el archivo perdió el permiso de ejecución al copiarse, ejecuta una vez `chmod +x Folio.command` desde Terminal.

Ambos lanzadores inician el servidor local y abren la aplicación en el navegador automáticamente.

Requisitos: Node.js 22.13 o superior.

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Para comprobar la versión de producción:

```bash
npm run build
npm test
```

## Catálogos y velocidad

[Open Library](https://openlibrary.org/developers/api) continúa como opción predeterminada y no requiere clave. También se puede elegir [Google Books](https://developers.google.com/books/docs/v1/using), que necesita una clave API guardada solo en el dispositivo, [Gutendex](https://github.com/garethbjohnson/gutendex) para textos gratuitos de Project Gutenberg, o el modo automático que combina las fuentes disponibles.

Configuración permite medir la latencia real de cada proveedor desde el equipo del usuario. La velocidad depende de la conexión, la región, la caché y los límites de cada servicio, por lo que Folio no fija una API universalmente “más rápida”. Los libros guardados siguen disponibles aunque ningún catálogo responda.

## Recomendaciones locales

El algoritmo básico cruza autores, temas y búsquedas recientes. La opción **IA local** agrega la nota personal, los libros abandonados, la extensión habitual, textos breves y diversidad entre resultados. No usa un modelo remoto ni envía la biblioteca a un servicio de inteligencia artificial: el cálculo se realiza en el navegador y solo consulta el catálogo elegido para obtener candidatos.

## Distribución para itch.io

La versión web estática se genera con:

```bash
npm run build:itch
```

El contenido resultante de `itch-dist` puede comprimirse directamente como proyecto HTML5 de itch.io.
