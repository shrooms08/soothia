// Registers Soothia's fonts on the host document. @font-face rules inside a
// shadow root's stylesheet are not registered by Chrome, so the FontFace API
// is used instead. Family names are namespaced ("Soothia Lora") so they
// never clash with, or override, the host site's own fonts. If anything
// fails, the stylesheet's fallbacks (Georgia, system-ui, Menlo) take over.
import { FONT_MONO, FONT_SANS, FONT_SERIF } from "./styles";

// Latin subsets of the variable fonts, extracted from the design sheet.
const FACES: { family: string; file: string; style: "normal" | "italic" }[] = [
  { family: FONT_SERIF, file: "fonts/soothia-lora.woff2", style: "normal" },
  { family: FONT_SERIF, file: "fonts/soothia-lora-italic.woff2", style: "italic" },
  { family: FONT_SANS, file: "fonts/soothia-inter.woff2", style: "normal" },
  { family: FONT_MONO, file: "fonts/soothia-jetbrains-mono.woff2", style: "normal" },
];

export function loadFonts(): void {
  if (typeof FontFace === "undefined" || !document.fonts) return;
  for (const face of FACES) {
    try {
      const font = new FontFace(face.family, `url(${chrome.runtime.getURL(face.file)}) format("woff2")`, {
        style: face.style,
        weight: "100 900",
        display: "swap",
      });
      document.fonts.add(font);
      font.load().catch(() => {});
    } catch {
      // Fallback fonts apply.
    }
  }
}
