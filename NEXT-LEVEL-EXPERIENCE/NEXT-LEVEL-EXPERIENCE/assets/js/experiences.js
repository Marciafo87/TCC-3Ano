/* ==========================================================================
   Experiências interativas: Simulador "Você é o gestor", Quiz,
   Desafio Empresarial e Descubra seu Perfil.
   ========================================================================== */
(function () {
  "use strict";
  var NLX = window.NLX, esc = NLX.esc, icon = NLX.icon;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var data = null;
  var KEYS = ["A", "B", "C", "D", "E", "F"];
  var KPI = [
    { k: "financeiro", label: "Saúde financeira", icon: "wallet" },
    { k: "clientes", label: "Satisfação dos clientes", icon: "headset" },
    { k: "equipe", label: "Moral da equipe", icon: "users" },
    { k: "processos", label: "Eficiência dos processos", icon: "flow" },
    { k: "marca", label: "Reputação da marca", icon: "star" }
  ];
  var clamp = function (v) { return Math.max(0, Math.min(100, Math.round(v))); };
  var brl = function (v) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }); };

  /* ======================================================================
     SIMULADOR
     ====================================================================== */
  var sim = null, crowd = false;
  function simCfg() { return data.simulator; }
  function finScore(cash) { return clamp(cash / 1200); }
  function simNew() {
    var c = simCfg(), s = c.start || {};
    sim = { phase: "intro", round: 0, cash: +c.startCash || 60000, k: { clientes: s.clientes || 50, equipe: s.equipe || 50, processos: s.processos || 40, marca: s.marca || 45 },
      flags: {}, history: [], deltas: {}, votes: [0, 0, 0, 0, 0, 0], last: null };
  }
  function kpiValue(k) { return k === "financeiro" ? finScore(sim.cash) : sim.k[k]; }

  function simKpis() {
    return '<div class="kpis">' + KPI.map(function (m) {
      var v = kpiValue(m.k), d = sim.deltas[m.k];
      return '<div class="kpi' + (v < 35 ? " low" : "") + '"><div class="kpi-row"><span>' + m.label + "</span><b>" +
        (d ? '<span class="delta ' + (d > 0 ? "up" : "down") + '">' + (d > 0 ? "+" : "") + d + "</span>" : "") + v + '</b></div><div class="kpi-bar"><i style="width:' + v + '%"></i></div></div>';
    }).join("") + "</div>";
  }
  function simTop() {
    var rounds = simCfg().rounds;
    return '<div class="sim-top"><div class="sim-company"><span class="icon-tile">' + icon("building") + "</span><div><b>" + esc(simCfg().company) + "</b><span>Empresa fictícia · simulação educativa</span></div></div>" +
      '<div class="sim-progress" aria-label="Progresso">' + rounds.map(function (_, i) {
        return "<i class=\"" + (i < sim.round || sim.phase === "final" ? "done" : i === sim.round && sim.phase !== "intro" ? "now" : "") + "\"></i>";
      }).join("") + "</div>" +
      '<div class="sim-cash"><span>Caixa</span><b' + (sim.cash < 0 ? ' style="color:var(--bad)"' : "") + ">" + brl(sim.cash) + "</b></div></div>";
  }
  function simTools() {
    return '<div class="sim-tools"><label class="switch"><input type="checkbox" id="crowd-toggle"' + (crowd ? " checked" : "") + '><span class="track-s"></span>Modo plateia: o público vota em cada decisão</label>' +
      '<span class="disclaimer">' + icon("spark") + esc(data.texts.simDisclaimer) + "</span>" +
      (sim.phase !== "intro" ? '<button class="btn btn-ghost btn-sm" type="button" data-sim="restart">' + icon("refresh") + "Reiniciar</button>" : "") + "</div>";
  }

  function simRender() {
    var el = $("#sim"); if (!el) return;
    el.classList.toggle("crowd", crowd && sim.phase === "round");
    var rounds = simCfg().rounds, html = "";
    if (sim.phase === "intro") {
      html = '<div class="sim-intro"><div><span class="badge">' + icon("play") + "Simulação · " + rounds.length + " decisões</span>" +
        '<h3 style="margin-top:14px">Bem-vindo(a) à ' + esc(simCfg().company) + "</h3><p>" + esc(simCfg().intro) + "</p>" +
        '<div class="form-actions"><button class="btn btn-primary" type="button" data-sim="start">' + icon("play") + "Assumir a gestão</button>" +
        '<button class="btn btn-ghost" type="button" data-sim="start-crowd">' + icon("users") + "Jogar com a plateia</button></div></div>" +
        '<div class="sim-intro-kpis">' + KPI.map(function (m) { return "<div><b>" + icon(m.icon) + " " + m.label + "</b>Começa em " + kpiValue(m.k) + "/100</div>"; }).join("") +
        "<div><b>" + icon("trophy") + " Objetivo</b>Equilibrar todos os indicadores até o fim do mês " + rounds.length + ".</div></div></div>";
      el.innerHTML = html + simTools(); return;
    }
    if (sim.phase === "final") { el.innerHTML = simTop() + simFinal() + simTools(); return; }
    var r = rounds[sim.round];
    html = simTop() + '<div class="sim-body">' + simKpis() + '<div class="sim-stage"><span class="sim-round-title">' + esc(r.title) + "</span>" +
      '<p class="sim-situation">' + esc(r.situation) + "</p>" +
      '<div class="sim-options" role="group" aria-label="Alternativas">' + r.options.map(function (o, i) {
        var chosen = sim.last && sim.last.idx === i;
        return '<div class="sim-opt' + (sim.phase === "feedback" ? (chosen ? " chosen" : " dim") : "") + '" role="button" tabindex="' + (sim.phase === "round" && !crowd ? 0 : -1) + '" data-opt="' + i + '"' + (sim.phase === "feedback" ? ' aria-disabled="true"' : "") + ">" +
          '<span class="key">' + KEYS[i] + "</span><span>" + esc(o.text) + "</span>" +
          '<span class="votes"><button class="vote-btn" type="button" data-vote="' + i + '" data-d="-1" aria-label="Remover voto da opção ' + KEYS[i] + '">' + icon("minus") + "</button><b>" + sim.votes[i] + '</b><button class="vote-btn" type="button" data-vote="' + i + '" data-d="1" aria-label="Adicionar voto à opção ' + KEYS[i] + '">' + icon("plus") + "</button></span></div>";
      }).join("") + "</div>";
    if (sim.phase === "round") {
      var total = sim.votes.reduce(function (a, b) { return a + b; }, 0);
      html += '<div class="crowd-bar"><span>' + icon("users") + " Peça para a plateia levantar a mão em cada opção. Teclas 1–" + r.options.length + " somam votos. <b style=\"color:#fff\">" + total + " voto(s)</b></span>" +
        '<span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" type="button" data-sim="zero">Zerar</button><button class="btn btn-primary btn-sm" type="button" data-sim="winner"' + (total ? "" : " disabled") + ">Executar a mais votada</button></span></div>";
    }
    if (sim.phase === "feedback") {
      var L = sim.last;
      html += '<div class="sim-feedback" role="status"><span class="concept">' + icon("bulb") + esc(L.concept) + "</span><p>" + esc(L.feedback) + "</p>" +
        L.notes.map(function (n) { return '<p class="' + n.t + '">' + (n.t === "bonus" ? "✦ " : "⚠ ") + esc(n.text) + "</p>"; }).join("") +
        '<p style="margin-top:10px;font-size:13px;color:var(--gray)">Impacto no caixa: <b style="color:' + (L.cashDelta >= 0 ? "var(--ok)" : "var(--bad)") + '">' + (L.cashDelta >= 0 ? "+" : "") + brl(L.cashDelta) + "</b> · Resultado operacional do mês: <b style=\"color:" + (L.op >= 0 ? "var(--ok)" : "var(--bad)") + '">' + (L.op >= 0 ? "+" : "") + brl(L.op) + "</b></p>" +
        '<div class="actions"><button class="btn btn-primary" type="button" data-sim="next" id="sim-next">' + (sim.round + 1 >= rounds.length ? "Ver resultado final" : "Próximo mês") + icon("arrowRight") + "</button></div></div>";
    }
    html += "</div></div>";
    el.innerHTML = html + simTools();
    if (sim.phase === "feedback") { var n = $("#sim-next"); if (n) n.focus({ preventScroll: true }); }
  }

  function simChoose(i) {
    var r = simCfg().rounds[sim.round], o = r.options[i];
    if (!o || sim.phase !== "round") return;
    var before = {}; KPI.forEach(function (m) { before[m.k] = kpiValue(m.k); });
    var notes = [], cashDelta = (+o.cash || 0) + (+o.cashBonus || 0);
    var apply = function (eff) { Object.keys(eff || {}).forEach(function (k) { if (k in sim.k) sim.k[k] = clamp(sim.k[k] + eff[k]); }); };
    if (o.risky && before.financeiro < 45) { cashDelta -= 6000; notes.push({ t: "warn", text: "Com o caixa fraco, a empresa precisou de um empréstimo com juros para expandir." }); }
    sim.cash += cashDelta;
    apply(o.effects);
    [r.ifFlag, o.ifFlag].forEach(function (c) { if (c && sim.flags[c.flag]) { apply(c.effects); notes.push({ t: "bonus", text: c.note }); } });
    if (o.ifKpi && before[o.ifKpi.kpi] >= o.ifKpi.min) { apply(o.ifKpi.effects); notes.push({ t: "bonus", text: o.ifKpi.note }); }
    if (o.flag) sim.flags[o.flag] = true;
    // resultado operacional do mês: depende de clientes, marca e processos
    var op = Math.round(((sim.k.clientes + sim.k.marca) / 2 - 45) * 400 + (sim.k.processos - 40) * 60);
    sim.cash += op;
    if (sim.cash < 0) notes.push({ t: "warn", text: "Atenção: o caixa ficou negativo. Na vida real, isso significaria dívidas e juros." });
    sim.deltas = {}; KPI.forEach(function (m) { var d = kpiValue(m.k) - before[m.k]; if (d) sim.deltas[m.k] = d; });
    sim.last = { idx: i, concept: o.concept || "Gestão", feedback: o.feedback || "", notes: notes, cashDelta: cashDelta, op: op };
    sim.history.push({ round: r.title, choice: o.text, concept: o.concept });
    sim.phase = "feedback";
    simRender();
  }
  function simNext() {
    sim.round++; sim.deltas = {}; sim.votes = [0, 0, 0, 0, 0, 0];
    sim.phase = sim.round >= simCfg().rounds.length ? "final" : "round";
    simRender();
    var el = $("#sim"); if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function radar(vals) {
    var cx = 160, cy = 150, R = 110, n = vals.length;
    var pt = function (i, r) { var a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    var rings = [0.25, 0.5, 0.75, 1].map(function (f) {
      return '<polygon points="' + vals.map(function (_, i) { return pt(i, R * f).join(","); }).join(" ") + '" fill="none" stroke="rgba(255,255,255,.08)"/>';
    }).join("");
    var axes = vals.map(function (v, i) {
      var p = pt(i, R), l = pt(i, R + 26);
      return '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="rgba(255,255,255,.08)"/>' +
        '<text x="' + l[0] + '" y="' + l[1] + '" fill="#B9B5C5" font-size="11" text-anchor="middle" dominant-baseline="middle" font-family="Inter,sans-serif">' + esc(v.short) + " " + v.v + "</text>";
    }).join("");
    var shape = vals.map(function (v, i) { return pt(i, R * (v.v / 100)).join(","); }).join(" ");
    return '<svg viewBox="0 0 320 300" role="img" aria-label="Gráfico de radar dos indicadores finais"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#762BFF" stop-opacity=".7"/><stop offset="1" stop-color="#C084FC" stop-opacity=".5"/></linearGradient></defs>' +
      rings + axes + '<polygon points="' + shape + '" fill="url(#rg)" stroke="#C084FC" stroke-width="2"/>' +
      vals.map(function (v, i) { var p = pt(i, R * (v.v / 100)); return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="#fff"/>'; }).join("") + "</svg>";
  }
  function simFinal() {
    var shorts = { financeiro: "Finanças", clientes: "Clientes", equipe: "Equipe", processos: "Processos", marca: "Marca" };
    var vals = KPI.map(function (m) { return { k: m.k, label: m.label, short: shorts[m.k], v: kpiValue(m.k) }; });
    var avg = vals.reduce(function (a, b) { return a + b.v; }, 0) / vals.length;
    var score = Math.round(avg * 10);
    var rank = score >= 650 ? ["Gestor(a) NEXT LEVEL", "Você equilibrou resultados, pessoas e estratégia. Isso é Administração de alto nível."]
      : score >= 550 ? ["Gestor(a) estratégico(a)", "Boas decisões e visão de conjunto. Com alguns ajustes, você chega ao próximo nível."]
      : score >= 450 ? ["Gestor(a) promissor(a)", "A empresa sobreviveu, mas alguns indicadores ficaram para trás. Equilíbrio é a chave."]
      : ["Gestor(a) em formação", "Gestão exige equilibrar curto e longo prazo. Tente de novo e observe as consequências."];
    var sorted = vals.slice().sort(function (a, b) { return b.v - a.v; });
    return '<div class="sim-final"><div><span class="badge">' + icon("trophy") + "Resultado final</span>" +
      '<div class="score-big grad-text" style="margin-top:16px">' + score + "<small> / 1000</small></div>" +
      '<div class="rank">' + rank[0] + '</div><p style="color:var(--gray);margin-top:8px">' + rank[1] + "</p>" +
      '<p style="color:var(--gray);margin-top:12px;font-size:14px">Ponto mais forte: <b style="color:#fff">' + sorted[0].label + "</b> · Ponto de atenção: <b style=\"color:#fff\">" + sorted[sorted.length - 1].label + "</b> · Caixa final: <b style=\"color:#fff\">" + brl(sim.cash) + "</b></p>" +
      '<div class="recap"><ol>' + sim.history.map(function (h, i) { return "<li><span>MÊS " + (i + 1) + "</span><div>" + esc(h.choice) + ' <em style="color:var(--neon);font-style:normal">· ' + esc(h.concept || "") + "</em></div></li>"; }).join("") + "</ol></div>" +
      '<div class="form-actions"><button class="btn btn-primary" type="button" data-sim="restart">' + icon("refresh") + "Jogar novamente</button></div></div>" +
      '<div class="radar">' + radar(vals) + "</div></div>";
  }

  function simEvents() {
    var el = $("#sim"); if (!el) return;
    el.addEventListener("click", function (e) {
      var v = e.target.closest("[data-vote]");
      if (v) { e.stopPropagation(); var i = +v.getAttribute("data-vote"); sim.votes[i] = Math.max(0, sim.votes[i] + +v.getAttribute("data-d")); simRender(); return; }
      var a = e.target.closest("[data-sim]");
      if (a) {
        var act = a.getAttribute("data-sim");
        if (act === "start" || act === "start-crowd") { simNew(); crowd = act === "start-crowd"; sim.phase = "round"; simRender(); }
        if (act === "restart") { simNew(); simRender(); }
        if (act === "next") simNext();
        if (act === "zero") { sim.votes = [0, 0, 0, 0, 0, 0]; simRender(); }
        if (act === "winner") {
          var opts = simCfg().rounds[sim.round].options.length, best = 0;
          for (var k = 1; k < opts; k++) if (sim.votes[k] > sim.votes[best]) best = k;
          var tie = sim.votes.slice(0, opts).filter(function (x) { return x === sim.votes[best]; }).length > 1;
          if (tie) { NLX.toast && NLX.toast("Empate! Desempate com mais uma votação."); return; }
          simChoose(best);
        }
        return;
      }
      var o = e.target.closest("[data-opt]");
      if (o && !crowd && sim.phase === "round") simChoose(+o.getAttribute("data-opt"));
    });
    el.addEventListener("change", function (e) { if (e.target.id === "crowd-toggle") { crowd = e.target.checked; simRender(); } });
    el.addEventListener("keydown", function (e) {
      var o = e.target.closest && e.target.closest("[data-opt]");
      if (o && (e.key === "Enter" || e.key === " ") && !crowd && sim.phase === "round") { e.preventDefault(); simChoose(+o.getAttribute("data-opt")); }
    });
    document.addEventListener("keydown", function (e) {
      if (!crowd || !sim || sim.phase !== "round") return;
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return;
      var n = parseInt(e.key, 10), opts = simCfg().rounds[sim.round].options.length;
      if (n >= 1 && n <= opts) { sim.votes[n - 1]++; simRender(); }
    });
  }

  /* ======================================================================
     QUIZ / DESAFIO / PERFIL
     ====================================================================== */
  var exp = { tab: "quiz", quiz: null, ch: null, pf: null };
  function panel() { return $("#exp-panel"); }
  function progress(i, n) { return '<div class="progress" aria-hidden="true"><i style="width:' + (n ? (i / n) * 100 : 0) + '%"></i></div>'; }

  function quizRender() {
    var Q = data.quiz, s = exp.quiz;
    if (!Q.length) { panel().innerHTML = '<div class="empty"><p>Nenhuma pergunta cadastrada.</p></div>'; return; }
    if (!s) s = exp.quiz = { i: 0, score: 0, answered: null };
    if (s.i >= Q.length) {
      var pct = Math.round((s.score / Q.length) * 100);
      var msg = pct >= 80 ? "Excelente! Você domina os conceitos de gestão." : pct >= 50 ? "Muito bem! Você já tem uma boa base em Administração." : "Bom começo! Cada erro é uma oportunidade de aprender.";
      panel().innerHTML = progress(1, 1) + '<div class="result"><span class="icon-tile">' + icon("trophy") + "</span><h3>" + s.score + " de " + Q.length + " acertos</h3><p>" + msg + '</p><button class="btn btn-primary" type="button" data-q="restart">' + icon("refresh") + "Refazer o quiz</button></div>";
      return;
    }
    var q = Q[s.i], a = s.answered;
    panel().innerHTML = progress(s.i, Q.length) + '<div class="q-meta"><span>Pergunta ' + (s.i + 1) + " de " + Q.length + (q.topic ? " · " + esc(q.topic) : "") + "</span><span>Pontuação: " + s.score + "</span></div>" +
      '<p class="q-title">' + esc(q.question) + '</p><div class="answers">' + q.options.map(function (op, i) {
        var cls = a == null ? "" : i === +q.correct ? " correct" : i === a ? " wrong" : "";
        return '<button class="answer' + cls + '" type="button" data-q="' + i + '"' + (a != null ? " disabled" : "") + '><span class="key">' + KEYS[i] + "</span>" + esc(op) + "</button>";
      }).join("") + "</div>" +
      (a != null ? '<div class="explain"><b>' + (a === +q.correct ? "✓ Correto!" : "✗ Não foi dessa vez.") + "</b>" + esc(q.explain) + '</div><div class="row-end"><button class="btn btn-primary" type="button" data-q="next" id="q-next">' + (s.i + 1 < Q.length ? "Próxima" : "Ver resultado") + icon("arrowRight") + "</button></div>" : "");
    if (a != null) $("#q-next").focus({ preventScroll: true });
  }
  function chRender() {
    var C = data.challenges, s = exp.ch;
    if (!C.length) { panel().innerHTML = '<div class="empty"><p>Nenhum desafio cadastrado.</p></div>'; return; }
    if (!s) s = exp.ch = { i: 0, score: 0, answered: null };
    if (s.i >= C.length) {
      var max = C.length * 2;
      panel().innerHTML = progress(1, 1) + '<div class="result"><span class="icon-tile">' + icon("branch") + "</span><h3>" + s.score + " de " + max + " pontos</h3><p>" +
        (s.score >= max * 0.75 ? "Decisões de quem pensa como gestor: analisa, ouve e age com equilíbrio." : "Boas reflexões! Na gestão, entender a causa do problema antes de agir faz toda a diferença.") +
        '</p><button class="btn btn-primary" type="button" data-c="restart">' + icon("refresh") + "Recomeçar desafio</button></div>";
      return;
    }
    var c = C[s.i], a = s.answered;
    panel().innerHTML = progress(s.i, C.length) + '<div class="q-meta"><span>Desafio ' + (s.i + 1) + " de " + C.length + " · " + esc(c.title) + "</span><span>Pontos: " + s.score + "</span></div>" +
      '<p class="q-title">' + esc(c.situation) + '</p><div class="answers">' + c.options.map(function (o, i) {
        var best = Math.max.apply(null, c.options.map(function (x) { return +x.score || 0; }));
        var cls = a == null ? "" : (+o.score === best ? " correct" : i === a ? " wrong" : "");
        return '<button class="answer' + cls + '" type="button" data-c="' + i + '"' + (a != null ? " disabled" : "") + '><span class="key">' + KEYS[i] + "</span>" + esc(o.text) + "</button>";
      }).join("") + "</div>" +
      (a != null ? '<div class="explain"><b>Consequência · +' + (+c.options[a].score || 0) + " ponto(s)</b>" + esc(c.options[a].outcome) + '</div><div class="row-end"><button class="btn btn-primary" type="button" data-c="next" id="c-next">' + (s.i + 1 < C.length ? "Próximo desafio" : "Ver resultado") + icon("arrowRight") + "</button></div>" : "");
    if (a != null) $("#c-next").focus({ preventScroll: true });
  }
  function pfRender() {
    var Qs = data.profileQuestions, P = data.profiles, s = exp.pf;
    if (!Qs.length || !P.length) { panel().innerHTML = '<div class="empty"><p>Nenhuma pergunta de perfil cadastrada.</p></div>'; return; }
    if (!s) s = exp.pf = { i: 0, tally: {} };
    if (s.i >= Qs.length) {
      var ranked = P.map(function (p) { return { p: p, n: s.tally[p.key] || 0 }; }).sort(function (a, b) { return b.n - a.n; });
      var top = ranked[0].p, total = Qs.length;
      panel().innerHTML = progress(1, 1) + '<div class="result"><span class="icon-tile">' + icon(top.icon) + '</span><span class="badge">Seu perfil em destaque</span><h3 class="grad-text">' + esc(top.name) + "</h3><p>" + esc(top.description) + "</p>" +
        '<p style="font-size:14px"><b style="color:#fff">Áreas para explorar:</b> ' + esc(top.areas) + "</p>" +
        '<div class="profile-bars">' + ranked.map(function (r) { var pc = Math.round((r.n / total) * 100); return "<div><span>" + esc(r.p.name.replace(/^Perfil (de )?/, "")) + '</span><span class="bar"><i style="width:' + pc + '%"></i></span><span>' + pc + "%</span></div>"; }).join("") + "</div>" +
        '<p class="disclaimer" style="justify-content:center;margin-top:6px">' + icon("spark") + "Experiência lúdica: não é avaliação psicológica nem orientação profissional.</p>" +
        '<button class="btn btn-primary" type="button" data-pf="restart">' + icon("refresh") + "Refazer</button></div>";
      return;
    }
    var q = Qs[s.i];
    panel().innerHTML = progress(s.i, Qs.length) + '<div class="q-meta"><span>Pergunta ' + (s.i + 1) + " de " + Qs.length + "</span><span>Descubra seu perfil</span></div>" +
      '<p class="q-title">' + esc(q.question) + '</p><div class="choices-grid">' + q.options.map(function (o, i) {
        return '<button class="answer" type="button" data-pf="' + i + '"><span class="key">' + KEYS[i] + "</span>" + esc(o.text) + "</button>";
      }).join("") + "</div>";
  }
  function expRender() {
    document.querySelectorAll(".exp-tab").forEach(function (t) { t.setAttribute("aria-selected", t.getAttribute("data-exp") === exp.tab); });
    if (exp.tab === "quiz") quizRender(); else if (exp.tab === "desafio") chRender(); else pfRender();
  }
  function expEvents() {
    var tabs = $("#exp-tabs"); if (!tabs) return;
    tabs.addEventListener("click", function (e) { var t = e.target.closest("[data-exp]"); if (t) { exp.tab = t.getAttribute("data-exp"); expRender(); } });
    panel().addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var q = b.getAttribute("data-q"), c = b.getAttribute("data-c"), p = b.getAttribute("data-pf");
      if (q != null) {
        if (q === "restart") exp.quiz = null;
        else if (q === "next") { exp.quiz.i++; exp.quiz.answered = null; }
        else { var n = +q; exp.quiz.answered = n; if (n === +data.quiz[exp.quiz.i].correct) exp.quiz.score++; }
        quizRender();
      }
      if (c != null) {
        if (c === "restart") exp.ch = null;
        else if (c === "next") { exp.ch.i++; exp.ch.answered = null; }
        else { var k = +c; exp.ch.answered = k; exp.ch.score += +data.challenges[exp.ch.i].options[k].score || 0; }
        chRender();
      }
      if (p != null) {
        if (p === "restart") exp.pf = null;
        else { var opt = data.profileQuestions[exp.pf.i].options[+p]; exp.pf.tally[opt.profile] = (exp.pf.tally[opt.profile] || 0) + 1; exp.pf.i++; }
        pfRender();
      }
    });
  }

  NLX.Experiences = {
    init: function (d) { data = d; simNew(); simRender(); simEvents(); expRender(); expEvents(); },
    refresh: function (d) {
      if (!sim) { data = d; return; }
      data = d;
      if (sim.phase === "intro") { simNew(); simRender(); }
      expRender();
    }
  };
})();
