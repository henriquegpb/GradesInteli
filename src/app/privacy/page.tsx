import type { Metadata } from "next";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Política de Privacidade — GradesInteli",
  description:
    "Como o GradesInteli e a extensão Adalove → GradesInteli tratam os seus dados.",
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.content}>
        <h1>Política de Privacidade</h1>
        <p className={styles.updated}>Última atualização: 23 de junho de 2026</p>

        <p>
          O <strong>GradesInteli</strong> e a extensão de navegador{" "}
          <strong>Adalove → GradesInteli</strong> foram feitos para ajudar alunos do
          Inteli a acompanharem suas notas. Esta política explica, de forma direta, o
          que acontece com os seus dados.
        </p>

        <h2>Resumo</h2>
        <p>
          Nós <strong>não coletamos, não armazenamos e não enviamos</strong> seus dados
          para nenhum servidor nosso ou de terceiros. Tudo acontece localmente, no seu
          próprio navegador.
        </p>

        <h2>Quais dados são usados</h2>
        <p>
          Quando você abre a aba <em>Notas</em> no Adalove, a plataforma carrega suas
          atividades e notas. A extensão apenas <strong>observa</strong> essa resposta
          (que o próprio Adalove já buscou usando a sua sessão) e a disponibiliza para o
          dashboard do GradesInteli. Os dados envolvidos são: nome do aluno, atividades,
          notas, pesos e informações de presença da sua turma.
        </p>

        <h2>Como os dados trafegam</h2>
        <ul>
          <li>
            A extensão guarda os dados <strong>temporariamente</strong> no
            armazenamento local do navegador (<code>chrome.storage.local</code>), apenas
            pelo tempo necessário para transferi-los à aba do GradesInteli.
          </li>
          <li>
            A transferência ocorre <strong>diretamente entre as abas do seu navegador</strong>{" "}
            (Adalove → GradesInteli). Nada passa por um servidor intermediário.
          </li>
          <li>
            Após a entrega, os dados temporários da extensão são removidos.
          </li>
          <li>
            No GradesInteli, os dados ficam salvos somente no{" "}
            <code>localStorage</code> do seu navegador, no seu dispositivo. Você pode
            apagá-los a qualquer momento limpando os dados do site.
          </li>
        </ul>

        <h2>O que NÃO fazemos</h2>
        <ul>
          <li>Não enviamos seus dados para servidores próprios ou de terceiros.</li>
          <li>Não vendemos nem compartilhamos seus dados.</li>
          <li>Não usamos seus dados para publicidade.</li>
          <li>Não acessamos seu token de login nem fazemos login por você.</li>
          <li>Não acessamos nenhum site além do Adalove e do GradesInteli.</li>
        </ul>

        <h2>Permissões da extensão</h2>
        <ul>
          <li>
            <strong>adalove.inteli.edu.br</strong> — ler as notas, atividades e
            presenças que a página já carregou.
          </li>
          <li>
            <strong>www.gradesinteli.com</strong> — entregar esses dados ao
            dashboard.
          </li>
          <li>
            <strong>armazenamento (storage)</strong> — guardar os dados temporariamente
            durante a transferência.
          </li>
        </ul>

        <h2>Contato</h2>
        <p>
          Dúvidas sobre privacidade? Escreva para{" "}
          <a href="mailto:henrique@noraai.co">henrique@noraai.co</a> ou abra uma issue no{" "}
          <a
            href="https://github.com/henriquegpb/GradesInteli"
            target="_blank"
            rel="noopener noreferrer"
          >
            repositório no GitHub
          </a>
          .
        </p>

        <p className={styles.back}>
          <a href="/">← Voltar ao GradesInteli</a>
        </p>
      </article>
    </main>
  );
}
