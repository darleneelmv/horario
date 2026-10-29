# Nuestra semana

Agenda de Darlene y él: horario semanal, checklist diario de cada uno, ingresos y egresos, notas por día, calendario del mes y su horario en el calendario del celular.

## Qué tiene

- **Hoy**: arriba, **Para ti**: una nota linda o una foto que el otro te dejó, y donde tú le dejas algo (se sincroniza entre los dos celulares). Después, qué le toca a cada quien en este momento (en vivo) y el día de hoy para registrar.
- **Agenda**: calendario del mes. Tocar un día abre su checklist, pendientes, dinero y notas, con una sección para cada uno.
- **Semana**: el horario hora por hora, como el de la escuela, con cada clase, salón o maestro. Se puede ver el de Darlene, el de él o los dos. Desde aquí se **edita** (horas, actividades, quién lo hace, notas) y los cambios se guardan para los dos.
- **Dinero**: ingresos, egresos y neto del mes, gráfica por día, totales por categoría y por persona.
- **Guía**: meal prep del domingo y los cambios recomendados.
- **Ajustes**: quién usa el celular, código de pareja, agregar el horario al calendario del celular y respaldos.

## Publicar en Netlify (una sola vez)

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
- Con el código de pareja, se sincroniza con Netlify Blobs (almacenamiento incluido en el plan gratis): lo que registra uno lo ve el otro.
- Cada día de cada persona es un registro aparte, así que pueden escribir al mismo tiempo sin pisarse.
- En **Ajustes → Respaldo** pueden descargar una copia de todo cuando quieran.

## Estructura

```
public/                 la página (HTML, CSS, JS, iconos)
  horario-base.js       horario original
  app.js                la app
  ics.js                genera el calendario .ics
netlify/functions/
  data.mjs              guarda y lee registros (/api/data), protegido con APP_PIN
  calendar.mjs          calendario para suscribirse (/api/calendar)
  lib/horario-base.mjs  copia del horario original para el calendario
```

Si cambian el horario original en el código, cambien también `netlify/functions/lib/horario-base.mjs` (es el mismo contenido). Los cambios hechos desde la página no necesitan esto.
