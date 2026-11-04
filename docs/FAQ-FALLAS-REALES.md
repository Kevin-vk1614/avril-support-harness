# FAQ de fallas reales de seats (post-mortems y runbook)

Fuentes: `Lab-Avril-Life/docs/guides/lab-seat-failures.md` (post-mortems, actualizado 2026-11-01) y `lab-paid-not-ready.md` (runbook, 2026-10-16). Generado con `node scripts/gen-failure-doc.js` desde `data/failure-cases.json`.

**Reglas:** estos casos **siempre escalan a un humano**. La respuesta es un **borrador de acuse** que ops aprueba y envía; el arnés nunca envía nada. No incluye nombres de servidores, IPs, rutas de llaves ni tokens (el repo es público).

| # | Caso | Post-mortem | Severidad |
|---|---|---|---|
| 1 | Mi agente está listo, pero mi dirección no abre (error SSL/TLS) | §7.1, §4 y §5 (capa TLS) | medium |
| 2 | Pagué y falló al configurar el sitio de mi agente | §7.2 y regla 2 (validate no es cobertura) | high |
| 3 | Mi compra falla enseguida y cada reintento falla igual | §7.3 (slug envenenado) | high |
| 4 | El panel carga, pero el chat se cae (WebSocket 1006) | §7.4 (agotamiento de pids) | medium |
| 5 | Pagué, cerré la pestaña y no me aparece nada | §2 (el embudo no es un registro de fallos) y evidencia faltante de §7.1 | high |
| 6 | lab.avril.life no carga o devuelve 502 | §8 (deploy) | critical |
| 7 | Pagué y me aparece lista de espera / sin capacidad | runbook paid-not-ready: regla, síntomas y pasos 4–5 | high |
| 8 | Me salió 'Launch failed' unos segundos después de pagar | runbook paid-not-ready: paso 6 | high |

## 1. Mi agente está listo, pero mi dirección no abre (error SSL/TLS)

- **Qué ve el cliente:** Pagó y el seat figura listo (en versiones anteriores al 2026-11-01 llegaba a desaparecer a los pocos minutos), pero al abrir su dirección <slug>.avril.life el navegador muestra un error SSL/TLS.
- **Qué se responde (borrador, requiere aprobación):** Tu pago quedó registrado y, por lo que vemos, tu agente está funcionando; lo que tarda es activar la dirección pública segura. Se reintenta automáticamente cada pocos minutos. No necesitas pagar de nuevo. Te avisamos en cuanto abra, o si vemos que hace falta intervenir.
- **Antes de enviar:** Verificar en Admin → Incidentes que el seat esté 'ready' con PUBLIC_PROBE_DEGRADED o CADDY_TLS_SYNC_FAILED.
- **Cuándo escalar a dev:** A dev si pasó más de ~5 min (un ciclo de reconcile) y sigue sin abrir, si el incidente NO es PUBLIC_PROBE_DEGRADED/CADDY_TLS_SYNC_FAILED, o si hay un seat 'failed' donde antes estaba 'ready'.
- **Códigos de incidente:** PUBLIC_PROBE_DEGRADED, CADDY_TLS_SYNC_FAILED
- **Regla clave:** La sonda pública observa, nunca bloquea: no se destruye un seat sano por un problema del borde HTTPS.
- **Diagnóstico interno:**
  - 'tlsv1 alert internal error' = Caddy sin bloque para ese hostname; el seat está bien.
  - Esperar el reconcile (≤5 min) o re-ejecutarlo; no re-provisionar ni pedir pago otra vez.
  - No subir el timeout de la sonda pública: observa, no bloquea.

## 2. Pagué y falló al configurar el sitio de mi agente

