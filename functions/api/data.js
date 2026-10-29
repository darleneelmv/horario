// Cloudflare Pages Function: guarda y lee los registros de la agenda en Cloudflare KV.
// Necesita: variable secreta APP_PIN y un KV namespace conectado con el nombre AGENDA.
// Los días se guardan agrupados por mes y persona ("m/AAAA-MM/dar") para gastar pocas lecturas.
const DAYKEY = /^(\d{4}-\d{2})-\d{2}\/(dar|el)$/;
const SINGLE = /^(config\/horario|msg\/(dar|el))$/;
const MONTH = /^\d{4}-\d{2}$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export async function onRequest({ request, env }) {
  if (!env.APP_PIN) return json({ error: "Falta configurar APP_PIN en Cloudflare." }, 500);
  if (request.headers.get("x-pin") !== env.APP_PIN) return json({ error: "Código de pareja incorrecto." }, 401);
  const kv = env.AGENDA;
  if (!kv) return json({ error: "Falta conectar el KV con el nombre AGENDA en Cloudflare." }, 500);
  const url = new URL(request.url);

  if (request.method === "GET") {
    if (url.searchParams.has("ping")) return json({ ok: true });
    if (url.searchParams.has("key")) {
      const key = url.searchParams.get("key");
      if (!SINGLE.test(key)) return json({ error: "Clave inválida." }, 400);
      return json({ value: await kv.get(key, { type: "json" }) });
    }
    const ym = url.searchParams.get("prefix") || "";
    if (!MONTH.test(ym)) return json({ error: "Prefijo inválido. Usa AAAA-MM." }, 400);
    const entries = {};
    for (const who of ["dar", "el"]) {
      const doc = (await kv.get(`m/${ym}/${who}`, { type: "json" })) || {};
      for (const [date, value] of Object.entries(doc)) entries[`${date}/${who}`] = value;
    }
    return json({ entries });
  }

  if (request.method === "PUT") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "JSON inválido." }, 400); }
    const { key, value } = body || {};
    if (!value || typeof value !== "object") return json({ error: "Falta el registro." }, 400);
    const size = JSON.stringify(value).length;
    if (SINGLE.test(key || "")) {
      if (size > (key.startsWith("msg/") ? 3_000_000 : 300_000)) return json({ error: "Es demasiado grande. Prueba con otra foto." }, 413);
      await kv.put(key, JSON.stringify(value));
      return json({ ok: true });
    }
    const m = DAYKEY.exec(key || "");
    if (!m) return json({ error: "Clave inválida." }, 400);
    if (size > 300_000) return json({ error: "Registro demasiado grande." }, 413);
    const docKey = `m/${m[1]}/${m[2]}`;
    const doc = (await kv.get(docKey, { type: "json" })) || {};
    doc[key.slice(0, 10)] = value;
    await kv.put(docKey, JSON.stringify(doc));
    return json({ ok: true });
  }

  return json({ error: "Método no permitido." }, 405);
}
