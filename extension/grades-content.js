// grades-content.js — mundo isolado, roda no GradesInteli.
// Ao abrir o site, lê o import pendente do chrome.storage.local (gravado no
// Adalove) e o entrega à página via postMessage. O app escuta a mensagem
// "GRADESINTELI_IMPORT" e popula o dashboard.

(function () {
  const MAX_AGE_MS = 10 * 60 * 1000; // só importa capturas dos últimos 10 min

  chrome.storage.local.get("pendingImport", (res) => {
    const pending = res && res.pendingImport;
    if (!pending || typeof pending.json !== "string") return;
    if (Date.now() - (pending.capturedAt || 0) > MAX_AGE_MS) {
      chrome.storage.local.remove("pendingImport");
      return;
    }

    // Consome de uma vez: remove do storage e entrega para a página.
    chrome.storage.local.remove("pendingImport");

    const json = pending.json;
    let acked = false;

    // O listener do app é registrado num useEffect após a montagem do React.
    // Para não perder a corrida, reenviamos algumas vezes até receber o ack.
    window.addEventListener("message", (e) => {
      if (e.source === window && e.data && e.data.type === "GRADESINTELI_IMPORT_OK") {
        acked = true;
      }
    });

    let tries = 0;
    function send() {
      if (acked || tries > 12) return;
      tries++;
      window.postMessage({ type: "GRADESINTELI_IMPORT", payload: json }, "*");
      setTimeout(send, 400);
    }
    send();
  });
})();
