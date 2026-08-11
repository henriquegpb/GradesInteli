// adalove-boot.js — mundo isolado, document_start.
//
// Roda ANTES do React do Adalove montar. Se a preferência do aluno é a UI nova,
// esconde o #root deles já aqui, para não haver um piscar da tela branca antes
// da nossa overlay aparecer.
//
// `display:none` e não `remove()`: a UI original continua montada e viva, só
// invisível. Voltar é remover este <style> — nada é destruído, então nenhum bug
// nosso deixa o aluno sem plataforma.

(function () {
  const STYLE_ID = "gi-hide-root";

  // Mesma porteira do mount.tsx: fora da Vida Acadêmica a UI deles tem que
  // aparecer. Esconder o #root numa rota que não cobrimos daria tela em branco.
  var path = location.pathname;
  if (path !== "/" && path.indexOf("/academic-life") !== 0) return;

  chrome.storage.local.get("uiMode", (res) => {
    if (!res || res.uiMode !== "new") return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    // Mesma regra do mount.tsx: esconde a UI deles e solta html/body, para não
    // sobrar um segundo contexto de rolagem por trás da nossa página.
    style.textContent =
      "#root{display:none!important}" +
      "html,body{overflow:visible!important;height:auto!important;max-height:none!important;margin:0!important;background:#0e0e10!important;overscroll-behavior:none!important}";
    // Em document_start o <html> já existe; o <head> pode ainda não existir.
    (document.head || document.documentElement).appendChild(style);
  });
})();
