# Grades Inteli ⭐

**Uma interface nova para o Adalove e um dashboard de notas open source, para os alunos do Inteli nunca mais serem pegos de surpresa.**

São duas peças que se completam:

- **Adalove Modern UI** — a extensão troca a interface do Adalove por uma reconstruída, renderizada dentro da própria página. Kanban de atividades, notas, faltas, calendário, notícias, financeiro, cardápio e o resto do menu, tudo com as URLs do Adalove. Um clique volta para a UI original.
- **GradesInteli** — o dashboard de notas: acumulado por categoria, média até o momento, quanto você precisa tirar na prova e simulação em tempo real.

---

## Por que isso existe?

Porque nenhum aluno deveria reprovar por falta de visibilidade. A famosa [planilha de notas](https://docs.google.com/spreadsheets/d/1PmS8W2Wg32J6AM097Om1dvlKDnFfx0FmIF6EjEY7H7E/edit?usp=sharing) ajudou muita gente, mas dava trabalho demais. Esse projeto automatiza tudo e transforma os dados em um dashboard que faz sentido — e, com o tempo, virou também uma casca nova para a plataforma que a gente abre todo dia.

**Grades Inteli é patrimônio dos alunos.** Código aberto, sem login, sem coleta de dados. Roda 100% no seu browser.

## Adalove Modern UI

A extensão monta a interface nova **dentro da página do Adalove**, num shadow root, usando a sua própria sessão. A UI original nunca é destruída — só escondida —, então voltar é sempre um clique e nenhum bug nosso te deixa sem plataforma.

- **Telas reconstruídas** — Vida acadêmica (visão geral com notas, faltas, calendário e simulador em abas), kanban de atividades com arrastar entre colunas, grupo, perfil, notícias, financeiro, cardápio, histórico e CRA, carreiras, intercâmbio, simulados, calendário acadêmico, biblioteca, normas institucionais, ferramentas e atendimento.
- **Rotas de verdade** — cada tela vive na mesma URL da página equivalente do Adalove (`/academic-life`, `/financial`, `/feed`, `/pages/tools`…). Voltar e avançar do navegador funcionam, F5 recarrega onde você estava e o link é compartilhável.
- **Kanban que escreve de volta** — mover um card manda o status para o Adalove na hora; se a chamada falhar, o card volta para a coluna original.
- **Tema claro/escuro** e o modo **Super Tech**, para quem gosta de tela preta.
- **Atalho para IA** — monta um prompt com o enunciado da atividade e abre no ChatGPT, Claude ou Gemini já preenchido (o Gemini não aceita pré-preenchimento, então ali é copiar e abrir).
- **Nada sai do seu navegador** — o token do Adalove é lido na própria origem dele e usado só ali.

Detalhes de arquitetura, mapa de rotas e como reconstruir uma tela nova: [`adalove-ui/README.md`](adalove-ui/README.md).

## Dashboard de notas

- **Importação direta do Adalove** — pela extensão (um clique) ou salvando a página de notas como HTML e fazendo upload.
- **Cálculo automático** — acumulado por categoria (ponderadas, artefatos, autoavaliação, prova), média até o momento e nota necessária na prova.
- **Simulação** — escolhe uma nota alvo e vê em tempo real o que precisa acontecer.
- **Faltas** — calcula quantas faltas ainda cabem no limite de 20%, com a mesma conta do Adalove (que é em horas-aula, e cada turma pesa suas chamadas de um jeito).
- **Participação** — seleciona sua categoria (A-E) e vê o impacto real no resultado final.
- **Persistência local** — tudo fica salvo no seu browser. Fecha e abre de novo, tá tudo lá.

## Como usar

A forma mais fácil é pela **extensão do navegador** — ela liga a interface nova e importa suas notas e faltas com um clique, sem salvar página nem fazer upload de arquivo.

[**📥 Baixe a extensão na Chrome Web Store**](https://chromewebstore.google.com/detail/adalove-%E2%86%92-gradesinteli/dpgoggjeajlgbkfabfhijccjfbchojpn)

1. Instale a extensão pelo link acima
2. Abra o [Adalove](https://adalove.inteli.edu.br) logado. Dois botões aparecem nos cantos de baixo:
   - **"✦ UI nova"**, à esquerda → troca para a interface nova. A escolha fica salva: nas próximas visitas ela já abre assim.
   - **"✓ Abrir no GradesInteli"**, à direita → abre o dashboard de notas já preenchido (espere as atividades carregarem primeiro)
3. Dentro da interface nova, **"UI original"** no pé do menu devolve a do Adalove

<p align="center">
  <img src="assets/img/AdaloveButton.png" alt="Botão 'Abrir no GradesInteli' dentro do Adalove" width="420" style="border-radius: 12px;" />
</p>

**Como funciona:** quando você abre suas notas, o Adalove já busca os dados na API dele. A extensão apenas *observa* essa resposta (usando a sua própria sessão), guarda no `chrome.storage` local e entrega direto ao GradesInteli via `postMessage`. Não mexe no seu token, não faz login por você e não manda nada para servidores de terceiros. Mais detalhes em [`extension/README.md`](extension/README.md).

<details>
<summary><b>Sem a extensão?</b> Importar via HTML (Ctrl+S / Cmd+S)</summary>

<br>

1. Acesse o [site](https://www.gradesinteli.com)
2. No Adalove, vá em suas notas e salve a página completa (Ctrl+S / Cmd+S)
3. Clique em "Importar Adalove" e selecione o arquivo `.html`
4. Pronto — suas notas aparecem no dashboard

</details>

<details>
<summary>Instalar a extensão em modo desenvolvedor</summary>

<br>

1. Abra `chrome://extensions` (ou `edge://extensions`)
2. Ative o **Modo do desenvolvedor**
3. **Carregar sem compactação** / **Load unpacked** → selecione a pasta `extension/`

</details>

## Star History

<a href="https://github.com/henriquegpb/gradesinteli/stargazers">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="assets/img/star-history-dark.svg" />
   <source media="(prefers-color-scheme: light)" srcset="assets/img/star-history-light.svg" />
   <img alt="Stars ao longo do tempo" src="assets/img/star-history-light.svg" width="720" />
 </picture>
</a>

## Rodando localmente

O site:

```bash
git clone https://github.com/henriquegpb/gradesinteli.git
cd gradesinteli
npm install
npm run dev            # http://localhost:3000
```

A interface do Adalove, contra um fixture gravado (sem Adalove e sem rede):

```bash
cd adalove-ui
npm install
npm run dev            # http://localhost:5173
npm run build          # → ../extension/dist/adalove-ui.js
```

## Stack

- **Next.js** com export estático (zero backend), **TypeScript** e **CSS Modules** — o site
- **Vite + React + Tailwind v4** em content script MV3, dentro de um shadow root — a interface do Adalove
- **localStorage** e `chrome.storage.local` para persistência
- **Lucide React** para ícones

O cálculo de nota e de faltas vive em `src/lib/` e é **compartilhado**: a extensão importa os mesmos módulos que o site usa em produção, porque duas implementações divergiriam em silêncio.

## Contribuindo

O projeto é dos alunos, para os alunos. Se quiser melhorar alguma coisa:

1. Fork o repositório
2. Cria uma branch (`git checkout -b minha-feature`)
3. Commit suas mudanças
4. Abre um PR

Toda contribuição é bem-vinda — de correção de bug a feature nova.

## Licença

MIT — use, modifique, distribua. Só não vende como se fosse seu.

---

Feito com Redbull e desespero por [Henrique Barone](https://github.com/henriquegpb).
Inspirado na famosa [planilha](https://docs.google.com/spreadsheets/d/1PmS8W2Wg32J6AM097Om1dvlKDnFfx0FmIF6EjEY7H7E/edit?usp=sharing) que salvou muita gente.
