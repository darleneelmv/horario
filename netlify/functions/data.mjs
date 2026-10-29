// Guarda y lee los registros de la agenda en Netlify Blobs.
// Cada registro es un día de una persona: clave "AAAA-MM-DD/dar" o "AAAA-MM-DD/el".
// Protegido con el código de pareja: variable de entorno APP_PIN en Netlify.
import { getStore } from "@netlify/blobs";

const KEY = /^(\d{4}-\d{2}-\d{2}\/(dar|el)|config\/horario)$/;
const DAYKEY = /^\d{4}-\d{2}-\d{2}\/(dar|el)$/;
const PREFIX = /^\d{4}(-\d{2}(-\d{2})?)?$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const readPin = () => {
  try { if (globalThis.Netlify?.env?.get) return Netlify.env.get("APP_PIN"); } catch {}
  return process.env.APP_PIN;
};

export default async (req) => {
  const pin = readPin();
  if (!pin) return json({ error: "Falta configurar APP_PIN en Netlify." }, 500);
  if (req.headers.get("x-pin") !== pin) return json({ error: "Código de pareja incorrecto." }, 401);

  const store = getStore({ name: "agenda", consistency: "strong" });
  const url = new URL(req.url);

  if (req.method === "GET") {
    if (url.searchParams.has("ping")) return json({ ok: true });
    if (url.searchParams.has("key")) {
      const key = url.searchParams.get("key");
      if (!KEY.test(key)) return json({ error: "Clave inválida." }, 400);
      return json({ value: await store.get(key, { type: "json" }) });
    }
    const prefix = url.searchParams.get("prefix") || "";
    if (!PREFIX.test(prefix)) return json({ error: "Prefijo inválido. Usa AAAA-MM." }, 400);
    const { blobs } = await store.list({ prefix });
    const entries = await Promise.all(
      blobs.filter((b) => DAYKEY.test(b.key)).map(async (b) => [b.key, await store.get(b.key, { type: "json" })])
    );
    return json({ entries: Object.fromEntries(entries.filter(([, v]) => v)) });
  }

  if (req.method === "PUT") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "JSON inválido." }, 400); }
    const { key, value } = body || {};
    if (!KEY.test(key || "")) return json({ error: "Clave inválida." }, 400);
    if (!value || typeof value !== "object") return json({ error: "Falta el registro." }, 400);
    if (JSON.stringify(value).length > 300_000) return json({ error: "Registro demasiado grande." }, 413);
    await store.setJSON(key, value);
    return json({ ok: true });
  }

  return json({ error: "Método no permitido." }, 405);
};

export const config = { path: "/api/data" };
