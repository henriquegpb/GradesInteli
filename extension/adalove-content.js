// adalove-content.js — mundo isolado, roda no Adalove.
// Recebe a resposta /userdata capturada pelo interceptor e guarda como
// `lastCapture` (sempre sobrescrita, nunca consumida). A cada clique no botão,
// re-arma o `pendingImport` a partir da última captura e abre/recarrega o
// GradesInteli — assim a importação acontece TODA VEZ que você clica.

(function () {
  const TAG = "__GRADESINTELI_USERDATA__";
  const GRADES_URL = "https://gradesinteli.vercel.app";

  let hasData = false;

  // Guarda a captura mais recente. Não é consumida — o reader (GradesInteli)
  // consome o `pendingImport`, que é re-armado a cada clique.
  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const data = e.data;
    if (!data || data.source !== TAG || typeof data.body !== "string") return;

    chrome.storage.local.set(
      { lastCapture: { json: data.body, capturedAt: Date.now(), url: data.url } },
      () => {
        hasData = true;
        updateButton();
      }
    );
  });

  function openGrades() {
    chrome.storage.local.get("lastCapture", (res) => {
      const cap = res && res.lastCapture;
      if (!cap || typeof cap.json !== "string") {
        alert("Abra a aba Notas e aguarde as atividades carregarem antes de importar.");
        return;
      }
      // Re-arma o import com timestamp do clique. O GradesInteli só importa
      // capturas recentes, e cada clique gera uma nova.
      chrome.storage.local.set(
        { pendingImport: { json: cap.json, requestedAt: Date.now() } },
        () => {
          // Reaproveita a mesma aba (target nomeado) e força o reload com uma
          // query única — assim o content script do GradesInteli roda de novo
          // e reimporta a cada clique.
          window.open(GRADES_URL + "/?i=" + Date.now(), "gradesinteli");
        }
      );
    });
  }

  let btn;
  function ensureButton() {
    if (btn || !document.body) return;
    btn = document.createElement("button");
    Object.assign(btn.style, {
      position: "fixed",
      bottom: "20px",
      left: "20px",
      zIndex: "2147483647",
      padding: "12px 35px",
      background: "#6366f1",
      color: "#fff",
      border: "none",
      borderRadius: "10px",
      fontSize: "14px",
      fontWeight: "600",
      fontFamily: "system-ui, -apple-system, sans-serif",
      cursor: "pointer",
      boxShadow: "0 4px 16px rgba(0,0,0,.35)",
      opacity: "0.55",
      transition: "opacity .15s",
    });
    btn.addEventListener("mouseenter", () => (btn.style.opacity = "1"));
    btn.addEventListener("mouseleave", () => (btn.style.opacity = hasData ? "1" : "0.55"));
    btn.addEventListener("click", openGrades);
    document.body.appendChild(btn);
    updateButton();
  }

  function updateButton() {
    ensureButton();
    if (!btn) return;
    btn.textContent = hasData ? "✓ Abrir no GradesInteli" : "Aguardando notas…";
    btn.style.opacity = hasData ? "1" : "0.55";
  }

  // Se a página recarregar/navegar, recupera o estado de "tem captura".
  chrome.storage.local.get("lastCapture", (res) => {
    if (res && res.lastCapture && typeof res.lastCapture.json === "string") {
      hasData = true;
      updateButton();
    }
  });

  if (document.body) ensureButton();
  else document.addEventListener("DOMContentLoaded", ensureButton);
})();
