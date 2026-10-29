/* Nuestra semana · agenda de Darlene y Berny.
   Datos: se guardan en este celular (localStorage) y, si hay código de pareja, se sincronizan con Netlify. */
"use strict";

// ------------------------------------------------------------ utilidades
const CATS = {
  escuela: "Escuela", proyecto: "Empresa / proyectos", gym: "Gym", donas: "Donas", comida: "Comidas",
  casa: "Casa y mascotas", perrita: "Perrita", youtube: "YouTube", tareas: "Tareas", ocio: "Ocio",
  colchon: "Colchón", personal: "Arreglo y traslados", sueno: "Dormir",
};
const WHO = { dar: "Darlene", el: "Berny" };
const NICK = { dar: "Bubucita", el: "Duducito" };
const WHO_OPTS = { ambos: "Los dos", dar: "Darlene", el: "Berny" };
const DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ING = ["Venta de donas", "YouTube", "Empresa / proyectos", "Cobro de deuda", "Otro ingreso"];
const EGR = ["Insumos de donas", "Súper y comida", "Escuela", "Transporte y gasolina", "Mascotas", "Gym", "Casa y servicios", "Pago de deuda", "Personal", "Otro gasto"];
const MEALS = ["Licuado", "Desayuno", "Colación", "Comida", "Sopita", "Cena"];
const HABITS = [["sueno", "Dormí 7 h o más"], ["agua", "Tomé 2 L de agua"]];
const CHECK_CATS = ["gym", "escuela", "proyecto", "donas", "perrita", "casa", "youtube", "tareas", "ocio"];

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fmtS = (t) => { let [h, m] = t.split(":").map(Number); h = h % 12 || 12; return `${h}:${String(m).padStart(2, "0")}`; };
const rango = (s, e) => `${fmtS(s)}–${fmt(e)}`;
const fmt = (t) => { let [h, m] = t.split(":").map(Number); const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12; return `${h}:${String(m).padStart(2, "0")} ${ap}`; };
const durTxt = (m) => { const h = Math.floor(m / 60), r = m % 60; return (h ? h + " h" : "") + (h && r ? " " : "") + (r ? r + " min" : "") || "0 min"; };
const dur = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const dayIdx = (s) => (parseYmd(s).getDay() + 6) % 7;
const today = () => ymd(new Date());
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const longDate = (s) => parseYmd(s).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const money = (n) => MXN.format(n || 0);
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const clone = (o) => JSON.parse(JSON.stringify(o));
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const vars = (c) => `--c:var(--k-${c})`;

// ------------------------------------------------------------ estado
let settings = Object.assign({ who: "dar", pin: "", calWho: null, calModo: "importante" }, LS.get("ns.settings", {}));
let entries = LS.get("ns.entries", {});
let pending = LS.get("ns.pending", []);
let horario = LS.get("ns.horario", null) || clone(window.HORARIO_BASE);
let todoDone = LS.get("ns.todo", []);
let deudas = LS.get("ns.deudas", { items: [], u: 0 });
let msgs = LS.get("ns.msgs", {}); // mensajes por destinatario: msgs.dar = lo que Berny le dejó a Darlene
const ui = { dtipo: "debemos", abono: null, pinMsg: null, loveFoto: null, loveMsg: "", tableWho: settings.who, who: settings.who, calMonth: today().slice(0, 7), moneyMonth: today().slice(0, 7), semDay: dayIdx(today()), edit: null, lastRoute: "" };

const saveSettings = () => LS.set("ns.settings", settings);
const day = (i) => horario.days[i];
const personBlocks = (d, who) => d.blocks.filter((b) => b.w === "ambos" || b.w === who).slice().sort((a, b) => toMin(a.s) - toMin(b.s));
const hasVenta = (d) => d.blocks.some((b) => /^Venta de donas/.test(b.t));
const sleepMins = (i) => { const d = day(i), n = day((i + 1) % 7); return 24 * 60 - toMin(d.sleep) + toMin(n.wake); };

// ------------------------------------------------------------ registros por día
const ekey = (date, who) => `${date}/${who}`;
const blankEntry = () => ({ checks: {}, meals: [0, 0, 0, 0, 0, 0], habits: {}, custom: [], money: [], nota: "", u: 0 });
const getE = (date, who) => Object.assign(blankEntry(), entries[ekey(date, who)] || {});
function saveE(date, who, e) {
  e.u = Date.now();
  entries[ekey(date, who)] = e;
  LS.set("ns.entries", entries);
  queue(ekey(date, who));
}
function checkItems(date, who) {
  const seen = new Set();
  return personBlocks(day(dayIdx(date)), who)
    .filter((b) => (CHECK_CATS.includes(b.c) || (b.c === "comida" && /^(Prepara|Deja list)/.test(b.t))) && !/^(Regreso|Camino|Margen)/.test(b.t))
    .map((b) => ({ ...b, id: b.s + "|" + b.t }))
    .filter((b) => (seen.has(b.id) ? false : seen.add(b.id)));
}
function progress(date, who) {
  const e = entries[ekey(date, who)];
  if (!e) return null;
  const items = checkItems(date, who);
  const custom = e.custom || [];
  const total = items.length + MEALS.length + HABITS.length + custom.length;
  const done = items.filter((i) => e.checks?.[i.id]).length + (e.meals || []).filter(Boolean).length +
    HABITS.filter(([k]) => e.habits?.[k]).length + custom.filter((c) => c.done).length;
  return total ? Math.round((done / total) * 100) : 0;
}
function moneyOf(dates, whoList = ["dar", "el"]) {
  let ing = 0, egr = 0; const moves = [];
  dates.forEach((dt) => whoList.forEach((w) => {
    (entries[ekey(dt, w)]?.money || []).forEach((m) => {
      if (m.tipo === "ingreso") ing += +m.monto; else egr += +m.monto;
      moves.push({ ...m, date: dt, who: w });
    });
  }));
  return { ing, egr, net: ing - egr, moves };
}
const monthDates = (ym) => { const [y, m] = ym.split("-").map(Number); const n = new Date(y, m, 0).getDate(); return Array.from({ length: n }, (_, i) => `${ym}-${pad(i + 1)}`); };
const shiftMonth = (ym, n) => { const [y, m] = ym.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const monthName = (ym) => { const [y, m] = ym.split("-").map(Number); return `${MESES[m - 1]} ${y}`; };

// ------------------------------------------------------------ sincronización
function setSync(state, msg) {
  const b = $("#sync");
  if (!b) return;
  b.className = "sync " + ({ ok: "ok", busy: "busy", err: "err" }[state] || "");
  b.querySelector("span").textContent = msg || { local: "Solo en este celular", ok: "Sincronizado", busy: "Guardando…", err: "Sin conexión" }[state];
  b.title = msg || "";
}
async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { "content-type": "application/json", "x-pin": settings.pin, ...(opts.headers || {}) } });
  let body = null;
  try { body = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error((body && body.error) || `Error ${r.status}`);
  return body;
}
let flushT = null;
function queue(key) {
  if (!pending.includes(key)) pending.push(key);
  LS.set("ns.pending", pending);
  if (!settings.pin) return setSync("local");
  clearTimeout(flushT);
  flushT = setTimeout(flush, 700);
}
let flushing = false;
async function flush() {
  if (!settings.pin || !pending.length || flushing) return;
  flushing = true;
  setSync("busy");
  try {
    while (pending.length) {
      const k = pending[0];
      const value = k === "config/horario" ? horario : k === "config/deudas" ? deudas : k.startsWith("msg/") ? msgs[k.slice(4)] : entries[k];
      if (value) await api("/api/data", { method: "PUT", body: JSON.stringify({ key: k, value }) });
      pending.shift();
      LS.set("ns.pending", pending);
    }
    setSync("ok");
  } catch (e) {
    setSync("err", e.message === "Failed to fetch" ? "Sin conexión" : e.message);
  } finally { flushing = false; }
}
let pulling = false;
async function pull() {
  if (!settings.pin) return setSync("local");
  if (pulling) return;
  pulling = true;
  setSync("busy");
  try {
    const months = new Set([today().slice(0, 7), ui.calMonth, ui.moneyMonth, shiftMonth(today().slice(0, 7), -1)]);
    let changed = false;
    for (const ym of months) {
      const { entries: remote } = await api("/api/data?prefix=" + ym);
      for (const [k, v] of Object.entries(remote || {})) {
        if (pending.includes(k)) continue;
        if (!entries[k] || (v.u || 0) > (entries[k].u || 0)) { entries[k] = v; changed = true; }
      }
    }
    const dd = await api("/api/data?key=config/deudas");
    if (dd && dd.value && Array.isArray(dd.value.items)) {
      const merged = mergeDeudas(deudas, dd.value);
      if (merged.changed) { deudas = merged.doc; LS.set("ns.deudas", deudas); changed = true; }
      if (merged.localNewer && !pending.includes("config/deudas")) { pending.push("config/deudas"); LS.set("ns.pending", pending); }
    } else if (deudas.items.length && !pending.includes("config/deudas")) { pending.push("config/deudas"); LS.set("ns.pending", pending); }
    const h = await api("/api/data?key=config/horario");
    if (h && h.value && Array.isArray(h.value.days) && !pending.includes("config/horario") && (h.value.u || 0) > (horario.u || 0)) {
      horario = h.value; LS.set("ns.horario", horario); changed = true;
    }
    for (const to of ["dar", "el"]) {
      const r = await api("/api/data?key=msg/" + to);
      if (r && r.value && !pending.includes("msg/" + to) && (r.value.u || 0) > ((msgs[to] && msgs[to].u) || 0)) { msgs[to] = r.value; LS.set("ns.msgs", msgs); changed = true; }
    }
    if (changed) { LS.set("ns.entries", entries); softRender(); }
    pulling = false;
    await flush();
    setSync(pending.length ? "busy" : "ok");
  } catch (e) {
    setSync("err", e.message === "Failed to fetch" ? "Sin conexión" : e.message);
  } finally { pulling = false; }
}
function softRender() {
  const a = document.activeElement;
  if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return; // no interrumpir mientras escriben
  render(true);
}

// ------------------------------------------------------------ deudas
function mergeDeudas(local, remote) {
  const map = new Map(local.items.map((i) => [i.id, i]));
  let changed = false, localNewer = false;
  remote.items.forEach((r) => {
    const l = map.get(r.id);
    if (!l || (r.u || 0) > (l.u || 0)) { map.set(r.id, r); changed = true; }
    else if ((l.u || 0) > (r.u || 0)) localNewer = true;
  });
  local.items.forEach((l) => { if (!remote.items.some((r) => r.id === l.id)) localNewer = true; });
  return { doc: { items: [...map.values()], u: Math.max(local.u || 0, remote.u || 0) }, changed, localNewer };
}
function saveDeudas() { deudas.u = Date.now(); LS.set("ns.deudas", deudas); queue("config/deudas"); }
const debtPaid = (d) => (d.abonos || []).reduce((s, a) => s + +a.monto, 0);
const debtLeft = (d) => Math.max(0, +d.monto - debtPaid(d));
function debtState(d) {
  if (d.pagado || debtLeft(d) <= 0) return ["ok", "Pagado"];
  if (!d.vence) return ["", "Sin fecha"];
  const days = Math.round((parseYmd(d.vence) - parseYmd(today())) / 86400000);
  if (days < 0) return ["bad", `Vencido hace ${-days} d`];
  if (days === 0) return ["warn", "Vence hoy"];
  if (days <= 3) return ["warn", `Vence en ${days} d`];
  return ["", `Vence en ${days} d`];
}
const activeDebts = () => deudas.items.filter((d) => !d.del);
function addMovement(date, who, tipo, cat, monto, concepto) {
  const e = getE(date, who); e.money.push({ id: uid(), tipo, cat, monto, concepto }); saveE(date, who, e);
}

