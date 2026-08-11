// adalove-capture.js — MAIN world, document_start.
//
// Modo de captura para DESENVOLVIMENTO da UI nova: observa toda resposta da
// apiv2 e repassa ao mundo isolado, que decide se guarda. Serve para levantar o
// contrato das páginas que ainda não reconstruímos, sem abrir o DevTools em cada
// uma — e pega também os endpoints secundários que a página chama sem avisar.
//
// Arquivo separado de propósito: o adalove-interceptor.js já está em produção
// alimentando a importação de notas e continua byte-idêntico.
//
// Aqui só observamos e postamos. Nada é gravado sem o modo de captura ligado do
// outro lado, e nada sai do navegador.

(function () {
  const TAG = "__GRADESINTELI_CAPTURE__";
  const CMD = "__GRADESINTELI_CAPTURE_CMD__";
  const REPLY = "__GRADESINTELI_CAPTURE_REPLY__";
  const API = "apiv2.inteli.edu.br";

  function isApi(url) {
    return typeof url === "string" && url.includes(API);
  }

  function post(method, url, status, body) {
    try {
      // `location.origin` em vez de "*": o Adalove loga toda mensagem que passa
      // pela janela, e com "*" a gente enchia o console deles à toa.
      window.postMessage({ source: TAG, method, url, status, body }, location.origin);
    } catch (_) {}
  }

  // ---- fachada para o console -------------------------------------------
  // O DevTools avalia no mundo da PÁGINA; o content script que guarda as
  // capturas vive no mundo ISOLADO. Sem esta ponte, `__gradesinteliCapture`
  // simplesmente não existe para quem digita no console.
  let nextId = 1;

  function send(cmd) {
    return new Promise((resolve) => {
      const id = nextId++;
      const onReply = (e) => {
        if (e.source !== window) return;
        const d = e.data;
        if (!d || d.source !== REPLY || d.id !== id) return;
        window.removeEventListener("message", onReply);
        resolve(d.result);
      };
      window.addEventListener("message", onReply);
      window.postMessage({ source: CMD, cmd, id }, location.origin);
      // Se ninguém responder (build sem o lado isolado), não trava o console.
      setTimeout(() => {
        window.removeEventListener("message", onReply);
        resolve(undefined);
      }, 2000);
    });
  }

  window.__gradesinteliCapture = {
    on: () => send("on"),
    off: () => send("off"),
    clear: () => send("clear"),
    export: () => send("export"),
    /** Use `await __gradesinteliCapture.list()`. */
    list: () => send("list"),
  };

  // ---- fetch ----
  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      const method = (init && init.method) || (input && input.method) || "GET";
      return origFetch.apply(this, arguments).then((res) => {
        try {
          if (isApi(url)) {
            res
              .clone()
              .text()
              .then((body) => post(method, url, res.status, body))
              .catch(() => {});
          }
        } catch (_) {}
        return res;
      });
    };
  }

  // ---- XMLHttpRequest ----
  const XHR = window.XMLHttpRequest;
  if (XHR) {
    const open = XHR.prototype.open;
    const send = XHR.prototype.send;
    XHR.prototype.open = function (method, url) {
      this.__giMethod = method;
      this.__giUrl = url;
      return open.apply(this, arguments);
    };
    XHR.prototype.send = function () {
      const self = this;
      if (isApi(self.__giUrl)) {
        self.addEventListener("load", function () {
          try {
            post(self.__giMethod || "GET", self.__giUrl, self.status, self.responseText);
          } catch (_) {}
        });
      }
      return send.apply(this, arguments);
    };
  }
})();
