# Folio

Folio es un Book Tracker local, privado y minimalista. Permite buscar títulos en Open Library y organizar una biblioteca personal sin cuentas ni servidores propios.

## Funciones

- libros en curso con progreso de lectura;
- historial de libros leídos, año y nota de 0 a 100;
- listas de “Por leer” y “Abandonados”;
- cronograma filtrado por año;
- búsqueda por título, autor, ISBN o enlace de Open Library;
- preferencias de tipografía, tamaño y color de acento;
- exportación completa en JSON, lista en CSV e importación de copias JSON.

Los libros y ajustes se guardan únicamente en el almacenamiento local del navegador de este equipo. Conviene exportar una copia JSON de vez en cuando.

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

## Catálogo

La búsqueda y las portadas proceden de [Open Library](https://openlibrary.org/developers/api), una API pública que no requiere clave. Folio sigue funcionando con los libros ya guardados aunque el catálogo no esté disponible temporalmente.

## Distribución para itch.io

La versión web estática se genera con:

```bash
npm run build:itch
```

El contenido resultante de `itch-dist` puede comprimirse directamente como proyecto HTML5 de itch.io.