- **Qué ve el cliente:** Pagó; el seat falla ~1 min después de que el contenedor está sano, con un mensaje de que no se pudo configurar el sitio del agente.
- **Qué se responde (borrador, requiere aprobación):** Hubo una falla de configuración de nuestro lado al preparar tu sitio; no es algo que hayas hecho tú. Tu pago quedó registrado. Por favor no pagues de nuevo: lo estamos revisando y te escribimos con el siguiente paso.
- **Antes de enviar:** Confirmar el pago en Stripe con el stripeSessionId del ticket.
- **Cuándo escalar a dev:** A dev de inmediato: un Caddyfile roto impide que CUALQUIER seat obtenga sitio. Si hay 2+ tickets iguales, o dominios propios (apex/www) muestran errores TLS, tratarlo como incidente general.
- **Códigos de incidente:** CADDY_SITE_FAILED
- **Regla clave:** Todo cambio al Caddyfile (manual o por script) se valida con caddy validate Y con el inventario de hosts antes de dar el recovery por bueno.
- **Diagnóstico interno:**
  - Falla en la capa caddy después de healthcheck OK (~54 s): los contenedores están bien, falla el borde.
  - Caddy sigue sirviendo la última config válida en memoria; un archivo roto en disco no se nota hasta el siguiente reload (la siguiente compra).
  - Validar con 'caddy validate' el archivo que el launcher realmente escribió Y con el script de inventario de hosts: validate no garantiza que los sitios existan.
  - Al restaurar un Caddyfile.bak, comprobar que no falten los bloques de los dominios apex.

## 3. Mi compra falla enseguida y cada reintento falla igual

- **Qué ve el cliente:** El intento falla en ~15 s (demasiado rápido para un aprovisionamiento real) con un error de permisos ('Permission denied') sobre una ruta temporal; al reintentar con el mismo nombre falla igual.
- **Qué se responde (borrador, requiere aprobación):** Encontramos un problema de nuestro lado: quedaron restos de un intento anterior que bloquean ese nombre. Los limpiamos nosotros. Por favor no intentes pagar de nuevo hasta que te confirmemos que ya está liberado.
- **Antes de enviar:** Confirmar el pago en Stripe con el stripeSessionId del ticket.
- **Cuándo escalar a dev:** A dev: hay que limpiar el directorio del slug en el worker; es permanente hasta que se haga y no se arregla esperando ni reintentando.
- **Códigos de incidente:** PROVISION_THREW
- **Regla clave:** Falla <~20 s con ruta /tmp/oc-* = restos del intento anterior, no un problema de capacidad.
- **Diagnóstico interno:**
  - Una falla de menos de ~20 s que nombra una ruta /tmp/oc-* son restos con dueño root: no es capacidad, TLS ni RAM.
  - No comprar un VPS ni bajar mem_limit.
  - Confirmar el slug envenenado listando el directorio de plugins del slug en el worker (aparece root:root).
  - Limpiar con sudo rm -rf del directorio del slug (nunca rm como usuario SSH) y luego volver a rentar.

## 4. El panel carga, pero el chat se cae (WebSocket 1006)

- **Qué ve el cliente:** El Control UI abre, pero el chat se desconecta ('WebSocket 1006') o no responde; por dentro el contenedor figura unhealthy aunque el gateway responde.
- **Qué se responde (borrador, requiere aprobación):** Tu panel abre pero el chat se corta: es un problema de nuestro lado, no de tu configuración. Lo estamos revisando en el servidor y te avisamos. No necesitas cambiar nada de tu parte.
- **Antes de enviar:** Revisar pids.current / pids.max del contenedor del seat.
- **Cuándo escalar a dev:** A dev si ocurre después del arreglo del 2026-11-01 (sería una regresión) o si varios seats tienen el mismo síntoma. Revisar pids antes de tocar memoria.
- **Códigos de incidente:** (ninguno)
- **Regla clave:** Un contenedor unhealthy con healthz externo funcionando es falta de pids, no una falla del gateway.
- **Diagnóstico interno:**
  - unhealthy con healthz funcionando desde fuera = agotamiento de pids/threads, no falla del gateway.
  - Revisar pids.current / pids.max y pids.events.max del contenedor.
  - No subir mem_limit: la fuga fue de procesos, no de bytes, y rompe el candado de capacidad (§3).
  - Causa del caso original: startDeviceAutoApprove sin guardia inFlight + timeout remoto de 120 s (corregido con guardia, intervalo de 20 s y timeout de 15 s).

## 5. Pagué, cerré la pestaña y no me aparece nada

