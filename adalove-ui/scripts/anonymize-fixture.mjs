#!/usr/bin/env node
// Anonimiza uma captura de /userdata para virar fixture compartilhável.
//
// Um fixture só (3º ano) esconde bugs de outros anos — já houve um (commit
// 559fada, contagem de faltas do 3º ano). Pedir capturas a colegas é a única
// forma real de validar, mas a captura traz a turma inteira: nomes reais de
// terceiros que não consentiram. Este script troca os nomes por sintéticos e
// zera avatares, preservando a ESTRUTURA (uuids de ligação, grupos, pesos).
//
//   node scripts/anonymize-fixture.mjs entrada.json fixtures/turma-1ano.json [--keep-me]
//
// --keep-me preserva o nome do próprio aluno (o dono da captura), útil quando
// é a sua própria e você quer ver seu nome na UI.

import { readFileSync, writeFileSync } from "node:fs";

const [input, output, ...flags] = process.argv.slice(2);
if (!input || !output) {
  console.error("uso: node scripts/anonymize-fixture.mjs <entrada.json> <saida.json> [--keep-me]");
  process.exit(1);
}

const keepMe = flags.includes("--keep-me");
const data = JSON.parse(readFileSync(input, "utf8"));

const FIRST = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Felipe", "Gabriela", "Hugo",
  "Isabela", "João", "Karina", "Lucas", "Mariana", "Nuno", "Olívia", "Pedro",
  "Queila", "Rafael", "Sofia", "Thiago", "Úrsula", "Victor", "Wanda", "Yara", "Zeca"];
const LAST = ["Almeida", "Barbosa", "Cardoso", "Duarte", "Esteves", "Ferreira", "Gonçalves",
  "Henriques", "Ipiranga", "Junqueira", "Klein", "Lacerda", "Moraes", "Nogueira",
  "Oliveira", "Pacheco", "Quintana", "Ribeiro", "Santos", "Teixeira"];

const ownerUuid = data.activities?.[0]?.studentUuid ?? null;
const names = new Map();
let i = 0;

function fakeName(uuid) {
  if (!names.has(uuid)) {
    const first = FIRST[i % FIRST.length];
    const last = LAST[Math.floor(i / FIRST.length) % LAST.length];
    names.set(uuid, `${first} ${last}`);
    i += 1;
  }
  return names.get(uuid);
}

let anonymized = 0;
for (const student of data.students ?? []) {
  if (keepMe && student.uuid === ownerUuid) continue;
  student.name = fakeName(student.uuid);
  student.avatar_filename = null;
  anonymized += 1;
}

// Professores também são pessoas reais identificáveis.
const professors = new Map();
for (const activity of data.activities ?? []) {
  for (const field of ["professorName", "assistantProfessorName"]) {
    const value = activity[field];
    if (!value) continue;
    if (!professors.has(value)) professors.set(value, `Prof. ${fakeName(`prof:${value}`)}`);
    activity[field] = professors.get(value);
  }
}
if (data.section?.advisorName) data.section.advisorName = `Prof. ${fakeName("advisor")}`;

writeFileSync(output, JSON.stringify(data));
console.log(
  `${output}: ${anonymized} alunos e ${professors.size} professores anonimizados` +
    `${keepMe ? " (nome do dono preservado)" : ""}.`,
);
