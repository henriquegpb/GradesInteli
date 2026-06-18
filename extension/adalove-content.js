// adalove-content.js — mundo isolado, roda no Adalove.
// Recebe a resposta /userdata capturada pelo interceptor, guarda no
// chrome.storage.local e mostra um botão flutuante para abrir o GradesInteli
// já com os dados.

(function () {
  const TAG = "__GRADESINTELI_USERDATA__";
  const GRADES_URL = "https://gradesinteli.vercel.app";

  let hasData = false;

  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const data = e.data;
    if (!data || data.source !== TAG || typeof data.body !== "string") return;

    chrome.storage.local.set(
      { pendingImport: { json: data.body, capturedAt: Date.now(), url: data.url } },
      () => {
        hasData = true;
        updateButton();
      }
    );
  });

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
    btn.addEventListener("click", () => {
      if (!hasData) {
        alert("Abra a aba Notas e aguarde as atividades carregarem — aí o botão fica ativo.");
        return;
      }
      window.open(GRADES_URL, "_blank");
    });
    document.body.appendChild(btn);
    updateButton();
  }

  function updateButton() {
    ensureButton();
    if (!btn) return;
    btn.textContent = hasData ? "✓ Abrir no GradesInteli" : "Aguardando notas…";
    btn.style.opacity = hasData ? "1" : "0.55";
  }

  if (document.body) ensureButton();
  else document.addEventListener("DOMContentLoaded", ensureButton);
})();