// ------------------------------------------------------------ navegación
const ICONS = {
  hoy: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  agenda: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  semana: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M4 14h16M10 4v16"/>',
  dinero: '<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.6c-.5-.9-1.5-1.4-2.6-1.4-1.4 0-2.5.8-2.5 1.9s1.1 1.6 2.5 1.9 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2.1-.5-2.6-1.4M12 6.6v1.6M12 15.9v1.6"/>',
  guia: '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
  deudas: '<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M3.5 10h17M7 14.5h4"/>',
  ajustes: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
};
const ROUTES = [["hoy", "Hoy"], ["agenda", "Agenda"], ["semana", "Semana"], ["dinero", "Dinero"], ["deudas", "Deudas"], ["guia", "Guía"], ["ajustes", "Ajustes"]];
function buildNav() {
  $("#topnav").innerHTML = ROUTES.map(([k, l]) => `<a href="#${k}" data-r="${k}">${l}</a>`).join("");
  $("#botnav").innerHTML = ROUTES.map(([k, l]) => `<a href="#${k}" data-r="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>${l}</a>`).join("");
}
function currentRoute() { return (location.hash || "#hoy").slice(1); }
function render(keepScroll) {
  const r = currentRoute();
  const base = r.startsWith("dia-") ? "agenda" : r;
  document.querySelectorAll("[data-r]").forEach((a) => { if (a.dataset.r === base) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  const v = $("#view");
  const y = window.scrollY;
  if (r.startsWith("dia-") && /^\d{4}-\d{2}-\d{2}$/.test(r.slice(4))) v.innerHTML = viewDay(r.slice(4));
  else if (r === "agenda") v.innerHTML = viewAgenda();
  else if (r === "semana") v.innerHTML = viewSemana();
  else if (r === "dinero") v.innerHTML = viewDinero();
  else if (r === "guia") v.innerHTML = viewGuia();
  else if (r === "ajustes") v.innerHTML = viewAjustes();
  else if (r === "deudas") v.innerHTML = viewDeudas();
  else v.innerHTML = viewHoy();
  after(r);
  if (keepScroll || r === ui.lastRoute) window.scrollTo(0, y); else window.scrollTo(0, 0);
  ui.lastRoute = r;
}
function after(r) {
  if (r === "hoy" || r === "") { leopard(); tickNow(); }
  if (r === "semana") tickGrid();
  if (r === "guia") tear();
  if (r === "dinero") bindChart();
}

// ------------------------------------------------------------ vista: HOY
const LILY = `<svg class="lily" viewBox="0 0 300 360" aria-hidden="true"><defs><linearGradient id="pet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e05a82"/><stop offset=".55" stop-color="#f3a7bd"/><stop offset="1" stop-color="#fbe8e6"/></linearGradient><linearGradient id="pet2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8325a"/><stop offset=".6" stop-color="#e58aa6"/><stop offset="1" stop-color="#f6d6d6"/></linearGradient><radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ef9db6" stop-opacity=".35"/><stop offset="1" stop-color="#ef9db6" stop-opacity="0"/></radialGradient></defs><circle cx="150" cy="140" r="130" fill="url(#glow)"/><path d="M150 190 C150 250 140 300 132 360" stroke="#8d8a63" stroke-width="5" fill="none"/><path d="M140 285 C110 270 92 280 70 300 C100 300 120 298 140 290Z" fill="#8d8a63" opacity=".9"/><path d="M146 240 C175 225 200 228 222 240 C196 250 172 252 146 246Z" fill="#7d7a55" opacity=".9"/><g transform="translate(150 150)"><path d="M0 0 C-30 -40 -28 -95 0 -130 C28 -95 30 -40 0 0Z" fill="url(#pet2)" transform="rotate(-150)"/><path d="M0 0 C-30 -40 -28 -95 0 -130 C28 -95 30 -40 0 0Z" fill="url(#pet2)" transform="rotate(150)"/><path d="M0 0 C-30 -40 -28 -95 0 -130 C28 -95 30 -40 0 0Z" fill="url(#pet2)"/><path d="M0 0 C-34 -38 -34 -100 0 -138 C34 -100 34 -38 0 0Z" fill="url(#pet)" transform="rotate(-60)"/><path d="M0 0 C-34 -38 -34 -100 0 -138 C34 -100 34 -38 0 0Z" fill="url(#pet)" transform="rotate(60)"/><path d="M0 0 C-34 -38 -34 -100 0 -138 C34 -100 34 -38 0 0Z" fill="url(#pet)" transform="rotate(180)"/><g fill="#9e2346" opacity=".75"><circle cx="-30" cy="-22" r="1.8"/><circle cx="-38" cy="-30" r="1.4"/><circle cx="-24" cy="-34" r="1.5"/><circle cx="30" cy="-22" r="1.8"/><circle cx="38" cy="-30" r="1.4"/><circle cx="25" cy="-36" r="1.5"/><circle cx="-8" cy="32" r="1.6"/><circle cx="6" cy="40" r="1.4"/><circle cx="-40" cy="14" r="1.4"/><circle cx="42" cy="12" r="1.5"/></g><g stroke="#d9d3a6" stroke-width="1.6" fill="none"><path d="M0 0 C-6 -20 -14 -40 -22 -58"/><path d="M0 0 C-2 -22 -2 -44 -4 -64"/><path d="M0 0 C4 -22 10 -42 16 -60"/><path d="M0 0 C8 -18 20 -34 30 -50"/><path d="M0 0 C-10 -16 -24 -30 -36 -44"/></g><g fill="#5a1a22"><ellipse cx="-22" cy="-60" rx="3" ry="7" transform="rotate(-20 -22 -60)"/><ellipse cx="-4" cy="-66" rx="3" ry="7"/><ellipse cx="16" cy="-62" rx="3" ry="7" transform="rotate(18 16 -62)"/><ellipse cx="31" cy="-52" rx="3" ry="7" transform="rotate(35 31 -52)"/><ellipse cx="-37" cy="-46" rx="3" ry="7" transform="rotate(-38 -37 -46)"/></g></g></svg>`;

function viewHoy() {
  const t = today();
  return `<div class="hero"><canvas id="leopard" aria-hidden="true"></canvas>
    <div class="hero-in"><span class="eyebrow">Darlene Bubucita &amp; Berny Duducito · TecNM Puruándiro</span><h1>Nuestra semana</h1>
    <span class="eyebrow" style="color:var(--rose-2)">${esc(longDate(t))}</span></div>${LILY}</div>
  <div class="wrap">
    ${loveSection()}
    <section><div class="sec-head"><h2>Ahora</h2><div class="meta">Hora <span id="clock">—</span></div></div>
      <div class="now" id="now"></div></section>
    ${upcomingDebtsCard()}
    ${dayPanel(t, true)}
  </div>`;
}
const ago = (u) => { const mn = Math.round((Date.now() - u) / 60000); if (mn < 1) return "hace un momento"; if (mn < 60) return `hace ${mn} min`; const h = Math.round(mn / 60); if (h < 24) return `hace ${h} h`; return new Date(u).toLocaleDateString("es-MX", { day: "numeric", month: "short" }); };
function loveSection() {
  const me = settings.who, other = me === "dar" ? "el" : "dar";
  const inbox = msgs[me], sent = msgs[other];
  return `<section class="love"><div class="sec-head"><h2>Para ti, ${NICK[me]}</h2><div class="meta">${WHO[me]} <span>de tu ${NICK[other]}</span></div></div>
    <div class="two">
      <div class="lovecard">${inbox
        ? `${inbox.foto ? `<img src="${inbox.foto}" alt="Foto que te dejó ${WHO[other]}">` : ""}${inbox.texto ? `<p class="lovetxt">${esc(inbox.texto)}</p>` : ""}<span class="sub">De tu ${NICK[other]}, ${WHO[other]} · ${ago(inbox.u)}</span>`
        : `<p class="lovetxt" style="font-size:30px">Aquí aparece lo que te deje tu ${NICK[other]}</p><span class="sub">Una nota linda o una foto. ¿Este celular no es de ${WHO[me]}? Cámbialo en Ajustes.</span>`}</div>
      <form class="card" data-form="love"><h3>Déjale algo a tu ${NICK[other]}</h3>
        <textarea name="texto" maxlength="500" placeholder="Escríbele algo bonito a tu ${NICK[other]}…" aria-label="Nota para ${WHO[other]}" style="min-height:90px">${esc(ui.loveDraft || "")}</textarea>
        ${ui.loveFoto ? `<img class="lovepre" src="${ui.loveFoto}" alt="Foto lista para enviar">` : ""}
        <div class="row2"><label class="btn" for="lovefoto">${ui.loveFoto ? "Cambiar foto" : "Agregar foto"}</label><input id="lovefoto" type="file" accept="image/*" data-act="lovefoto" hidden>
          ${ui.loveFoto ? '<button class="btn ghost" type="button" data-act="lovenofoto">Quitar foto</button>' : ""}<button class="btn primary" type="submit">Enviar</button></div>
        <span class="msg ${ui.loveMsg ? "ok" : ""}">${esc(ui.loveMsg || "")}</span>
        ${sent ? `<span class="sub">Lo último que le dejaste (${ago(sent.u)}): ${sent.foto ? "una foto" : ""}${sent.foto && sent.texto ? " y " : ""}${sent.texto ? "“" + esc(sent.texto.slice(0, 60)) + (sent.texto.length > 60 ? "…" : "") + "”" : ""}</span>` : ""}
      </form>
    </div></section>`;
}
async function compressPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("No se pudo abrir la foto.")); img.src = url; });
    const max = 1080, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.78);
  } finally { URL.revokeObjectURL(url); }
}
function statusOf(who, i, m) {
  const d = day(i), bl = personBlocks(d, who);
  if (m < toMin(d.wake)) return { cur: { t: "Dormir", c: "sueno", e: d.wake }, next: bl[0], rem: toMin(d.wake) - m, pct: null };
  if (m >= toMin(d.sleep)) {
    const n = day((i + 1) % 7), nb = personBlocks(n, who)[0];
    return { cur: { t: "Dormir", c: "sueno", e: n.wake }, next: nb && { ...nb, tomorrow: true }, rem: 24 * 60 - m + toMin(n.wake), pct: null };
  }
  const inside = bl.filter((b) => m >= toMin(b.s) && m < toMin(b.e));
  if (inside.length) {
    const b = inside[inside.length - 1];
    const nx = bl.find((x) => toMin(x.s) > m) || { t: "Dormir", s: d.sleep };
    return { cur: b, next: nx, rem: toMin(b.e) - m, pct: (m - toMin(b.s)) / (toMin(b.e) - toMin(b.s)) };
  }
  const nx = bl.find((b) => toMin(b.s) > m) || { t: "Dormir", s: d.sleep };
  return { cur: { t: "Entre bloques", c: "colchon" }, next: nx, rem: toMin(nx.s) - m, pct: null };
}
function tickNow() {
  const el = $("#now");
  if (!el) return;
  const i = dayIdx(today()), m = nowMin(), d = day(i);
  $("#clock").textContent = fmt(hhmm(m));
  const card = (who) => {
    const st = statusOf(who, i, m), nx = st.next;
    return `<article class="ncard" style="${vars(st.cur.c)}"><div class="top"><span class="pillhead">${WHO[who]}</span><span class="live"><i></i>en vivo</span></div>
      <div class="what"><i></i><span>${esc(st.cur.t)}</span></div>
      <div class="left">${st.cur.s && st.cur.e ? `De ${fmt(st.cur.s)} a ${fmt(st.cur.e)} · ` : ""}faltan ${durTxt(st.rem)}</div>
      ${st.pct == null ? "" : `<div class="bar"><span style="width:${Math.round(st.pct * 100)}%"></span></div>`}
      <div class="next">Sigue: <span class="t">${nx && nx.s ? (nx.tomorrow ? "mañana " : "") + (nx.e ? rango(nx.s, nx.e) : fmt(nx.s)) : ""}</span> · <b>${esc(nx ? nx.t : "")}</b></div></article>`;
  };
  const w = toMin(d.wake), sl = toMin(d.sleep), dp = Math.max(0, Math.min(1, (m - w) / (sl - w)));
  el.innerHTML = card("dar") + card("el") +
    `<div class="dayprog"><span>${fmt(d.wake)}</span><div class="bar"><span style="width:${Math.round(dp * 100)}%"></span></div><span>${fmt(d.sleep)}</span><span>${Math.round(dp * 100)}% del día</span></div>`;
}

