#!/usr/bin/env node
// Quebra o JSON exportado pelo modo de captura em um fixture por endpoint.
//
//   node scripts/split-captures.mjs ../data/adalove-capturas-2026-08-11.json
//
// Os arquivos saem em fixtures/, que é gitignorado: são respostas reais e
// trazem dados pessoais. Para compartilhar, passe antes pelo anonimizador e
// salve como *.sample.json.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "..", "fixtures");

const input = process.argv[2];
if (!input) {
  console.error("uso: node scripts/split-captures.mjs <captura.json>");
  process.exit(1);
}

/** "GET /students/btgpactual/bank-slips" → "students-btgpactual-bank-slips" */
function fileNameFor(key) {
  return key
    .replace(/^[A-Z]+\s+\//, "")
    .replace(/:/g, "")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .replace(/-+/g, "-")
    .toLowerCase();
}

const capture = JSON.parse(readFileSync(resolve(input), "utf8"));
mkdirSync(outDir, { recursive: true });

let written = 0;
const skipped = [];

for (const entry of capture.entries ?? []) {
  if (!entry.body) {
    skipped.push(`${entry.key} (${entry.skipped ?? "sem body"})`);
    continue;
  }
  let parsed;
  try {
    parsed = JSON.parse(entry.body);
  } catch {
    skipped.push(`${entry.key} (body não é JSON)`);
    continue;
  }

  const name = `${fileNameFor(entry.key)}.json`;
  writeFileSync(join(outDir, name), JSON.stringify(parsed, null, 2));
  console.log(`  ${name.padEnd(46)} ${entry.key}`);
  written += 1;
}

console.log(`\n${written} fixture(s) em adalove-ui/fixtures/`);
if (skipped.length) console.log("pulados:\n  " + skipped.join("\n  "));
