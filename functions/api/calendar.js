// Cloudflare Pages Function: calendario para suscribirse desde el celular (webcal).
// URL: /api/calendar?who=dar|el&k=CODIGO&modo=importante|todo
import base from "../../shared/horario-base.mjs";
import { buildICS } from "../../shared/ics.mjs";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!env.APP_PIN || url.searchParams.get("k") !== env.APP_PIN) return new Response("No autorizado", { status: 401 });
  const who = url.searchParams.get("who") === "el" ? "el" : "dar";
  const modo = url.searchParams.get("modo") === "todo" ? "todo" : "importante";
  let horario = base;
  try {
    const saved = env.AGENDA && (await env.AGENDA.get("config/horario", { type: "json" }));
    if (saved && Array.isArray(saved.days)) horario = saved;
  } catch {}
  const ics = buildICS(horario, who, modo, who === "el" ? "Berny" : "Darlene");
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `inline; filename="nuestra-semana-${who}.ics"`,
      "cache-control": "no-store",
    },
  });
}
