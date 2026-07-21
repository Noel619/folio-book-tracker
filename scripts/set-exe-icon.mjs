import rcedit from "rcedit";

const [, , executablePath, iconPath] = process.argv;

if (!executablePath || !iconPath) {
  process.stderr.write("Uso: node set-exe-icon.mjs <exe> <icono>\n");
  process.exit(1);
}

try {
  await rcedit(executablePath, {
    icon: iconPath,
    "file-version": "1.0.0",
    "product-version": "1.0.0",
    "version-string": {
      ProductName: "Folio",
      FileDescription: "Folio Book Tracker",
      CompanyName: "Folio",
    },
  });
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
