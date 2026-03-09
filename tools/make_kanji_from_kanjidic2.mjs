import fs from "fs/promises";
import { readFileSync } from "fs";

// ============================
// CONFIG
// ============================
const INPUT = "./kanjidic2.xml";
const OUTPUT = "./assets/kanji.js";

// ============================
// HELPERS
// ============================
function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function decodeXml(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function getAllMatches(regex, text) {
  const out = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    out.push(m);
  }
  return out;
}

// ============================
// PARSE ONE CHARACTER BLOCK
// ============================
function parseCharacterBlock(block) {
  const literalMatch = block.match(/<literal>(.*?)<\/literal>/s);
  if (!literalMatch) return null;

  const k = decodeXml(literalMatch[1].trim());

  const gradeMatch = block.match(/<grade>(\d+)<\/grade>/);
  const g = gradeMatch ? Number(gradeMatch[1]) : 7;

  const on = getAllMatches(/<reading r_type="ja_on">(.*?)<\/reading>/gs, block)
    .map(m => decodeXml(m[1].trim()));

  const kun = getAllMatches(/<reading r_type="ja_kun">(.*?)<\/reading>/gs, block)
    .map(m => decodeXml(m[1].trim()));

  const meaningsFr = getAllMatches(/<meaning xml:lang="fr">(.*?)<\/meaning>/gs, block)
    .map(m => decodeXml(m[1].trim()));

  // Fallback anglais si jamais pas de FR
  const meaningsEn = getAllMatches(/<meaning>(.*?)<\/meaning>/gs, block)
    .map(m => decodeXml(m[1].trim()));

  const m = uniq(meaningsFr.length ? meaningsFr : meaningsEn);

  return {
    k,
    g,
    m,
    on: uniq(on),
    kun: uniq(kun),
  };
}

// ============================
// MAIN
// ============================
async function main() {
  console.log("Lecture de", INPUT);

  const xml = readFileSync(INPUT, "utf8");

  const characterBlocks = getAllMatches(/<character>([\s\S]*?)<\/character>/g, xml);
  console.log("Entrées XML trouvées :", characterBlocks.length);

  const parsed = [];

  for (const match of characterBlocks) {
    const block = match[0];
    const item = parseCharacterBlock(block);
    if (!item) continue;

    // On garde seulement les kanji utiles à ton quiz :
    // grades 1..6 + 7 (collège / reste)
    parsed.push(item);
  }

  // Option : ne garder que les kanji ayant au moins 1 sens
  const cleaned = parsed.filter(x => x.k && x.m.length > 0);

  const fileContent =
`// assets/kanji.js
// Généré automatiquement depuis KANJIDIC2
// Format : { k, g, m, on, kun }

export const KANJI = ${JSON.stringify(cleaned, null, 2)};
`;

  await fs.writeFile(OUTPUT, fileContent, "utf8");

  console.log("✅ Fichier créé :", OUTPUT);
  console.log("✅ Nombre de kanji écrits :", cleaned.length);
}

main().catch(err => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});