// Cloudflare Worker: sirve la página (carpeta public) y las rutas /api/data y /api/calendar.
import { onRequest as data } from "../functions/api/data.js";
import { onRequestGet as calendar } from "../functions/api/calendar.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/data") return data({ request, env });
    if (pathname === "/api/calendar") return calendar({ request, env });
    return env.ASSETS.fetch(request);
  },
};
