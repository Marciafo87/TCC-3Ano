/* ==========================================================================
   NEX — assistente demonstrativo com respostas cadastradas (sem IA externa).
   As respostas são editáveis no painel (Experiências > Assistente NEX).
   Marcadores dinâmicos: {projects}, {talks}, {form}
   ========================================================================== */
(function () {
  "use strict";
  var NLX = window.NLX, esc = NLX.esc, icon = NLX.icon, norm = NLX.norm;
  var $ = function (s) { return document.querySelector(s); };
  var SUGG = ["O que é Administração?", "O que os estudantes aprendem?", "Quais projetos estão disponíveis?", "Quais são as palestras?", "Como faço minha inscrição?", "Onde encontro o formulário?", "Quais áreas profissionais existem?", "Quero jogar o simulador"];
  var TARGET_LABEL = { inscricao: "Ir para a inscrição", formacao: "Ver formação", jornada: "Ver a jornada", projetos: "Ver projetos", palestras: "Ver palestras", formulario: "Ir ao formulário", mercado: "Ver mercado de trabalho", simulador: "Abrir simulador", experiencias: "Ver experiências" };

  function d() { return NLX.getData(); }
  function dynamic(text) {
    var D = d();
    return text.replace("{projects}", function () {
      var real = D.projects.filter(function (p) { return !p.demo; });
      if (!D.projects.length) return "Os projetos dos estudantes serão publicados em breve.";
      if (!real.length) return "Os projetos dos estudantes serão publicados em breve.";
      return "Temos " + real.length + " projeto(s) dos estudantes: " + real.slice(0, 5).map(function (p) { return p.name; }).join(", ") + (real.length > 5 ? "..." : "") + ".";
    }).replace("{talks}", function () {
      if (!D.talks.length) return "A programação de palestras está sendo finalizada e será publicada em breve.";
      var list = D.talks.slice().sort(function (a, b) { return ((a.date || "") + (a.start || "")).localeCompare((b.date || "") + (b.start || "")); });
      return "Programação:\n" + list.slice(0, 6).map(function (t) { return "• " + (t.start || "--:--") + " — " + t.title + (t.speaker ? " (" + t.speaker + ")" : ""); }).join("\n");
    }).replace("{signup}", function () {
      return NLX.safeUrl(D.links.signup) || NLX.safeUrl(D.links.googleForm) ? "Para se inscrever, vá até a seção Inscrição e clique no botão de inscrição." : "As inscrições serão abertas em breve.";
    }).replace("{form}", function () {
      return NLX.safeUrl(D.links.googleForm) ? "O formulário de interesse está na seção \"Seu próximo nível começa aqui\". Você pode abrir o link ou escanear o QR Code com o celular." : "O formulário de interesse ainda não foi configurado. Ele aparecerá na seção Formulário assim que estiver disponível.";
    });
  }
  function answer(q) {
    var nq = " " + norm(q).replace(/[^a-z0-9 ]/g, " ") + " ", best = null, bestScore = 0;
    (d().nex || []).forEach(function (e) {
      var score = 0;
      String(e.keywords || "").split(",").forEach(function (k) {
        k = norm(k).trim(); if (!k) return;
        if (nq.indexOf(" " + k + " ") >= 0) score += 3 + k.split(" ").length;
        else if (k.length > 4 && nq.indexOf(k) >= 0) score += 2;
      });
      if (score > bestScore) { bestScore = score; best = e; }
    });
    return best;
  }
  function add(html, who) {
    var log = $("#nex-log"), m = document.createElement("div");
    m.className = "msg " + who; m.innerHTML = html; log.appendChild(m); log.scrollTop = log.scrollHeight;
    return m;
  }
  function reply(q) {
    add(esc(q), "user");
    var t = add('<span class="typing"><i></i><i></i><i></i></span>', "bot");
    setTimeout(function () {
      var e = answer(q);
      if (!e) {
        t.innerHTML = "Ainda não sei responder isso. Experimente uma das sugestões abaixo ou pergunte sobre formação, projetos, palestras, formulário ou mercado de trabalho.";
        return;
      }
      var go = e.target && document.getElementById(e.target) ? '<br><button class="go" type="button" data-go="' + esc(e.target) + '">' + esc(TARGET_LABEL[e.target] || "Ir para a seção") + icon("arrowRight") + "</button>" : "";
      t.innerHTML = esc(dynamic(e.answer)) + go;
      $("#nex-log").scrollTop = $("#nex-log").scrollHeight;
    }, 450);
  }
  function setOpen(o) {
    var p = $("#nex-panel"), f = $("#nex-fab");
    p.classList.toggle("open", o); f.setAttribute("aria-expanded", o);
    if (o) {
      if (!$("#nex-log").children.length) add("Olá! Eu sou o <b>NEX</b>, seu guia no NEXT LEVEL EXPERIENCE. Como posso ajudar?", "bot");
      setTimeout(function () { if (window.matchMedia("(pointer:fine)").matches) $("#nex-input").focus(); }, 50);
    } else f.focus();
  }
  NLX.Nex = {
    init: function () {
      $("#nex-close").innerHTML = icon("x");
      $("#nex-form button").innerHTML = icon("send");
      $("#nex-sugg").innerHTML = SUGG.map(function (s) { return '<button type="button">' + esc(s) + "</button>"; }).join("");
      $("#nex-fab").addEventListener("click", function () { setOpen(!$("#nex-panel").classList.contains("open")); });
      $("#nex-close").addEventListener("click", function () { setOpen(false); });
      $("#nex-sugg").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) reply(b.textContent); });
      $("#nex-form").addEventListener("submit", function (e) {
        e.preventDefault(); var i = $("#nex-input"), v = i.value.trim(); if (!v) return; i.value = ""; reply(v);
      });
      $("#nex-log").addEventListener("click", function (e) {
        var b = e.target.closest("[data-go]"); if (!b) return;
        var el = document.getElementById(b.getAttribute("data-go"));
        if (el) { el.scrollIntoView({ behavior: "smooth" }); if (window.innerWidth < 700) setOpen(false); }
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && $("#nex-panel").classList.contains("open")) setOpen(false); });
    }
  };
})();
