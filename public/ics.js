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
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H",
    "BEGIN:VTIMEZONE", "TZID:America/Mexico_City", "BEGIN:STANDARD", "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0600", "TZOFFSETTO:-0600", "TZNAME:CST", "END:STANDARD", "END:VTIMEZONE",
  ];
  horario.days.forEach((d, i) => {
    d.blocks
      .filter((b) => b.w === "ambos" || b.w === who)
      .filter((b) => !NUNCA.includes(b.c))
      .filter((b) => modo === "todo" || (IMPORTANTE.includes(b.c) && !/^(Regreso|Camino|Margen)/.test(b.t)))
      .forEach((b) => {
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
