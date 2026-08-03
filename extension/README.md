# Adalove → GradesInteli (extensão)

Importa suas notas e faltas do Adalove direto para o [GradesInteli](https://www.gradesinteli.com),
sem precisar salvar a página em HTML (CMD+S).

## Como funciona

O Adalove, ao abrir a aba **Notas**, busca seus dados em
`GET https://apiv2.inteli.edu.br/sections/{turma}/userdata`. A extensão apenas
**observa essa resposta** (que o app já buscou, usando a sua própria sessão),
guarda localmente e, ao clicar no botão, abre o GradesInteli já preenchido.

- Não mexe no seu token nem faz login por você.
- Não envia nada para servidores de terceiros — os dados vão direto do seu
  navegador (Adalove → GradesInteli) via `chrome.storage` local + `postMessage`.

## Instalar (modo desenvolvedor)

1. Abra `chrome://extensions` (ou `edge://extensions`).
2. Ative o **Modo do desenvolvedor**.
3. **Carregar sem compactação** / **Load unpacked** → selecione esta pasta (`extension`).

## Usar

1. Acesse o Adalove logado e abra a aba **Notas** (Acadêmico → Vida Acadêmica → Notas).
2. Aguarde as atividades carregarem. O botão no canto inferior direito muda para
   **"✓ Abrir no GradesInteli"**.
3. Clique nele. O GradesInteli abre em uma nova aba já com suas notas e faltas importadas.

## Arquivos

| Arquivo | Mundo | Onde roda | Papel |
|---|---|---|---|
| `adalove-interceptor.js` | MAIN | adalove.inteli.edu.br | Captura a resposta `/userdata` via patch em fetch/XHR |
| `adalove-content.js` | isolado | adalove.inteli.edu.br | Salva a captura e mostra o botão |
| `grades-content.js` | isolado | www.gradesinteli.com | Entrega os dados à página via `postMessage` |

O app escuta `window.postMessage({ type: "GRADESINTELI_IMPORT", payload })` em
`src/hooks/useGradeDashboard.ts` e responde com `GRADESINTELI_IMPORT_OK`.

## Desenvolvimento local

O `manifest.json` também casa com `http://localhost/*`, então dá para testar o
fluxo com o GradesInteli rodando em `npm run dev` (qualquer porta).
