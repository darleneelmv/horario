# Nuestra semana

Agenda de Darlene Bubucita y Berny Duducito: horario semanal, checklist diario de cada uno, ingresos y egresos, notas por día, calendario del mes y su horario en el calendario del celular.

## Qué tiene

- **Hoy**: arriba, **Para ti**: una nota linda o una foto que el otro te dejó, y donde tú le dejas algo (se sincroniza entre los dos celulares). Después, qué le toca a cada quien en este momento (en vivo) y el día de hoy para registrar.
- **Agenda**: calendario del mes. Tocar un día abre su checklist, pendientes, dinero y notas, con una sección para cada uno.
- **Semana**: el horario hora por hora, como el de la escuela, con cada clase, salón o maestro. Se puede ver el de Darlene, el de Berny o los dos. Desde aquí se **edita** (horas, actividades, quién lo hace, notas) y los cambios se guardan para los dos.
- **Dinero**: ingresos, egresos y neto del mes, gráfica por día, totales por categoría y por persona.
- **Deudas**: lo que deben pagar y lo que les deben, con fecha límite, responsable, abonos y avisos de vencido o por vencer. Los pagos se pueden anotar solos en Dinero.
- **Guía**: meal prep del domingo y los cambios recomendados.
- **Ajustes**: quién usa el celular, código de pareja, agregar el horario al calendario del celular y respaldos.

## Publicar como Cloudflare Worker (lo que está configurado)

El repo ya trae `wrangler.jsonc` con el KV `agenda` conectado como `AGENDA`.

1. En Cloudflare: **Workers & Pages → Create → Import a repository** → GitHub → `horario`. Deja los comandos que propone (deploy: `npx wrangler deploy`).
2. En el Worker: **Settings → Variables and Secrets → Add** → Type **Secret**, nombre **`APP_PIN`**, valor: su código.
3. Abre tu sitio (algo como `https://horario.<tu-cuenta>.workers.dev`).

Cada cambio que se suba a GitHub se publica solo.

## Publicar en Cloudflare Pages (alternativa)

1. Crea una cuenta gratis en [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Workers & Pages → Create → Pages → Connect to Git** → GitHub → elige el repo `horario`.
3. Configuración de build:
   - Framework preset: **None**
   - Build command: *(vacío)*
   - Build output directory: **`public`**
   Toca **Save and Deploy**.
4. Crea el almacenamiento: **Storage & Databases → KV → Create** con el nombre `agenda`.
5. En tu proyecto de Pages: **Settings → Bindings → Add → KV namespace**:
   - Variable name: **`AGENDA`**
   - KV namespace: `agenda`
6. **Settings → Variables and Secrets → Add**:
   - Type: Secret · Name: **`APP_PIN`** · Value: su código secreto.
7. **Deployments → (último) → Retry deployment** para que tome el KV y el código.
8. Abre tu sitio (algo como `https://horario.pages.dev`).

Cada cambio que se suba a GitHub se publica solo.

## Publicar en Netlify (alternativa)

1. Entra a [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project** → **GitHub** → elige el repo `horario`.
2. Netlify detecta la configuración sola (`netlify.toml`). No hace falta comando de build. Toca **Deploy**.
3. Ve a **Site configuration → Environment variables → Add a variable**:
   - Key: `APP_PIN`
   - Value: un código secreto que solo ustedes sepan (por ejemplo, una frase sin espacios).
4. Ve a **Deploys → Trigger deploy → Deploy site** para que tome el código.
5. Abre tu sitio (algo como `https://nombre.netlify.app`).

## En cada celular

1. Abre el sitio en Safari (iPhone) o Chrome (Android).
2. En **Ajustes**: elige quién usa ese celular y escribe el **código de pareja** (el mismo `APP_PIN`). Toca **Guardar y probar**. Debe decir “Conectado”.
3. **Calendario del celular**: en Ajustes toca **Suscribirme**. El iPhone pregunta si quieres suscribirte: acepta. Tu horario aparece en la app Calendario y se actualiza solo cuando cambien algo en la página.
   - Android: toca **Copiar enlace para Google Calendar** y, en calendar.google.com, “Otros calendarios” → “+” → “Desde URL”.
4. Para tenerla como app: en Safari, **Compartir → Agregar a pantalla de inicio**.

## Cómo se guardan los datos

- Todo se guarda primero en el celular, así que funciona aunque no haya internet.
- Con el código de pareja, se sincroniza con el almacenamiento del servicio (Cloudflare KV o Netlify Blobs, ambos gratis): lo que registra uno lo ve el otro.
- Cada día de cada persona es un registro aparte, así que pueden escribir al mismo tiempo sin pisarse.
- En **Ajustes → Respaldo** pueden descargar una copia de todo cuando quieran.

## Estructura

```
public/                 la página (HTML, CSS, JS, iconos)
  horario-base.js       horario original
  app.js                la app
  ics.js                genera el calendario .ics
worker/index.js         entrada del Cloudflare Worker (usa functions/api)
wrangler.jsonc          configuración del Worker y su KV
functions/api/          servidor en Cloudflare (data.js y calendar.js)
netlify/functions/      servidor en Netlify (data.mjs y calendar.mjs)
shared/                 horario original y generador del calendario, usados por los dos
```

Si cambian el horario original en el código, cambien también `shared/horario-base.mjs` (es el mismo contenido que `public/horario-base.js`). Los cambios hechos desde la página no necesitan esto.