// ------------------------------------------------------------ panel de un día (checklist, dinero, notas)
function catOptions(sel) {
  return `<optgroup label="Ingresos">${ING.map((c) => `<option value="ingreso|${esc(c)}" ${sel === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</optgroup>
    <optgroup label="Egresos">${EGR.map((c) => `<option value="egreso|${esc(c)}" ${sel === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</optgroup>`;
}
function personPanel(date, who) {
  const e = getE(date, who), items = checkItems(date, who), p = progress(date, who) ?? 0;
  const mo = moneyOf([date], [who]);
  const isToday = date === today(), m = nowMin();
  return `<div class="person" data-p="${who}">
    <header><span class="pillhead">${WHO[who]}</span><div class="ring" style="--p:${p}" title="Avance del día"><span>${p}%</span></div></header>
    <div class="card"><h3>Checklist <small>${items.filter((i) => e.checks[i.id]).length} / ${items.length}</small></h3>
      <ul class="checks">${items.map((i) => {
        const cur = isToday && m >= toMin(i.s) && m < toMin(i.e);
        return `<li><label style="${vars(i.c)}${cur ? ";background:rgba(239,157,182,.08)" : ""}"><input type="checkbox" data-act="check" data-who="${who}" data-id="${esc(i.id)}" ${e.checks[i.id] ? "checked" : ""}><span class="tm">${fmtS(i.s)}–${fmt(i.e)}</span><span class="tx"><i></i>${esc(i.t)}</span></label></li>`;
      }).join("") || '<li class="empty">Sin bloques en el horario de este día.</li>'}</ul>
      <div class="field"><label>Comidas</label><div class="meals">${MEALS.map((mm, k) => `<button type="button" data-act="meal" data-who="${who}" data-i="${k}" aria-pressed="${e.meals[k] ? "true" : "false"}">${mm}</button>`).join("")}</div></div>
      <ul class="checks">${HABITS.map(([k, l]) => `<li><label class="nt"><input type="checkbox" data-act="habit" data-who="${who}" data-k="${k}" ${e.habits[k] ? "checked" : ""}><span class="tx">${l}</span></label></li>`).join("")}</ul>
    </div>
    <div class="card"><h3>Pendientes del día <small>${e.custom.filter((c) => c.done).length} / ${e.custom.length}</small></h3>
      <ul class="checks">${e.custom.map((c) => `<li><label class="nt"><input type="checkbox" data-act="ctoggle" data-who="${who}" data-id="${c.id}" ${c.done ? "checked" : ""}><span class="tx">${esc(c.t)}<button type="button" class="del" data-act="cdel" data-who="${who}" data-id="${c.id}" aria-label="Borrar pendiente">×</button></span></label></li>`).join("")}</ul>
      <form class="addrow" data-form="task" data-who="${who}"><input type="text" name="t" placeholder="Tarea, entrega, compra…" aria-label="Nuevo pendiente" maxlength="140"><button class="btn sm" type="submit">Agregar</button></form>
    </div>
    <div class="card"><h3>Dinero del día <small>${money(mo.net)}</small></h3>
      <form class="money-form" data-form="money" data-who="${who}">
        <div class="field"><label for="mt-${who}">Monto</label><input id="mt-${who}" type="number" name="monto" inputmode="decimal" min="0" step="0.5" placeholder="0.00" required></div>
        <div class="field"><label for="mc-${who}">Tipo</label><select id="mc-${who}" name="cat">${catOptions("Venta de donas")}</select></div>
        <div class="field full"><label for="mn-${who}">Concepto (opcional)</label><input id="mn-${who}" type="text" name="concepto" maxlength="80" placeholder="Ej. 3 docenas, harina y azúcar…"></div>
        <button class="btn primary full" type="submit">Agregar movimiento</button>
      </form>
      <ul class="moves">${e.money.map((x) => `<li><span class="tag ${x.tipo}">${x.tipo === "ingreso" ? "Ingreso" : "Egreso"}</span><span>${esc(x.cat)}${x.concepto ? `<br><span class="sub2">${esc(x.concepto)}</span>` : ""}</span><span class="amt ${x.tipo}">${x.tipo === "egreso" ? "−" : "+"}${money(x.monto)}</span><button type="button" class="del" data-act="mdel" data-who="${who}" data-id="${x.id}" aria-label="Borrar movimiento">×</button></li>`).join("") || '<li class="empty">Sin movimientos todavía.</li>'}</ul>
      <div class="totals"><span>Ingresos <b>${money(mo.ing)}</b></span><span>Egresos <b>${money(mo.egr)}</b></span><span>Neto <b>${money(mo.net)}</b></span></div>
    </div>
    <div class="card"><h3>Notas del día</h3>
      <textarea data-act="nota" data-who="${who}" placeholder="Cómo te fue, qué se vendió, qué aprendiste, pendientes para mañana…" aria-label="Notas de ${WHO[who]}">${esc(e.nota)}</textarea>
      <span class="saved" id="saved-${who}"></span>
    </div>
  </div>`;
}
function dayPanel(date, isHoy) {
  const i = dayIdx(date), d = day(i), mo = moneyOf([date]);
  const pD = progress(date, "dar"), pE = progress(date, "el");
  const head = isHoy
    ? `<div class="sec-head"><h2>Mi día</h2><div class="meta"><a class="btn sm ghost" href="#dia-${date}">Abrir en agenda</a></div></div>`
    : `<div class="datenav"><a class="btn sm" href="#dia-${addDays(date, -1)}" aria-label="Día anterior">‹</a>
        <h2>${esc(longDate(date))}<small>${hasVenta(d) ? "Hay venta" : "Día libre de donas"} · comidas ${d.food}</small></h2>
        <a class="btn sm" href="#dia-${addDays(date, 1)}" aria-label="Día siguiente">›</a>
        ${date !== today() ? `<a class="btn sm ghost" href="#dia-${today()}">Hoy</a>` : ""}<a class="btn sm ghost" href="#agenda">Calendario</a></div>`;
  return `<section>${head}
    <div class="tiles"><div class="tile ing"><small>Ingresos</small><b>${money(mo.ing)}</b></div><div class="tile egr"><small>Egresos</small><b>${money(mo.egr)}</b></div>
      <div class="tile"><small>Neto</small><b>${money(mo.net)}</b></div><div class="tile"><small>Avance</small><b>${pD ?? 0}% · ${pE ?? 0}%</b><span>Darlene · Berny</span></div></div>
    <div class="who-tabs seg" role="tablist">${["dar", "el"].map((w) => `<button type="button" data-act="who" data-who="${w}" aria-pressed="${ui.who === w}">${WHO[w]}</button>`).join("")}</div>
    <div class="people" data-who="${ui.who}" data-date="${date}">${personPanel(date, "dar")}${personPanel(date, "el")}</div>
  </section>`;
}
function viewDay(date) { return `<div class="wrap">${dayPanel(date, false)}</div>`; }

// ------------------------------------------------------------ vista: AGENDA (calendario)
function viewAgenda() {
  const ym = ui.calMonth, dates = monthDates(ym), first = dayIdx(dates[0]);
  const cells = [];
  for (let k = first; k > 0; k--) cells.push(addDays(dates[0], -k));
  cells.push(...dates);
  while (cells.length % 7) cells.push(addDays(cells[cells.length - 1], 1));
  const t = today(), mo = moneyOf(dates);
  const registrados = dates.filter((dt) => entries[ekey(dt, "dar")] || entries[ekey(dt, "el")]).length;
  return `<div class="wrap"><section>
    <div class="calhead"><a class="btn sm" href="#agenda" data-act="cal" data-n="-1" aria-label="Mes anterior">‹</a><h2>${monthName(ym)}</h2>
      <a class="btn sm" href="#agenda" data-act="cal" data-n="1" aria-label="Mes siguiente">›</a><a class="btn sm ghost" href="#agenda" data-act="cal" data-n="0">Hoy</a></div>
    <div class="calwrap"><div class="cal">${DAYS_SHORT.map((d) => `<div class="dn"><span>${d}</span></div>`).join("")}
    ${cells.map((dt) => {
      const pD = progress(dt, "dar"), pE = progress(dt, "el"), m = moneyOf([dt]);
      const hasNote = ["dar", "el"].some((w) => (entries[ekey(dt, w)]?.nota || "").trim());
      const d = day(dayIdx(dt));
      return `<a href="#dia-${dt}" class="${dt.slice(0, 7) !== ym ? "out" : ""} ${dt === t ? "today" : ""}" aria-label="${esc(longDate(dt))}">
        <span class="num">${+dt.slice(8)}<em>${hasVenta(d) ? "venta" : "libre"}</em></span>
        <span class="pb">D<div><span style="width:${pD || 0}%"></span></div></span><span class="pb">B<div><span style="width:${pE || 0}%"></span></div></span>
        ${m.ing || m.egr ? `<span class="net ${m.net >= 0 ? "pos" : "neg"}">${m.net >= 0 ? "+" : "−"}${money(Math.abs(m.net)).replace(".00", "")}</span>` : ""}
        ${activeDebts().some((x) => !x.pagado && debtLeft(x) > 0 && x.vence === dt) ? '<span class="due" title="Fecha límite de pago">$</span>' : ""}
        ${hasNote ? '<span class="dot" title="Tiene notas"></span>' : ""}</a>`;
    }).join("")}</div></div>
    <p class="sub">Toca un día para registrar el checklist, el dinero y las notas de cada uno. Barras: avance de Darlene (D) y de Berny (B). Punto lila: hay notas. $: fecha límite de un pago.</p>
    <div class="tiles"><div class="tile ing"><small>Ingresos del mes</small><b>${money(mo.ing)}</b></div><div class="tile egr"><small>Egresos del mes</small><b>${money(mo.egr)}</b></div>
      <div class="tile"><small>Neto</small><b>${money(mo.net)}</b></div><div class="tile"><small>Días registrados</small><b>${registrados} / ${dates.length}</b></div></div>
  </section></div>`;
}

// ------------------------------------------------------------ vista: SEMANA (horario + editor)
const PX = 1.7;
function gridRange() {
  let a = 24 * 60, b = 0;
  horario.days.forEach((d) => { a = Math.min(a, toMin(d.wake)); b = Math.max(b, toMin(d.sleep)); d.blocks.forEach((x) => { a = Math.min(a, toMin(x.s)); b = Math.max(b, toMin(x.e)); }); });
  return [Math.floor(a / 30) * 30, Math.min(24 * 60, Math.ceil(b / 30) * 30 + 30)];
}
function weekGrid() {
  const [GS, GE] = gridRange(), H = (GE - GS) * PX, ti = dayIdx(today());
  let times = "";
  for (let m = Math.ceil(GS / 60) * 60; m < GE; m += 60) { const h = m / 60; times += `<span style="top:${(m - GS) * PX}px">${h % 12 || 12} ${h >= 12 ? "pm" : "am"}</span>`; }
  const blk = (b, lane) => {
    const top = (toMin(b.s) - GS) * PX, ht = (toMin(b.e) - toMin(b.s)) * PX;
    const cls = lane === "dar" ? "l" : lane === "el" ? "r" : "";
    const who = lane === "dar" ? "D · " : lane === "el" ? "B · " : "";
    const lbl = ht >= 13 ? `<b>${who}${esc(b.t)}</b>${ht >= 44 && !cls ? `<em>${fmt(b.s)}–${fmt(b.e)}</em>` : ""}` : "";
    return `<div class="g ${b.c} ${cls} ${ht < 22 ? "tiny" : ""}" data-s="${toMin(b.s)}" data-e="${toMin(b.e)}" style="top:${top}px;height:${Math.max(4, ht - 1)}px;${vars(b.c)}" title="${esc(who + b.t)} · ${fmt(b.s)}–${fmt(b.e)}">${lbl}</div>`;
  };
  const cols = horario.days.map((d, i) => {
    let h = "";
    if (toMin(d.wake) > GS) h += blk({ s: hhmm(GS), e: d.wake, t: "Dormir", c: "sueno" });
    if (toMin(d.sleep) < GE) h += blk({ s: d.sleep, e: hhmm(GE), t: "Dormir", c: "sueno" });
    d.blocks.forEach((b) => (h += blk(b, b.w === "ambos" ? undefined : b.w)));
    return `<div class="gcol ${i === ti ? "today" : ""}" id="gcol-${i}" data-gs="${GS}" style="height:${H}px">${h}</div>`;
  }).join("");
  return `<div class="gscroll"><div class="grid"><div class="ghead"></div>${horario.days.map((d, i) => `<div class="ghead ${i === ti ? "today" : ""}"><span class="pillhead">${d.name}</span><small>${hasVenta(d) ? "venta" : "día libre"} · ${d.food}</small></div>`).join("")}<div class="gtimes" style="height:${H}px">${times}</div>${cols}</div></div>
    <div class="legend">${Object.entries(CATS).map(([k, v]) => `<span style="${vars(k)}"><i></i>${v}</span>`).join("")}</div>`;
}
function tickGrid() {
  const i = dayIdx(today()), m = nowMin(), col = $("#gcol-" + i);
  document.querySelectorAll(".nowline").forEach((n) => n.remove());
  document.querySelectorAll(".g.cur").forEach((n) => n.classList.remove("cur"));
  if (!col) return;
  const GS = +col.dataset.gs, H = parseFloat(col.style.height);
  const top = (m - GS) * PX;
  if (top >= 0 && top <= H) { const l = document.createElement("div"); l.className = "nowline"; l.style.top = top + "px"; col.appendChild(l); }
  col.querySelectorAll(".g").forEach((g) => { if (m >= +g.dataset.s && m < +g.dataset.e && !g.classList.contains("sueno")) g.classList.add("cur"); });
}
function hourTable() {
  const who = ui.tableWho, ti = dayIdx(today()), nm = nowMin();
  const vis = (b) => who === "ambos" || b.w === "ambos" || b.w === who;
  let first = 24, last = 0;
  horario.days.forEach((d) => { first = Math.min(first, Math.floor(toMin(d.wake) / 60)); last = Math.max(last, Math.ceil(toMin(d.sleep) / 60)); });
  let rows = "";
  for (let h = first; h < last; h++) {
    const hs = h * 60, he = hs + 60;
    const cells = horario.days.map((d, i) => {
      const bl = d.blocks.filter((b) => vis(b) && toMin(b.s) < he && toMin(b.e) > hs).sort((a, b) => toMin(a.s) - toMin(b.s));
      const sleepStart = toMin(d.sleep), wake = toMin(d.wake);
      const lines = [];
      if (wake > hs && wake >= he) lines.push({ t: "Dormir", c: "sueno", s: null });
      bl.forEach((b) => lines.push(b));
      if (sleepStart >= hs && sleepStart < he) lines.push({ t: "Dormir", c: "sueno", s: d.sleep });
      else if (hs >= sleepStart) lines.push({ t: "Dormir", c: "sueno", s: null });
      const score = {};
      bl.forEach((b) => { if (["colchon", "personal"].includes(b.c)) return; const ov = Math.min(he, toMin(b.e)) - Math.max(hs, toMin(b.s)); score[b.c] = (score[b.c] || 0) + ov; });
      let dom = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
      dom = dom ? dom[0] : lines.length && lines.every((l) => l.c === "sueno") ? "sueno" : "personal";
      const isNow = i === ti && nm >= hs && nm < he;
      const html = lines.map((b) => {
        const starts = b.s && toMin(b.s) >= hs;
        const chip = who === "ambos" && b.w && b.w !== "ambos" ? `<em class="wc">${b.w === "dar" ? "D" : "B"}</em>` : "";
        const sub = b.c === "escuela" && b.n && starts ? `<small>${esc(b.n)}</small>` : "";
        const when = b.c === "sueno" ? (b.s ? "desde " + fmt(b.s) : "") : starts ? rango(b.s, b.e) : "sigue · hasta " + fmt(b.e);
        return `<div class="ln ${starts || b.c === "sueno" ? "" : "cont"}" style="${vars(b.c)}"><i></i><div><span class="hm">${when}</span><span class="tt">${chip}${esc(b.t)}${sub}</span></div></div>`;
      }).join("");
      return `<td class="hc ${i === ti ? "today" : ""} ${isNow ? "now" : ""}" style="${vars(dom)}">${html}</td>`;
    }).join("");
    rows += `<tr><th scope="row" class="hh">${h % 12 || 12}:00<span>${h >= 12 ? "pm" : "am"}</span></th>${cells}</tr>`;
  }
  return `<div class="htwrap"><table class="ht ${who === "ambos" ? "both" : ""}"><thead><tr><th class="hh">Hora</th>${horario.days.map((d, i) => `<th class="${i === ti ? "today" : ""}"><span class="pillhead">${d.name}</span><small>${hasVenta(d) ? "venta" : "día libre"}</small></th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
  <div class="legend">${Object.entries(CATS).filter(([k]) => k !== "colchon").map(([k, v]) => `<span style="${vars(k)}"><i></i>${v}</span>`).join("")}</div>`;
}
function blockForm(b, idx) {
  return `<form class="card" data-form="block" data-i="${idx}" style="border-color:var(--rose)">
    <h3>${idx === "new" ? "Nuevo bloque" : "Editar bloque"}</h3>
    <div class="money-form">
      <div class="field"><label for="bs">Inicio</label><input id="bs" type="time" name="s" value="${b.s}" required></div>
      <div class="field"><label for="be">Fin</label><input id="be" type="time" name="e" value="${b.e}" required></div>
      <div class="field full"><label for="bt">Qué se hace</label><input id="bt" type="text" name="t" value="${esc(b.t)}" maxlength="90" required></div>
      <div class="field"><label for="bc">Categoría</label><select id="bc" name="c">${Object.entries(CATS).filter(([k]) => k !== "sueno").map(([k, v]) => `<option value="${k}" ${b.c === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label for="bw">Quién</label><select id="bw" name="w">${Object.entries(WHO_OPTS).map(([k, v]) => `<option value="${k}" ${b.w === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="field full"><label for="bn">Nota (opcional)</label><input id="bn" type="text" name="n" value="${esc(b.n || "")}" maxlength="200"></div>
    </div>
    <p class="msg err" id="bmsg"></p>
    <div class="row2"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-act="bcancel">Cancelar</button>
    ${idx !== "new" ? `<button class="btn ghost" type="button" data-act="bdel" data-i="${idx}">Borrar bloque</button>` : ""}</div>
  </form>`;
}
function viewSemana() {
  const i = ui.semDay, d = day(i);
  const rows = d.blocks.map((b, k) => {
    if (ui.edit && ui.edit.day === i && ui.edit.i === k) return `<div class="row"><div class="time">${fmt(b.s)}</div><div class="cell">${blockForm(b, k)}</div></div>`;
    return `<div class="row"><div class="time">${fmt(b.s)}<span>${fmt(b.e)}</span></div><div class="cell"><div class="blk" style="${vars(b.c)}">
      <div class="t">${b.w !== "ambos" ? `<span class="pillhead" style="font-size:9px;padding:2px 8px">${WHO[b.w]}</span>` : ""}${esc(b.t)}<span class="d">${durTxt(toMin(b.e) - toMin(b.s))}</span>
      <button type="button" class="btn sm ghost" style="margin-left:auto" data-act="bedit" data-i="${k}">Editar</button></div>
      ${b.n ? `<div class="n">${esc(b.n)}</div>` : ""}</div></div></div>`;
  }).join("");
  const adding = ui.edit && ui.edit.day === i && ui.edit.i === "new";
  return `<div class="wrap">
  <section><div class="sec-head"><h2>Plan semanal</h2><div class="meta"><a class="btn sm" href="#ajustes" data-act="gocal">Agregar a mi calendario</a></div></div>
    <p class="sub">Hora por hora, como el horario de la escuela. La columna de hoy y la hora actual van marcadas en rosa. En el celular, desliza para ver todos los días.</p>
    <div class="row2"><div class="seg" role="group" aria-label="Ver horario de">${[["dar", "Darlene"], ["el", "Berny"], ["ambos", "Los dos"]].map(([k, l]) => `<button type="button" data-act="tablewho" data-w="${k}" aria-pressed="${ui.tableWho === k}">${l}</button>`).join("")}</div></div>
    ${hourTable()}</section>
  <section><div class="sec-head"><h2>Editar el horario</h2><div class="meta"><span>${horario.u ? "Editado " + new Date(horario.u).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "Horario original"}</span></div></div>
    <p class="sub">Los cambios se guardan para los dos y se reflejan en el calendario del celular de cada uno.</p>
    ${horario.u && (horario.version || 1) < window.HORARIO_BASE.version ? `<div class="card" style="border-color:var(--rose)"><h3>Hay un horario nuevo</h3><p class="msg">Clases por hora, comidas juntos, 30 min para cocinar antes de cada comida y desayuno y colación listos desde la noche. Si lo usan, se reemplazan los cambios que hicieron al horario (sus registros no se tocan).</p><div class="row2"><button class="btn primary" type="button" data-act="hresetok">Usar el horario nuevo</button></div></div>` : ""}
    <div class="tabs" role="tablist">${DAYS_SHORT.map((n, k) => `<button class="tab" type="button" data-act="semday" data-i="${k}" aria-selected="${k === i}">${n}</button>`).join("")}</div>
    <form class="card" data-form="wake"><h3>${d.name} <small>${hasVenta(d) ? "venta" : "día libre"}</small></h3>
      <div class="row2"><div class="field"><label for="dw">Despertar</label><input id="dw" type="time" name="wake" value="${d.wake}"></div>
      <div class="field"><label for="ds">Dormir</label><input id="ds" type="time" name="sleep" value="${d.sleep}"></div>
      <div class="field"><label for="df">Comidas</label><select id="df" name="food"><option ${d.food === "Día A" ? "selected" : ""}>Día A</option><option ${d.food === "Día B" ? "selected" : ""}>Día B</option></select></div>
      <button class="btn" type="submit">Guardar</button></div></form>
    <div class="tl">${rows}</div>
    ${adding ? blockForm({ s: "12:00", e: "13:00", t: "", c: "tareas", w: "ambos", n: "" }, "new") : `<div class="row2"><button class="btn primary" type="button" data-act="badd">Agregar bloque</button></div>`}
    <div class="card"><h3>Horario original</h3><p class="msg">Si algo se desacomoda, pueden volver al horario con el que empezamos. Sus registros de días, dinero y notas no se tocan.</p>
      <div class="row2"><button class="btn ghost" type="button" data-act="hreset">Restablecer horario</button>
      <span class="confirm" id="hconfirm"><span class="msg">¿Seguro? Se pierden los cambios al horario.</span><button class="btn sm primary" type="button" data-act="hresetok">Sí, restablecer</button></span></div></div>
  </section></div>`;
}
function saveHorario() {
  horario.days.forEach((d) => d.blocks.sort((a, b) => toMin(a.s) - toMin(b.s)));
  horario.u = Date.now();
  if (!horario.version) horario.version = window.HORARIO_BASE.version;
  LS.set("ns.horario", horario);
  queue("config/horario");
}

// ------------------------------------------------------------ vista: DINERO
function viewDinero() {
  const ym = ui.moneyMonth, dates = monthDates(ym), mo = moneyOf(dates);
  const donas = mo.moves.filter((m) => m.cat === "Venta de donas");
  const ventasDias = new Set(donas.map((m) => m.date)).size;
  const byCat = {};
  mo.moves.forEach((m) => { const k = m.tipo + "|" + m.cat; byCat[k] = (byCat[k] || 0) + +m.monto; });
  const per = ["dar", "el"].map((w) => ({ w, ...moneyOf(dates, [w]) }));
  const rowsCat = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => { const [t, c] = k.split("|"); return `<tr><td>${esc(c)}</td><td>${t === "ingreso" ? "Ingreso" : "Egreso"}</td><td class="r">${money(v)}</td></tr>`; }).join("");
  const moves = mo.moves.slice().sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="wrap"><section>
    <div class="calhead"><a class="btn sm" href="#dinero" data-act="mon" data-n="-1" aria-label="Mes anterior">‹</a><h2>Dinero · ${monthName(ym)}</h2>
      <a class="btn sm" href="#dinero" data-act="mon" data-n="1" aria-label="Mes siguiente">›</a><button class="btn sm ghost" type="button" data-act="copysum">Copiar resumen</button></div>
    <span class="msg" id="copymsg"></span>
    <div class="tiles"><div class="tile ing"><small>Ingresos</small><b>${money(mo.ing)}</b></div><div class="tile egr"><small>Egresos</small><b>${money(mo.egr)}</b></div>
      <div class="tile"><small>Neto</small><b>${money(mo.net)}</b></div>
      <div class="tile"><small>Venta de donas</small><b>${money(donas.reduce((s, m) => s + +m.monto, 0))}</b><span>${ventasDias} días con venta registrada</span></div>
      <div class="tile"><small>Promedio por día de venta</small><b>${money(ventasDias ? donas.reduce((s, m) => s + +m.monto, 0) / ventasDias : 0)}</b></div></div>
    <div class="card"><h3>Por día <span class="lgd"><span><i style="background:var(--k-ingreso)"></i>Ingresos</span><span><i style="background:var(--k-egreso)"></i>Egresos</span></span></h3>
      <div class="chart" id="chart">${chartSVG(dates)}<div class="tip" id="tip"></div></div></div>
    <div class="two">
      <div class="card"><h3>Por categoría</h3><div class="tbl"><table><thead><tr><th>Categoría</th><th>Tipo</th><th class="r">Total</th></tr></thead><tbody>${rowsCat || '<tr><td colspan="3" class="empty">Sin movimientos este mes.</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>Por persona</h3><div class="tbl"><table><thead><tr><th>Quién</th><th class="r">Ingresos</th><th class="r">Egresos</th><th class="r">Neto</th></tr></thead><tbody>${per.map((p) => `<tr><td>${WHO[p.w]}</td><td class="r">${money(p.ing)}</td><td class="r">${money(p.egr)}</td><td class="r">${money(p.net)}</td></tr>`).join("")}</tbody></table></div></div>
    </div>
    <div class="card"><h3>Movimientos del mes <small>${moves.length}</small></h3><div class="tbl"><table><thead><tr><th>Fecha</th><th>Quién</th><th>Categoría</th><th>Concepto</th><th class="r">Monto</th></tr></thead><tbody>
      ${moves.map((m) => `<tr><td><a href="#dia-${m.date}" style="color:var(--rose-2)">${+m.date.slice(8)} ${MESES[+m.date.slice(5, 7) - 1].slice(0, 3)}</a></td><td>${WHO[m.who]}</td><td>${esc(m.cat)}</td><td>${esc(m.concepto || "")}</td><td class="r" style="color:${m.tipo === "ingreso" ? "#f08aab" : "#8cc2ea"}">${m.tipo === "egreso" ? "−" : "+"}${money(m.monto)}</td></tr>`).join("") || '<tr><td colspan="5" class="empty">Registren ingresos y egresos desde Hoy o desde cualquier día de la Agenda.</td></tr>'}
    </tbody></table></div></div>
  </section></div>`;
}
function niceMax(v) { if (v <= 0) return 100; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function chartSVG(dates) {
  const W = 760, H = 230, L = 52, R = 8, T = 10, B = 26;
  const data = dates.map((dt) => { const m = moneyOf([dt]); return { dt, ing: m.ing, egr: m.egr }; });
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.ing, d.egr)), 0));
  const cw = (W - L - R) / data.length, bw = Math.max(2, Math.min(10, (cw - 4) / 2));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  let g = "";
  for (let k = 0; k <= 4; k++) { const v = (max / 4) * k; g += `<line class="gridl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v >= 1000 ? "$" + (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k" : "$" + v}</text>`; }
  const bar = (x, v, col) => { if (!v) return ""; const top = y(v), h = y(0) - top, r = Math.min(2, bw / 2, h); return `<path d="M${x} ${y(0)}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + bw - r}Q${x + bw} ${top} ${x + bw} ${top + r}V${y(0)}Z" fill="${col}"/>`; };
  data.forEach((d, k) => {
    const cx = L + cw * k + cw / 2;
    g += bar(cx - bw - 1, d.ing, "var(--k-ingreso)") + bar(cx + 1, d.egr, "var(--k-egreso)");
    if (k === 0 || (k + 1) % 5 === 0) g += `<text class="axis" x="${cx}" y="${H - 8}" text-anchor="middle">${k + 1}</text>`;
    g += `<rect class="hit" x="${L + cw * k}" y="${T}" width="${cw}" height="${H - T - B}" data-k="${k}" data-dt="${d.dt}" data-ing="${d.ing}" data-egr="${d.egr}"/>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y egresos por día del mes">${g}<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/></svg>`;
}
function bindChart() {
  const c = $("#chart"), tip = $("#tip");
  if (!c) return;
  const show = (r) => {
    const ing = +r.dataset.ing, egr = +r.dataset.egr, box = c.getBoundingClientRect(), rb = r.getBoundingClientRect();
    tip.innerHTML = `<b>${esc(longDate(r.dataset.dt))}</b><div><span><i style="background:var(--k-ingreso)"></i>Ingresos</span><span>${money(ing)}</span></div><div><span><i style="background:var(--k-egreso)"></i>Egresos</span><span>${money(egr)}</span></div><div><span>Neto</span><span>${money(ing - egr)}</span></div>`;
    tip.style.display = "block";
    let x = rb.left - box.left + rb.width / 2 + 10;
    if (x + 190 > box.width) x = rb.left - box.left - 200;
    tip.style.left = Math.max(0, x) + "px"; tip.style.top = "8px";
  };
  c.querySelectorAll(".hit").forEach((r) => { r.addEventListener("mouseenter", () => show(r)); r.addEventListener("click", () => show(r)); });
  c.addEventListener("mouseleave", () => (tip.style.display = "none"));
}

// ------------------------------------------------------------ vista: GUÍA
const TODO = [
  ["Turnos en las donas", "Mientras uno sigue con las donas, el otro deja lista la sopa y la cena, lava trastes y arma loncheras (o al revés). Al volver de vender solo calientan y cenan."],
  ["Salir juntos para ahorrar gasolina", "Martes, miércoles y viernes regresan juntos: Darlene usa la espera en la escuela para tareas o proyectos. Solo el jueves ella se va aparte, y el lunes no tiene clases."],
  ["Darlene arranca las donas lunes y jueves", "Esos días Darlene llega antes y Berny se suma a las 4:15. Dejen pesados los secos y listo el glaseado: miércoles en la noche (jue a sáb) y domingo (lun y mar)."],
  ["Los huecos de Berny son su tarea y su YouTube", "Lunes 11 a 2, martes 1 a 3, miércoles 1 a 2, jueves 11 a 12 y viernes 9 a 10: unas 6 h con laptop en la biblioteca."],
  ["Lunes de Darlene: 3 h enfocadas en la mañana", "De 8:30 a 11:30, recién desayunada y sin celular. Después pone la lavadora, edita YouTube y hace tarea."],
  ["Miércoles: día libre de donas", "2:30 h juntos para YouTube y proyectos. Solo queda la limpieza de mascotas."],
  ["Todo listo desde la noche", "A las 9:15 pm quedan en el carro mochilas, ropa y loncheras. En la mañana Berny solo licúa y lo pone en termos."],
  ["YouTube sin tiempo extra", "Celular en tripié mientras preparan y venden: de ahí salen los shorts. Un video editado por semana."],
  ["Se recorta la tarea, no el sueño", "Entre semana se duermen a las 9:30 pm: 7 h justas hasta las 4:30."],
  ["Registren el dinero cada día", "Cada venta y cada gasto en su día de la agenda. En Dinero verán cuánto deja cada día de venta."],
];
function viewGuia() {
  return `<div class="wrap">
  <section><div class="sec-head"><h2>Domingo de meal prep</h2><div class="meta">9:30 – 12:30 <span>3 h</span></div></div>
    <div class="two"><div class="torn" data-torn><h3>Orden de trabajo · Berny en la estufa, Darlene en la tabla</h3><ol class="steps">
      <li><b class="tm">9:30</b><span><b>Frijoles</b> (remojados desde el sábado) a la olla exprés y <b>arroz</b> a la arrocera.</span></li>
      <li><b class="tm">9:40</b><span><b>Pollo</b> (2.3 kg) al horno o a la plancha, sazonado de 2 formas. <b>Camote y papa</b> en la misma vuelta.</span></li>
      <li><b class="tm">10:00</b><span>Verdura desinfectada y picada. Base de <b>sopa de verduras</b> (días A) y <b>crema de calabacita</b> (días B). La pasta se cuece aparte.</span></li>
      <li><b class="tm">11:00</b><span><b>Desayunos de huevo</b>: burritos con espinaca (A) y muffins de huevo con champiñón (B).</span></li>
      <li><b class="tm">11:30</b><span><b>Kits de licuado</b> en ziploc y <b>colaciones</b>: yogur con fruta en frascos, granola y almendras aparte.</span></li>
      <li><b class="tm">12:00</b><span><b>Porcionar y etiquetar</b>. En lonchera va la comida fuerte de Berny (lun a mié) y la de Darlene (mar y mié).</span></li>
    </ol><span class="scrib" aria-hidden="true">disciplina hoy</span></div>
    <div class="store">
      <div class="box"><span class="pillhead">Refri · lun a mié</span><ul><li>Comidas fuertes en tupper</li><li>Sopas y cremas</li><li>Desayunos de huevo</li><li>Yogures armados y ensaladas</li></ul></div>
      <div class="box"><span class="pillhead">Congelador · jue a sáb</span><ul><li>Comidas fuertes y sopas en ziploc</li><li>Desayunos y kits de licuado</li><li>Cada noche pasen al refri lo de mañana</li></ul></div>
      <div class="box"><span class="pillhead">Al momento · 5 min</span><ul><li>Cena A: huevo + frijoles</li><li>Cena B: ensalada de atún con papa</li><li>Fines de semana: desayuno recién hecho</li></ul></div>
    </div></div></section>
  <section><div class="sec-head"><h2>To do</h2><div class="meta">Cambios recomendados <span>${todoDone.filter(Boolean).length} / ${TODO.length}</span></div></div>
    <ul class="todo">${TODO.map(([t, p], k) => `<li class="${todoDone[k] ? "done" : ""}"><input type="checkbox" data-act="todo" data-i="${k}" ${todoDone[k] ? "checked" : ""} aria-label="Marcar: ${esc(t)}"><div><h3>${esc(t)}</h3><p>${esc(p)}</p></div></li>`).join("")}</ul></section>
  <footer><span class="motto">Disciplina hoy, resultados mañana</span></footer></div>`;
}

// ------------------------------------------------------------ vista: DEUDAS
function debtRow(d) {
  const [cls, label] = debtState(d), paid = debtPaid(d), left = debtLeft(d), pct = d.monto ? Math.min(100, Math.round((paid / d.monto) * 100)) : 0;
  const open = ui.abono === d.id;
  return `<li class="debt ${cls}">
    <div class="dtop"><span class="pill ${cls}">${label}</span><span class="tag ${d.tipo === "debemos" ? "egreso" : "ingreso"}">${d.tipo === "debemos" ? "Debemos" : "Nos deben"}</span>
      <b class="dc">${esc(d.concepto)}</b><span class="amt">${money(left)}<small> de ${money(d.monto)}</small></span></div>
    <div class="bar"><span style="width:${pct}%"></span></div>
    <div class="dmeta">${d.persona ? `<span>${d.tipo === "debemos" ? "A" : "De"}: <b>${esc(d.persona)}</b></span>` : ""}
      ${d.vence ? `<span>Fecha límite: <b>${esc(longDate(d.vence))}</b></span>` : ""}<span>Responsable: <b>${WHO_OPTS[d.quien] || "Los dos"}</b></span>
      ${d.nota ? `<span>${esc(d.nota)}</span>` : ""}</div>
    ${(d.abonos || []).length ? `<ul class="abonos">${d.abonos.map((a) => `<li><span>${esc(longDate(a.fecha))}</span><span>${WHO[a.quien] || ""}</span><b>${money(a.monto)}</b></li>`).join("")}</ul>` : ""}
    ${d.pagado || left <= 0 ? `<div class="row2"><button class="btn sm ghost" type="button" data-act="ddel" data-id="${d.id}">Quitar de la lista</button></div>`
      : open ? `<form class="row2" data-form="abono" data-id="${d.id}"><div class="field"><label for="ab-${d.id}">Monto del ${d.tipo === "debemos" ? "pago" : "cobro"}</label><input id="ab-${d.id}" type="number" name="monto" inputmode="decimal" min="0" step="0.5" value="${left}" required></div>
          <label class="chk"><input type="checkbox" name="mov" checked> Anotarlo en Dinero de hoy</label>
          <button class="btn primary sm" type="submit">Guardar</button><button class="btn sm" type="button" data-act="dcancel">Cancelar</button></form>`
      : `<div class="row2"><button class="btn sm primary" type="button" data-act="dabono" data-id="${d.id}">${d.tipo === "debemos" ? "Registrar pago" : "Registrar cobro"}</button>
          <button class="btn sm" type="button" data-act="dpagado" data-id="${d.id}">Marcar como liquidado</button><button class="btn sm ghost" type="button" data-act="ddel" data-id="${d.id}">Borrar</button></div>`}
  </li>`;
}
function viewDeudas() {
  const all = activeDebts();
  const pend = all.filter((d) => !d.pagado && debtLeft(d) > 0).sort((a, b) => (a.vence || "9999").localeCompare(b.vence || "9999"));
  const done = all.filter((d) => d.pagado || debtLeft(d) <= 0);
  const sum = (arr) => arr.reduce((s, d) => s + debtLeft(d), 0);
  const deb = pend.filter((d) => d.tipo === "debemos"), nos = pend.filter((d) => d.tipo !== "debemos");
  const pronto = pend.filter((d) => ["warn", "bad"].includes(debtState(d)[0])).length;
  const ym = today().slice(0, 7);
  const pagadoMes = all.reduce((s, d) => s + (d.abonos || []).filter((a) => a.fecha.startsWith(ym) && d.tipo === "debemos").reduce((x, a) => x + +a.monto, 0), 0);
  return `<div class="wrap"><section>
    <div class="sec-head"><h2>Deudas y pagos</h2><div class="meta">Pendientes <span>${pend.length}</span></div></div>
    <div class="tiles"><div class="tile egr"><small>Debemos</small><b>${money(sum(deb))}</b><span>${deb.length} pendientes</span></div>
      <div class="tile ing"><small>Nos deben</small><b>${money(sum(nos))}</b><span>${nos.length} pendientes</span></div>
      <div class="tile"><small>Vencidos o por vencer</small><b>${pronto}</b><span>En los próximos 3 días</span></div>
      <div class="tile"><small>Pagado este mes</small><b>${money(pagadoMes)}</b></div></div>
    <form class="card" data-form="deuda"><h3>Agregar deuda o pago pendiente</h3>
      <div class="seg" role="group" aria-label="Tipo">${[["debemos", "Debemos pagar"], ["nosdeben", "Nos deben"]].map(([k, l]) => `<button type="button" data-act="dtipo" data-t="${k}" aria-pressed="${(ui.dtipo || "debemos") === k}">${l}</button>`).join("")}</div>
      <div class="money-form">
        <div class="field full"><label for="dc">Concepto</label><input id="dc" type="text" name="concepto" maxlength="80" required placeholder="Ej. Colegiatura, tarjeta, préstamo, renta…"></div>
        <div class="field"><label for="dp">${(ui.dtipo || "debemos") === "debemos" ? "¿A quién?" : "¿Quién nos debe?"}</label><input id="dp" type="text" name="persona" maxlength="60" placeholder="Opcional"></div>
        <div class="field"><label for="dm">Monto total</label><input id="dm" type="number" name="monto" inputmode="decimal" min="0" step="0.5" required placeholder="0.00"></div>
        <div class="field"><label for="dv">Fecha límite</label><input id="dv" type="date" name="vence"></div>
        <div class="field"><label for="dq">Responsable</label><select id="dq" name="quien">${Object.entries(WHO_OPTS).map(([k, v]) => `<option value="${k}" ${k === "ambos" ? "selected" : ""}>${v}</option>`).join("")}</select></div>
        <div class="field full"><label for="dn">Nota (opcional)</label><input id="dn" type="text" name="nota" maxlength="140" placeholder="Ej. pagar en 3 partes, número de cuenta…"></div>
        <button class="btn primary full" type="submit">Agregar</button>
      </div></form>
    <div class="card"><h3>Pendientes <small>ordenados por fecha límite</small></h3>
      <ul class="debts">${pend.map(debtRow).join("") || '<li class="empty">Sin deudas pendientes. 🎉</li>'}</ul></div>
    ${done.length ? `<div class="card"><h3>Liquidados <small>${done.length}</small></h3><ul class="debts">${done.map(debtRow).join("")}</ul></div>` : ""}
  </section></div>`;
}
function upcomingDebtsCard() {
  const soon = activeDebts().filter((d) => !d.pagado && debtLeft(d) > 0 && d.vence && (parseYmd(d.vence) - parseYmd(today())) / 86400000 <= 7)
    .sort((a, b) => a.vence.localeCompare(b.vence));
  if (!soon.length) return "";
  return `<div class="card"><h3>Pagos próximos <small><a href="#deudas" style="color:var(--rose-2)">Ver deudas</a></small></h3><ul class="moves">${soon.map((d) => { const [c, l] = debtState(d); return `<li><span class="pill ${c}">${l}</span><span>${esc(d.concepto)}${d.persona ? `<br><span class="sub2">${d.tipo === "debemos" ? "A" : "De"} ${esc(d.persona)}</span>` : ""}</span><span class="amt ${d.tipo === "debemos" ? "egreso" : "ingreso"}">${money(debtLeft(d))}</span><span></span></li>`; }).join("")}</ul></div>`;
}

// ------------------------------------------------------------ vista: AJUSTES
function viewAjustes() {
  const calWho = settings.calWho || settings.who;
  const host = location.host;
  const canSub = !!settings.pin && /^https?:$/.test(location.protocol) && host;
  const q = `who=${calWho}&k=${encodeURIComponent(settings.pin)}&modo=${settings.calModo}`;
  return `<div class="wrap">
  <section id="calendario"><div class="sec-head"><h2>Calendario del celular</h2></div>
    <div class="card"><h3>Agregar mi horario a mi calendario</h3>
      <p class="msg">Cada quien lo hace en su celular. El teléfono te pide autorización para suscribirte y, desde ahí, tu horario aparece en la app Calendario y se actualiza solo cuando cambien algo aquí.</p>
      <div class="row2"><div class="field"><label>¿De quién?</label><div class="seg">${["dar", "el"].map((w) => `<button type="button" data-act="calwho" data-who="${w}" aria-pressed="${calWho === w}">${WHO[w]}</button>`).join("")}</div></div>
      <div class="field"><label>Qué incluir</label><div class="seg">${[["importante", "Lo importante"], ["todo", "Todo"]].map(([k, l]) => `<button type="button" data-act="calmodo" data-m="${k}" aria-pressed="${settings.calModo === k}">${l}</button>`).join("")}</div></div></div>
      ${canSub ? `<div class="row2"><a class="btn primary" href="webcal://${host}/api/calendar?${q}">Suscribirme (iPhone y Mac)</a>
        <button class="btn" type="button" data-act="copycal" data-url="https://${host}/api/calendar?${q}">Copiar enlace para Google Calendar</button></div>
        <p class="msg">Android / Google Calendar: copia el enlace y, en calendar.google.com, ve a “Otros calendarios” → “+” → “Desde URL” y pégalo.</p>`
      : `<p class="msg err">Para suscribirte primero escribe el código de pareja abajo (y la app debe estar publicada en Netlify).</p>`}
      <div class="row2"><button class="btn ghost" type="button" data-act="dlics">Descargar .ics (se agrega una sola vez, no se actualiza)</button></div>
      <span class="msg" id="calmsg"></span>
    </div></section>
  <section><div class="sec-head"><h2>Este celular</h2></div>
    <div class="card"><h3>¿Quién usa este celular?</h3><p class="msg">Al abrir un día, se muestra primero tu sección.</p>
      <div class="seg">${["dar", "el"].map((w) => `<button type="button" data-act="me" data-who="${w}" aria-pressed="${settings.who === w}">${WHO[w]}</button>`).join("")}</div></div>
    <form class="card" data-form="pin"><h3>Código de pareja</h3>
      <p class="msg">Es el mismo código en los dos celulares y el mismo que pusieron como <b>APP_PIN</b> en Netlify. Con él, lo que registra uno lo ve el otro.</p>
      <div class="row2"><div class="field" style="flex:1"><label for="pin">Código</label><input id="pin" type="password" name="pin" value="${esc(settings.pin)}" autocomplete="off" placeholder="Su código secreto"></div>
      <button class="btn primary" type="submit">Guardar y probar</button></div><span class="msg ${ui.pinMsg ? ui.pinMsg[0] : ""}" id="pinmsg">${ui.pinMsg ? esc(ui.pinMsg[1]) : ""}</span></form></section>
  <section><div class="sec-head"><h2>Respaldo</h2></div>
    <div class="card"><h3>Guardar o recuperar sus datos</h3>
      <p class="msg">Descarguen un respaldo de vez en cuando. Si cambian de celular, lo pueden restaurar aquí.</p>
      <div class="row2"><button class="btn" type="button" data-act="backup">Descargar respaldo</button>
      <label class="btn" for="restore">Restaurar respaldo</label><input id="restore" type="file" accept="application/json,.json" data-act="restore" hidden></div>
      <span class="msg" id="bkmsg"></span>
      <div class="row2"><button class="btn ghost" type="button" data-act="wipe">Borrar datos de este celular</button>
      <span class="confirm" id="wconfirm"><span class="msg">Se borra solo de este celular. Si tienen código de pareja, lo sincronizado sigue en Netlify.</span><button class="btn sm primary" type="button" data-act="wipeok">Sí, borrar</button></span></div>
    </div></section>
  </div>`;
}

// ------------------------------------------------------------ eventos
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const peopleDate = (el) => el.closest("[data-date]")?.dataset.date || today();

document.addEventListener("click", async (ev) => {
  const t = ev.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act, who = t.dataset.who;
  if (["check", "habit", "ctoggle", "todo", "restore"].includes(act)) return; // los maneja "change"
  if (t.tagName === "A" && ["cal", "mon"].includes(act)) ev.preventDefault();
  const date = peopleDate(t);
  if (act === "meal") { const e = getE(date, who); e.meals[+t.dataset.i] = e.meals[+t.dataset.i] ? 0 : 1; saveE(date, who, e); return render(true); }
  if (act === "cdel") { ev.preventDefault(); const e = getE(date, who); e.custom = e.custom.filter((c) => c.id !== t.dataset.id); saveE(date, who, e); return render(true); }
  if (act === "mdel") { const e = getE(date, who); e.money = e.money.filter((m) => m.id !== t.dataset.id); saveE(date, who, e); return render(true); }
  if (act === "who") { ui.who = who; return render(true); }
  if (act === "cal") { ui.calMonth = +t.dataset.n === 0 ? today().slice(0, 7) : shiftMonth(ui.calMonth, +t.dataset.n); render(true); return pull(); }
  if (act === "mon") { ui.moneyMonth = shiftMonth(ui.moneyMonth, +t.dataset.n); render(true); return pull(); }
  if (act === "dtipo") { ui.dtipo = t.dataset.t; return render(true); }
  if (act === "dabono") { ui.abono = t.dataset.id; return render(true); }
  if (act === "dcancel") { ui.abono = null; return render(true); }
  if (act === "dpagado") { const d = deudas.items.find((x) => x.id === t.dataset.id); if (d) { d.pagado = true; d.u = Date.now(); saveDeudas(); } return render(true); }
  if (act === "ddel") { const d = deudas.items.find((x) => x.id === t.dataset.id); if (d) { d.del = true; d.u = Date.now(); saveDeudas(); } return render(true); }
  if (act === "tablewho") { ui.tableWho = t.dataset.w; return render(true); }
  if (act === "lovenofoto") { ui.loveFoto = null; return render(true); }
  if (act === "semday") { ui.semDay = +t.dataset.i; ui.edit = null; return render(true); }
  if (act === "bedit") { ui.edit = { day: ui.semDay, i: +t.dataset.i }; return render(true); }
  if (act === "badd") { ui.edit = { day: ui.semDay, i: "new" }; return render(true); }
  if (act === "bcancel") { ui.edit = null; return render(true); }
  if (act === "bdel") { day(ui.semDay).blocks.splice(+t.dataset.i, 1); ui.edit = null; saveHorario(); return render(true); }
  if (act === "hreset") { $("#hconfirm").classList.add("on"); return; }
  if (act === "hresetok") { horario = clone(window.HORARIO_BASE); saveHorario(); ui.edit = null; return render(true); }
  if (act === "calwho") { settings.calWho = who; saveSettings(); return render(true); }
  if (act === "calmodo") { settings.calModo = t.dataset.m; saveSettings(); return render(true); }
  if (act === "me") { settings.who = who; ui.who = who; ui.tableWho = who; settings.calWho = who; saveSettings(); return render(true); }
  if (act === "copycal") { try { await navigator.clipboard.writeText(t.dataset.url); $("#calmsg").textContent = "Enlace copiado."; } catch (e) { $("#calmsg").textContent = t.dataset.url; } return; }
  if (act === "dlics") { const w = settings.calWho || settings.who; download(`nuestra-semana-${w}.ics`, buildICS(horario, w, settings.calModo, WHO[w]), "text/calendar"); $("#calmsg").textContent = "Abre el archivo descargado para agregar los eventos."; return; }
  if (act === "backup") { download(`nuestra-semana-respaldo-${today()}.json`, JSON.stringify({ app: "nuestra-semana", v: 1, entries, horario, todoDone, msgs, deudas }, null, 1), "application/json"); $("#bkmsg").textContent = "Respaldo descargado."; return; }
  if (act === "wipe") { $("#wconfirm").classList.add("on"); return; }
  if (act === "wipeok") { entries = {}; pending = []; horario = clone(window.HORARIO_BASE); todoDone = []; msgs = {}; deudas = { items: [], u: 0 }; ["ns.entries", "ns.pending", "ns.horario", "ns.todo", "ns.msgs", "ns.deudas"].forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} }); render(true); return pull(); }
  if (act === "copysum") {
    const ym = ui.moneyMonth, mo = moneyOf(monthDates(ym));
    const txt = `Nuestra semana · ${monthName(ym)}\nIngresos: ${money(mo.ing)}\nEgresos: ${money(mo.egr)}\nNeto: ${money(mo.net)}`;
    try { await navigator.clipboard.writeText(txt); $("#copymsg").textContent = "Resumen copiado. Pégalo en WhatsApp."; } catch (e) { $("#copymsg").textContent = txt; }
    return;
  }
});
document.addEventListener("change", (ev) => {
  const t = ev.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act, who = t.dataset.who, date = peopleDate(t);
  if (act === "check") { const e = getE(date, who); e.checks[t.dataset.id] = t.checked; if (!t.checked) delete e.checks[t.dataset.id]; saveE(date, who, e); return render(true); }
  if (act === "habit") { const e = getE(date, who); e.habits[t.dataset.k] = t.checked; saveE(date, who, e); return render(true); }
  if (act === "ctoggle") { const e = getE(date, who); const c = e.custom.find((x) => x.id === t.dataset.id); if (c) c.done = t.checked; saveE(date, who, e); return render(true); }
  if (act === "lovefoto") {
    const f = t.files && t.files[0]; if (!f) return;
    const ta = document.querySelector('[data-form="love"] textarea'); if (ta) ui.loveDraft = ta.value;
    compressPhoto(f).then((d) => { ui.loveFoto = d; ui.loveMsg = ""; render(true); }).catch((e) => { ui.loveMsg = e.message; render(true); });
    return;
  }
  if (act === "todo") { todoDone[+t.dataset.i] = t.checked; LS.set("ns.todo", todoDone); return render(true); }
  if (act === "restore") {
    const f = t.files && t.files[0]; if (!f) return;
    f.text().then((s) => {
      const d = JSON.parse(s);
      if (d.app !== "nuestra-semana") throw new Error("Ese archivo no es un respaldo de esta app.");
      Object.entries(d.entries || {}).forEach(([k, v]) => { if (!entries[k] || (v.u || 0) > (entries[k].u || 0)) { entries[k] = v; queue(k); } });
      if (d.horario && Array.isArray(d.horario.days) && (d.horario.u || 0) > (horario.u || 0)) { horario = d.horario; LS.set("ns.horario", horario); queue("config/horario"); }
      if (Array.isArray(d.todoDone)) { todoDone = d.todoDone; LS.set("ns.todo", todoDone); }
      if (d.msgs && typeof d.msgs === "object") { msgs = Object.assign({}, msgs, d.msgs); LS.set("ns.msgs", msgs); }
      if (d.deudas && Array.isArray(d.deudas.items)) { deudas = mergeDeudas(deudas, d.deudas).doc; LS.set("ns.deudas", deudas); queue("config/deudas"); }
      LS.set("ns.entries", entries); render(true); $("#bkmsg").textContent = "Respaldo restaurado.";
    }).catch((e) => { $("#bkmsg").textContent = e.message || "No se pudo leer el archivo."; });
  }
});
const notaT = {};
document.addEventListener("input", (ev) => {
  const t = ev.target;
  if (t.dataset.act !== "nota") return;
  const who = t.dataset.who, date = peopleDate(t), s = $("#saved-" + who);
  if (s) s.textContent = "Escribiendo…";
  clearTimeout(notaT[who]);
  notaT[who] = setTimeout(() => { const e = getE(date, who); e.nota = t.value; saveE(date, who, e); if (s) s.textContent = "Guardado " + fmt(hhmm(nowMin())); }, 600);
});
document.addEventListener("submit", async (ev) => {
  const f = ev.target.closest("[data-form]");
  if (!f) return;
  ev.preventDefault();
  const fd = new FormData(f), who = f.dataset.who, date = peopleDate(f);
  if (f.dataset.form === "deuda") {
    const monto = Math.round(parseFloat(fd.get("monto")) * 100) / 100;
    const concepto = String(fd.get("concepto") || "").trim();
    if (!(monto > 0) || !concepto) return;
    deudas.items.push({ id: uid(), tipo: ui.dtipo || "debemos", concepto, persona: String(fd.get("persona") || "").trim(), monto, vence: String(fd.get("vence") || ""),
      quien: fd.get("quien") || "ambos", nota: String(fd.get("nota") || "").trim(), abonos: [], pagado: false, u: Date.now() });
    saveDeudas(); return render(true);
  }
  if (f.dataset.form === "abono") {
    const d = deudas.items.find((x) => x.id === f.dataset.id); if (!d) return;
    const monto = Math.round(parseFloat(fd.get("monto")) * 100) / 100; if (!(monto > 0)) return;
    d.abonos = d.abonos || []; d.abonos.push({ id: uid(), monto, fecha: today(), quien: settings.who });
    if (debtLeft(d) <= 0) d.pagado = true;
    d.u = Date.now(); saveDeudas();
    if (fd.get("mov")) {
      const quien = d.quien === "ambos" ? settings.who : d.quien;
      addMovement(today(), quien, d.tipo === "debemos" ? "egreso" : "ingreso", d.tipo === "debemos" ? "Pago de deuda" : "Cobro de deuda", monto, d.concepto + (d.persona ? " · " + d.persona : ""));
    }
    ui.abono = null; return render(true);
  }
  if (f.dataset.form === "love") {
    const texto = String(fd.get("texto") || "").trim();
    if (!texto && !ui.loveFoto) { ui.loveMsg = ""; return; }
    const to = settings.who === "dar" ? "el" : "dar";
    msgs[to] = { de: settings.who, texto, foto: ui.loveFoto || null, u: Date.now() };
    LS.set("ns.msgs", msgs); queue("msg/" + to);
    ui.loveFoto = null; ui.loveDraft = ""; ui.loveMsg = `Listo, tu ${NICK[to]} lo verá al abrir la app.`;
    return render(true);
  }
  if (f.dataset.form === "task") {
    const tx = String(fd.get("t") || "").trim(); if (!tx) return;
    const e = getE(date, who); e.custom.push({ id: uid(), t: tx, done: false }); saveE(date, who, e); render(true);
    const inp = $(`[data-form="task"][data-who="${who}"] input`); if (inp) inp.focus();
    return;
  }
  if (f.dataset.form === "money") {
    const monto = Math.round(parseFloat(fd.get("monto")) * 100) / 100;
    if (!(monto > 0)) return;
    const [tipo, cat] = String(fd.get("cat")).split("|");
    const e = getE(date, who); e.money.push({ id: uid(), tipo, cat, monto, concepto: String(fd.get("concepto") || "").trim() }); saveE(date, who, e);
    return render(true);
  }
  if (f.dataset.form === "block") {
    const b = { s: fd.get("s"), e: fd.get("e"), t: String(fd.get("t") || "").trim(), c: fd.get("c"), w: fd.get("w"), n: String(fd.get("n") || "").trim() };
    if (!b.t) { $("#bmsg").textContent = "Escribe qué se hace en este bloque."; return; }
    if (!b.s || !b.e || toMin(b.e) <= toMin(b.s)) { $("#bmsg").textContent = "La hora de fin debe ser después de la de inicio."; return; }
    const d = day(ui.semDay);
    if (f.dataset.i === "new") d.blocks.push(b); else d.blocks[+f.dataset.i] = b;
    ui.edit = null; saveHorario(); return render(true);
  }
  if (f.dataset.form === "wake") {
    const d = day(ui.semDay);
    if (fd.get("wake")) d.wake = fd.get("wake");
    if (fd.get("sleep")) d.sleep = fd.get("sleep");
    d.food = fd.get("food") || d.food;
    saveHorario(); return render(true);
  }
  if (f.dataset.form === "pin") {
    settings.pin = String(fd.get("pin") || "").trim(); saveSettings();
    const say = (cls, text) => { ui.pinMsg = [cls, text]; const m = $("#pinmsg"); if (m) { m.className = "msg " + cls; m.textContent = text; } };
    if (!settings.pin) { say("", "Sin código: los datos se quedan solo en este celular."); setSync("local"); return; }
    say("", "Probando…");
    try {
      await api("/api/data?ping=1");
      Object.keys(entries).forEach((k) => { if (!pending.includes(k)) pending.push(k); });
      if (horario.u && !pending.includes("config/horario")) pending.push("config/horario");
      LS.set("ns.pending", pending);
      say("ok", "Conectado. Lo que registren se comparte entre los dos celulares.");
      await pull(); render(true);
    } catch (e) {
      say("err", e.message === "Failed to fetch" ? "No hay conexión con el servidor. ¿La app ya está publicada en Netlify?" : e.message);
      setSync("err", "Sin conexión");
    }
  }
});

// ------------------------------------------------------------ decoración
function leopard() {
  const cv = $("#leopard"); if (!cv) return;
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  if (!r.width) return;
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  const x = cv.getContext("2d"); x.scale(dpr, dpr);
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const g = x.createLinearGradient(0, 0, r.width, r.height);
  g.addColorStop(0, "#b98a52"); g.addColorStop(0.5, "#d2a86c"); g.addColorStop(1, "#a5743f");
  x.fillStyle = g; x.fillRect(0, 0, r.width, r.height);
  for (let k = 0; k < (r.width * r.height) / 260; k++) { x.fillStyle = `rgba(${rnd() < 0.5 ? "90,55,20" : "240,210,160"},${0.05 + rnd() * 0.06})`; x.fillRect(rnd() * r.width, rnd() * r.height, 1 + rnd() * 2, 1 + rnd() * 2); }
  const small = r.width < 600, n = Math.floor((r.width * r.height) / (small ? 800 : 1500));
  for (let k = 0; k < n; k++) {
    const cx = rnd() * r.width, cy = rnd() * r.height, rad = (6 + rnd() * 11) * (small ? 0.7 : 1), rot = rnd() * Math.PI;
    x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(1, 0.75 + rnd() * 0.35);
    x.fillStyle = `rgba(${120 + rnd() * 30},${70 + rnd() * 20},${25 + rnd() * 15},.55)`;
    x.beginPath(); x.arc(0, 0, rad * 0.75, 0, Math.PI * 2); x.fill();
    const segs = 3 + Math.floor(rnd() * 3); x.strokeStyle = "#1b120b"; x.lineCap = "round";
    for (let s = 0; s < segs; s++) { const a0 = (s / segs) * Math.PI * 2 + rnd() * 0.5, a1 = a0 + ((Math.PI * 2) / segs) * (0.45 + rnd() * 0.35); x.lineWidth = rad * (0.32 + rnd() * 0.25); x.beginPath(); x.arc(0, 0, rad, a0, a1); x.stroke(); }
    x.restore();
  }
  for (let k = 0; k < n * 0.8; k++) { x.fillStyle = "#1b120b"; x.beginPath(); x.ellipse(rnd() * r.width, rnd() * r.height, 1.5 + rnd() * 3, 1 + rnd() * 2.5, rnd() * 3, 0, Math.PI * 2); x.fill(); }
}
function tear() {
  document.querySelectorAll("[data-torn]").forEach((el, k) => {
    let seed = 31 + k * 97; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const pts = [], N = 26, j = () => (rnd() * 1.6).toFixed(2);
    for (let i = 0; i <= N; i++) pts.push(`${((i / N) * 100).toFixed(2)}% ${j()}%`);
    for (let i = 0; i <= N; i++) pts.push(`${(100 - rnd() * 1.2).toFixed(2)}% ${((i / N) * 100).toFixed(2)}%`);
    for (let i = N; i >= 0; i--) pts.push(`${((i / N) * 100).toFixed(2)}% ${(100 - rnd() * 1.6).toFixed(2)}%`);
    for (let i = N; i >= 0; i--) pts.push(`${(rnd() * 1.2).toFixed(2)}% ${((i / N) * 100).toFixed(2)}%`);
    el.style.clipPath = `polygon(${pts.join(",")})`;
  });
}

// ------------------------------------------------------------ arranque
buildNav();
$("#sync").addEventListener("click", () => { if (settings.pin) pull(); else location.hash = "#ajustes"; });
window.addEventListener("hashchange", () => { ui.edit = null; render(); pull(); });
let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(leopard, 150); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { pull(); render(true); } });
window.addEventListener("online", pull);
setInterval(() => { tickNow(); if (currentRoute() === "semana" && !ui.edit) softRender(); }, 60000);
setInterval(tickNow, 30000);
setInterval(pull, 60000);
render();
setSync(settings.pin ? "busy" : "local");
pull();
