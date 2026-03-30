# Grades Inteli ⭐

**Uma plataforma open source para os alunos do Inteli nunca mais serem pegos de surpresa nas notas.**

Importa o HTML do Adalove, calcula tudo automaticamente e mostra exatamente o que você precisa tirar na prova pra passar. Simples assim.

---

## Por que isso existe?

Porque nenhum aluno deveria reprovar por falta de visibilidade. A famosa [planilha de notas](https://docs.google.com/spreadsheets/d/1PmS8W2Wg32J6AM097Om1dvlKDnFfx0FmIF6EjEY7H7E/edit?usp=sharing) ajudou muita gente, mas dava trabalho demais. Esse projeto automatiza tudo e transforma os dados em um dashboard que faz sentido.

**Grades Inteli é patrimônio dos alunos.** Código aberto, sem pegadinha, sem login, sem coleta de dados. Roda 100% no seu browser.

## O que faz

- **Importação direta do Adalove** — salva a página de notas como HTML e faz upload. Pronto.
- **Cálculo automático** — acumulado por categoria, média até o momento, nota necessária na prova.
- **Simulação** — escolhe uma nota alvo e vê em tempo real o que precisa acontecer.
- **Participação** — seleciona sua categoria (A-E) e vê o impacto real no resultado final.
- **Persistência local** — tudo fica salvo no localStorage do seu browser. Fecha e abre de novo, tá tudo lá.
- **Tema claro/escuro** — porque cada um tem seu estilo.

## Como usar

1. Acesse o [site](https://grades-inteli.vercel.app) ou rode localmente
2. No Adalove, vá em suas notas e salve a página completa (Ctrl+S / Cmd+S)
3. Clique em "Importar Adalove" e selecione o arquivo `.html`
4. Pronto — suas notas aparecem no dashboard

## Rodando localmente

```bash
git clone https://github.com/henriquegpb/GradesInteli.git
cd GradesInteli
npm install
npm run dev
```

Acesse `http://localhost:3000`

## Stack

- **Next.js** com export estático (zero backend)
- **TypeScript**
- **CSS puro** (CSS Modules)
- **localStorage** para persistência
- **Lucide React** para ícones

## Contribuindo

O projeto é dos alunos, pra os alunos. Se quiser melhorar alguma coisa:

1. Fork o repositório
2. Cria uma branch (`git checkout -b minha-feature`)
3. Commit suas mudanças
4. Abre um PR

Toda contribuição é bem-vinda — de correção de bug a feature nova.

## Licença

MIT — use, modifique, distribua. Só não vende como se fosse seu.

---

Feito com café e desespero por [Henrique Barone](https://github.com/henriquegpb).
Inspirado na famosa [planilha](https://docs.google.com/spreadsheets/d/1PmS8W2Wg32J6AM097Om1dvlKDnFfx0FmIF6EjEY7H7E/edit?usp=sharing) que salvou muita gente.
