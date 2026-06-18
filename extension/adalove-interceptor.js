// adalove-interceptor.js — MAIN world, document_start.
// O Adalove já faz GET .../sections/{uuid}/userdata ao abrir a aba Notas.
// Aqui só damos patch em fetch/XHR para capturar ESSA resposta e repassá-la
// ao content script via postMessage. Não reconstruímos a chamada nem mexemos
// no token — apenas observamos o que o app já buscou.

(function () {
  const TAG = "__GRADESINTELI_USERDATA__";

  function isUserData(url) {
    return typeof url === "string" && /\/sections\/[^/]+\/userdata/i.test(url);
  }

  function post(url, body) {
    try {
      window.postMessage({ source: TAG, url, body }, "*");
    } catch (_) {}
  }

  // ---- fetch ----
  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      return origFetch.apply(this, arguments).then((res) => {
        try {
          if (isUserData(url)) {
            res.clone().text().then((body) => post(url, body)).catch(() => {});
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
      this.__url = url;
      return open.apply(this, arguments);
    };
    XHR.prototype.send = function () {
      const self = this;
      if (isUserData(self.__url)) {
        self.addEventListener("load", function () {
          try {
            post(self.__url, self.responseText);
          } catch (_) {}
        });
      }
      return send.apply(this, arguments);
    };
  }
})();
