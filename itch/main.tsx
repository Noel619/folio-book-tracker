import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import HomePage from "../app/page";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) throw new Error("No se encontró el punto de montaje de Folio.");

createRoot(root).render(
  <StrictMode>
    <HomePage />
  </StrictMode>,
);
