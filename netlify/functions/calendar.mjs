// Calendario para suscribirse desde el celular (webcal). Devuelve el horario semanal de una persona.
// URL: /api/calendar?who=dar|el&k=CODIGO&modo=importante|todo
import { getStore } from "@netlify/blobs";
import base from "./lib/horario-base.mjs";
import { buildICS } from "./lib/ics.mjs";

const readPin = () => {
  try { if (globalThis.Netlify?.env?.get) return Netlify.env.get("APP_PIN"); } catch {}
  return process.env.APP_PIN;
};

export default async (req) => {
  const url = new URL(req.url);
  const pin = readPin();
  if (!pin || url.searchParams.get("k") !== pin) return new Response("No autorizado", { status: 401 });
  const who = url.searchParams.get("who") === "el" ? "el" : "dar";
  const modo = url.searchParams.get("modo") === "todo" ? "todo" : "importante";
  let horario = base;
  try {
    const saved = await getStore({ name: "agenda", consistency: "strong" }).get("config/horario", { type: "json" });
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
};

export const config = { path: "/api/calendar" };
