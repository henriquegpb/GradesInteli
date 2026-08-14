# Adalove Modern UI (extensão)

Duas coisas, num pacote só:

1. **Interface nova para o Adalove**, montada dentro da própria página. É o
   `adalove-ui/` compilado (`dist/adalove-ui.js`) — telas, rotas e arquitetura
   estão documentadas em [`../adalove-ui/README.md`](../adalove-ui/README.md).
2. **Importação de notas e faltas** para o [GradesInteli](https://www.gradesinteli.com),
   sem precisar salvar a página em HTML (CMD+S). É o fluxo original da extensão e
   segue funcionando igual.

## Como funciona

O Adalove, ao abrir a aba **Notas**, busca seus dados em
`GET https://apiv2.inteli.edu.br/sections/{turma}/userdata`. A extensão apenas
**observa essa resposta** (que o app já buscou, usando a sua própria sessão),
guarda localmente e, ao clicar no botão, abre o GradesInteli já preenchido.

A interface nova usa a mesma sessão: o content script roda no mundo ISOLADO **na
origem do Adalove**, então lê o token do `localStorage` dele e chama a apiv2
direto. A UI original nunca é destruída, só escondida por CSS.

- Não mexe no seu token nem faz login por você.
- Não envia nada para servidores de terceiros — os dados vão direto do seu
  navegador (Adalove → GradesInteli) via `chrome.storage` local + `postMessage`.

## Instalar (modo desenvolvedor)

1. Abra `chrome://extensions` (ou `edge://extensions`).
2. Ative o **Modo do desenvolvedor**.
3. **Carregar sem compactação** / **Load unpacked** → selecione esta pasta (`extension`).

O `dist/adalove-ui.js` é gerado por `npm run build` dentro de `../adalove-ui` — não
é editado à mão.

## Usar

No Adalove logado aparecem dois botões nos cantos de baixo:

- **"✦ UI nova"**, à esquerda → liga a interface nova. A preferência fica em
  `chrome.storage.local` (`uiMode`), então nas próximas visitas ela já abre assim;
  dentro dela, **"UI original"** no pé do menu desliga.
- **"✓ Abrir no GradesInteli"**, à direita → abre o dashboard numa nova aba já com
  suas notas e faltas. Antes das atividades carregarem ele diz "Aguardando notas…".

## Arquivos

| Arquivo | Mundo | Onde roda | Papel |
|---|---|---|---|
| `adalove-interceptor.js` | MAIN | adalove.inteli.edu.br | Captura a resposta `/userdata` via patch em fetch/XHR |
| `adalove-boot.js` | isolado | adalove.inteli.edu.br | `document_start`: esconde a UI deles antes do React montar, se a preferência é a UI nova |
| `adalove-content.js` | isolado | adalove.inteli.edu.br | Salva a captura e mostra o botão de importar |
| `dist/adalove-ui.js` | isolado | adalove.inteli.edu.br | A interface nova (shadow root) e o botão que liga ela |
| `adalove-capture.js` | MAIN | adalove.inteli.edu.br | Ferramenta de desenvolvimento: grava os payloads de uma página para reconstruí-la |
| `grades-content.js` | isolado | www.gradesinteli.com | Entrega os dados à página via `postMessage` |

O app escuta `window.postMessage({ type: "GRADESINTELI_IMPORT", payload })` em
`src/hooks/useGradeDashboard.ts` e responde com `GRADESINTELI_IMPORT_OK`.

O `adalove-boot.js` carrega uma cópia da lista de rotas cobertas pela overlay
(`adalove-ui/src/shell/routes.ts` é a fonte da verdade): ele roda antes de
qualquer bundler e precisa decidir na hora se esconde o `#root` — numa rota que
não cobrimos, esconder daria tela branca.

## Desenvolvimento local

O `manifest.json` também casa com `http://localhost/*`, então dá para testar o
fluxo com o GradesInteli rodando em `npm run dev` (qualquer porta).

Para a interface nova, 95% do trabalho acontece em `../adalove-ui` com
`npm run dev` — sem Adalove e sem rede, contra um fixture gravado.