- **Qué ve el cliente:** Pagó y cerró la página antes de que terminara; después no ve ningún agente ni mensaje de error.
- **Qué se responde (borrador, requiere aprobación):** Tu pago quedó registrado. Vamos a revisar qué pasó con tu agente en nuestro registro de incidentes y te escribimos con el estado. Por favor no pagues de nuevo.
- **Antes de enviar:** Confirmar el pago en Stripe con el stripeSessionId del ticket.
- **Cuándo escalar a dev:** A dev si Incidentes muestra un fallo real, o si no hay ningún registro del seat. Un fallo con la pestaña cerrada no aparece en el embudo.
- **Códigos de incidente:** (ninguno)
- **Regla clave:** El embudo no es un registro de fallos: se consulta Incidentes.
- **Diagnóstico interno:**
  - provision_fail se escribe de forma perezosa cuando /api/rentals sondea con la pestaña abierta; si se cierra, el embudo (pay-ready.jsonl) se queda en payment_verified.
  - Para fallos, confiar en incidents.jsonl (Admin → Incidentes), no en el embudo.
  - Cada incidente trae logTail inline (últimas 40 líneas).

## 6. lab.avril.life no carga o devuelve 502

- **Qué ve el cliente:** El sitio lab.avril.life devuelve 502 o no carga, para todos los compradores.
- **Qué se responde (borrador, requiere aprobación):** Estamos con una interrupción del sitio y el equipo ya la está atendiendo. Gracias por avisar.
- **Antes de enviar:** Verificar el estado HTTP público de lab.avril.life.
- **Cuándo escalar a dev:** A dev de inmediato: afecta a todos los compradores. Si fue por un deploy, el script hace rollback automático; si persiste, no hacer 'pm2 restart' a ciegas.
- **Códigos de incidente:** (ninguno)
- **Regla clave:** Solo el estado HTTP público indica salud; 'online' no lo es.
- **Diagnóstico interno:**
  - 'online' en pm2 no es salud: un build roto corre pero sirve 502.
  - El deploy actual restaura .next.prev y reinicia pm2 ante cualquier salida distinta de 0 (verificado el 2026-11-01).
  - Verificar con el estado HTTP público, no con pm2 status.

## 7. Pagué y me aparece lista de espera / sin capacidad

- **Qué ve el cliente:** Pagó y la pantalla de éxito (/renta/exito) se queda en instalación, falla o lista de espera; 'Mis agentes' aparece vacío o en estado unknown/failed.
- **Qué se responde (borrador, requiere aprobación):** Tu pago está registrado. No vuelvas a pagar. Estamos reparando el laboratorio; avísanos con el session_id de Stripe si tarda más de unos minutos.
- **Antes de enviar:** Confirmar en Stripe que la sesión (cs_…) esté pagada.
- **Cuándo escalar a dev:** A ops/dev ahora: sin capacidad hay que liberar un seat o esperar capacidad; nunca volver a cobrar.
- **Códigos de incidente:** NO_CAPACITY
- **Regla clave:** Nunca pedir al comprador que pague otra vez por el mismo session_id: reparar o lista de espera.
- **Diagnóstico interno:**
  - Consultar la capacidad de los launchers (/api/capacity): 401 = token distinto entre Lab y los launchers; available: 0 = lista de espera.
  - launchStatus=no_capacity en la metadata de la sesión: esperar capacidad; /api/rentals puede reintentar la reparación.
  - No abrir un segundo Checkout para la misma sesión: reparar o dejar en lista de espera.

## 8. Me salió 'Launch failed' unos segundos después de pagar

- **Qué ve el cliente:** Pagó y unos 15 s después ve 'Launch failed', aunque el contenedor llegó a levantarse.
- **Qué se responde (borrador, requiere aprobación):** Tu pago está registrado. No vuelvas a pagar. Estamos reparando el laboratorio; avísanos con el session_id de Stripe si tarda más de unos minutos.
- **Antes de enviar:** Confirmar en Stripe que la sesión (cs_…) esté pagada.
- **Cuándo escalar a dev:** A dev: revisar el log de errores del launcher con el deployment id. No relanzar hasta confirmar que no existe un seat duplicado.
- **Códigos de incidente:** (ninguno)
- **Regla clave:** Un fallo de lanzamiento tras el pago se repara con el mismo pago; no se relanza a ciegas.
- **Diagnóstico interno:**
  - Causas comunes (runbook paso 6): script de dedupe del Caddyfile ausente (redeploy de los launchers); 'Caddy/TLS setup failed' (ya corregido: el seat continúa y Caddy se reconcilia al arrancar el launcher); 'no SSH key worked' (revisar la llave SSH configurada para el worker).
  - No tratar success:false durante 'provisioning' como seat faltante ni volver a llamar launchCompany: provocó un doble launch y un falso error de SSH.
  - Si el contenedor murió pero la metadata tiene id: destruir y relanzar UNA sola vez de forma controlada (mismo pago).
