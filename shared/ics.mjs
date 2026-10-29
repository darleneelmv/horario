/* Genera un calendario .ics con el horario semanal de una persona (eventos que se repiten cada semana). */
function buildICS(horario, who, modo, nombre) {
  const IMPORTANTE = ["gym", "escuela", "proyecto", "donas", "perrita", "casa", "youtube", "tareas"];
  const NUNCA = ["sueno", "colchon"];
  const ALARMA = /^(Gym|Venta de donas)/;
  const ancla = [2026, 9, 26]; // lunes 26 oct 2026: primera semana del calendario
  const pad = (n) => String(n).padStart(2, "0");
  const fecha = (i, hhmm) => {
    const d = new Date(Date.UTC(ancla[0], ancla[1], ancla[2] + i));
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${hhmm.replace(":", "")}00`;
  };
  const txt = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const slug = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const fold = (line) => {
    const enc = new TextEncoder();
    if (enc.encode(line).length <= 74) return line;
    const out = []; let cur = "", len = 0;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (len + b > (out.length ? 73 : 74)) { out.push(cur); cur = ""; len = 0; }
      cur += ch; len += b;
    }
    out.push(cur);
    return out.join("\r\n ");
  };
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const L = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nuestra semana//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${txt("Nuestra semana · " + nombre)}`, "X-WR-TIMEZONE:America/Mexico_City",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
    "BEGIN:VTIMEZONE", "TZID:America/Mexico_City", "BEGIN:STANDARD", "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0600", "TZOFFSETTO:-0600", "TZNAME:CST", "END:STANDARD", "END:VTIMEZONE",
  ];
  const toM = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  horario.days.forEach((d, i) => {
    // Sin traslapes: lo que pasa dentro de otra actividad (desayuno en clase, sopita en la venta)
    // se agrega a la descripción de esa actividad; los traslapes parciales se recortan.
    const lista = d.blocks
      .filter((b) => b.w === "ambos" || b.w === who)
      .filter((b) => !NUNCA.includes(b.c))
      .filter((b) => modo === "todo" || (IMPORTANTE.includes(b.c) && !/^(Regreso|Camino|Margen)/.test(b.t)))
      .map((b) => ({ ...b, extra: [] }))
      .sort((a, b) => toM(a.s) - toM(b.s) || (toM(b.e) - toM(b.s)) - (toM(a.e) - toM(a.s)));
    const salida = [];
    for (const b of lista) {
      const padre = salida.find((p) => toM(p.s) <= toM(b.s) && toM(p.e) >= toM(b.e));
      if (padre) { padre.extra.push(`${b.s}–${b.e} ${b.t}`); continue; }
      const ult = salida[salida.length - 1];
      if (ult && toM(b.s) < toM(ult.e)) {
        // algo corto (una comida, un pendiente) que se cruza con otra actividad: va en su descripción
        if (b.c === "comida" || toM(b.e) - toM(b.s) <= 30) { ult.extra.push(`${b.s}–${b.e} ${b.t}`); continue; }
        b.s = ult.e; if (toM(b.e) <= toM(b.s)) continue;
      }
      salida.push(b);
    }
    salida.forEach((b) => {
        b = { ...b, n: [b.n, ...b.extra].filter(Boolean).join("\n") };
        L.push("BEGIN:VEVENT",
          `UID:${who}-${d.k}-${b.s.replace(":", "")}-${slug(b.t)}@nuestra-semana`,
          `DTSTAMP:${stamp}`,
          `DTSTART;TZID=America/Mexico_City:${fecha(i, b.s)}`,
          `DTEND;TZID=America/Mexico_City:${fecha(i, b.e)}`,
          "RRULE:FREQ=WEEKLY",
          `SUMMARY:${txt(b.t)}`);
        if (b.n) L.push(`DESCRIPTION:${txt(b.n)}`);
        L.push(`CATEGORIES:${txt(b.c)}`);
        if (ALARMA.test(b.t)) L.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${txt(b.t)}`, "TRIGGER:-PT15M", "END:VALARM");
        L.push("END:VEVENT");
      });
  });
  L.push("END:VCALENDAR");
  return L.map(fold).join("\r\n") + "\r\n";
}

export { buildICS };
