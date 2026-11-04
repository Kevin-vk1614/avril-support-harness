# Reporte de escenarios (esperado vs. obtenido)

Ejecución determinista, sin red. Total: **16** casos · **16 PASS** · **0 FAIL** · 61.6 ms.

## Los 8 escenarios

| # | Caso | Esperado | Obtenido | Resultado |
|---|---|---|---|---|
| S01-faq-pricing | FAQ confirmada: precios de los planes | faq · escalar=false · none | faq · escalar=false · none | ✅ PASS |
| S02-unconfirmed-topic | Tema NO confirmado: sandbox API / pagos cripto | topic_not_confirmed · escalar=true · low | topic_not_confirmed · escalar=true · low | ✅ PASS |
| S03-paid-not-ready | Pago exitoso, entorno not_ready (category=not_ready) | paid_not_ready · escalar=true · high | paid_not_ready · escalar=true · high | ✅ PASS |
| S04-paid-no-agent | Pago exitoso, sin agente en 'Mis agentes' (labSlug vacío) | paid_no_agent · escalar=true · high | paid_no_agent · escalar=true · high | ✅ PASS |
| S05-refund | Solicitud de reembolso (category=refund) | refund · escalar=true · high | refund · escalar=true · high | ✅ PASS |
| S06-access-failure | Falla de acceso al Control UI | access_failure · escalar=true · medium | access_failure · escalar=true · medium | ✅ PASS |
| S07-secrets-leak | Comprador pega llave y contraseña en el ticket | secrets_exposed · escalar=true · critical | secrets_exposed · escalar=true · critical | ✅ PASS |
| S08-data-privacy | Datos personales / borrado (con email escrito en el mensaje) | data_privacy · escalar=true · high | data_privacy · escalar=true · high | ✅ PASS |

### S01-faq-pricing — FAQ confirmada: precios de los planes
_Por qué:_ Cubierto por FAQ confirmada; único caso donde se permite borrador de respuesta.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | faq | faq | ✅ |
| mustEscalate | false | false | ✅ |
| severity | none | none | ✅ |
| publicReplyDraft | true | true | ✅ |
| replyFaqId | faq-pricing-duration | faq-pricing-duration | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** _(n/a: resuelto con FAQ)_

**publicReplyDraft (NO enviado):** Lab tiene tres planes con precio de lista: Day Pass $6 por 48 horas, Trial $15 por 7 días y Monthly $29 por 30 días. El hosting está incluido, con créditos iniciales para empezar; traer tu propia API key de modelo (BYOK) es opcional.

### S02-unconfirmed-topic — Tema NO confirmado: sandbox API / pagos cripto
_Por qué:_ Las fuentes lo marcan MOCK/NOT SHIPPED/THESIS. Responder sería prometer algo no enviado.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | topic_not_confirmed | topic_not_confirmed | ✅ |
| mustEscalate | true | true | ✅ |
| severity | low | low | ✅ |
| publicReplyDraft | false | false | ✅ |
| handoff incluye "nc-sandbox-api-mcp-skills" | sí | sí | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [LOW] LAB-20261029-A002 · topic_not_confirmed. Síntoma: ¿Puedo pagar con cripto (x402) y tienen una API sandbox para desarrolladores?  Siguiente: Humano responde sin prometer. Si se repite, evaluar agregar una entrada FAQ confirmada.

### S03-paid-not-ready — Pago exitoso, entorno not_ready (category=not_ready)
_Por qué:_ Caso central del runbook not_ready: handoff con stripeSessionId + labSlug + hipótesis + siguiente paso.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | paid_not_ready | paid_not_ready | ✅ |
| mustEscalate | true | true | ✅ |
| severity | high | high | ✅ |
| publicReplyDraft | false | false | ✅ |
| handoff incluye "cs_test_S03aBcD" | sí | sí | ✅ |
| handoff incluye "seat-s03" | sí | sí | ✅ |
| handoff incluye "lab-paid-not-ready.md" | sí | sí | ✅ |
| handoff incluye "user_selected_not_ready" | sí | sí | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [HIGH] LAB-20261029-A003 · paid_not_ready. session=cs_test_S03aBcD slug=seat-s03 elegida=not_ready. Síntoma: Pagué el trial hace 45 minutos y mi agente no está listo, sigue en espera.  Siguiente: Seguir el runbook docs/guides/lab-paid-not-ready.md (repo Lab-Avril-Life) en orden: dinero → webhook → env → launchers → metadata → logs → contenedor.

### S04-paid-no-agent — Pago exitoso, sin agente en 'Mis agentes' (labSlug vacío)
_Por qué:_ Pago sin agente: hipótesis de mapeo owner→agente; el ticket no trae wallet ni PaymentIntent.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | paid_no_agent | paid_no_agent | ✅ |
| mustEscalate | true | true | ✅ |
| severity | high | high | ✅ |
| publicReplyDraft | false | false | ✅ |
| handoff incluye "cs_test_S04aBcD" | sí | sí | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [HIGH] LAB-20261029-A004 · paid_no_agent. session=cs_test_S04aBcD. Síntoma: Me cobraron el trial pero en Mis agentes no me aparece ningún agente.  Siguiente: Seguir el runbook docs/guides/lab-paid-not-ready.md (repo Lab-Avril-Life): confirmar el pago, el webhook (2xx) y la metadata (deploymentId).

### S05-refund — Solicitud de reembolso (category=refund)
_Por qué:_ Reembolso: decisión humana en Stripe; el arnés no promete ni ejecuta.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | refund | refund | ✅ |
| mustEscalate | true | true | ✅ |
| severity | high | high | ✅ |
| publicReplyDraft | false | false | ✅ |
| handoff incluye "cs_test_S05aBcD" | sí | sí | ✅ |
| handoff incluye "no procesa pagos" | sí | sí | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [HIGH] LAB-20261029-A005 · refund. session=cs_test_S05aBcD slug=seat-s05 elegida=refund. Síntoma: Quiero un reembolso, ya no quiero el trial. Pagué ayer.  Siguiente: Ops verifica el cobro en Stripe con el stripeSessionId de este handoff (solo lectura).

### S06-access-failure — Falla de acceso al Control UI
_Por qué:_ Falla de acceso: requiere revisar seat/Caddy/health; no se resuelve con FAQ.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | access_failure | access_failure | ✅ |
| mustEscalate | true | true | ✅ |
| severity | medium | medium | ✅ |
| publicReplyDraft | false | false | ✅ |
| handoff incluye "seat-s06" | sí | sí | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [MEDIUM] LAB-20261029-A006 · access_failure. session=cs_test_S06aBcD slug=seat-s06. Síntoma: Mi Control UI da error 502 y no puedo entrar desde ayer.  Siguiente: Verificar estado del seat y URL del Control UI (patrón *.avril.life).

### S07-secrets-leak — Comprador pega llave y contraseña en el ticket
_Por qué:_ Secretos: enmascarar en TODA la salida, severidad crítica, pedir rotación (por humano).

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | secrets_exposed | secrets_exposed | ✅ |
| mustEscalate | true | true | ✅ |
| severity | critical | critical | ✅ |
| publicReplyDraft | false | false | ✅ |
| handoff incluye "REDACTED:stripe_secret_key" | sí | sí | ✅ |
| handoff incluye "REDACTED:password" | sí | sí | ✅ |
| handoff incluye "rote" | sí | sí | ✅ |
| no filtra "@@STRIPE_LIVE_KEY@@" | no | no | ✅ |
| no filtra "Hunter2!secreta" | no | no | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [CRITICAL] LAB-20261029-A007 · secrets_exposed (+credentials_or_keys). Síntoma: Para que lo revises, mi llave es [REDACTED:stripe_secret_key] y mi [REDACTED:password] Ya entra?  Siguiente: NO copiar el valor original a otros sistemas; purgarlo del registro del ticket si es posible. ⚠ Secretos enmascarados: stripe_secret_key,password.

### S08-data-privacy — Datos personales / borrado (con email escrito en el mensaje)
_Por qué:_ No hay política de datos confirmada: humano/legal. Ni el email del ticket ni el escrito en el texto viajan completos.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | data_privacy | data_privacy | ✅ |
| mustEscalate | true | true | ✅ |
| severity | high | high | ✅ |
| publicReplyDraft | false | false | ✅ |
| handoff incluye "LAB-20261029-A008" | sí | sí | ✅ |
| handoff incluye "[EMAIL]" | sí | sí | ✅ |
| no filtra "elena@example.com" | no | no | ✅ |
| no filtra "elena.real@correo.com" | no | no | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [HIGH] LAB-20261029-A008 · data_privacy. Síntoma: ¿Qué datos personales guardan de mí? Quiero que borren mis datos, mi correo es [EMAIL]  Siguiente: Ops/legal responde. Registrar la solicitud; no borrar ni exportar datos con el arnés.

## Casos de fallas reales (post-mortems de lab-seat-failures.md)

| # | Caso | Esperado | Obtenido | Resultado |
|---|---|---|---|---|
| K1-https-degraded | Seat listo pero la dirección da error SSL (§7.1/§4) | access_failure · escalar=true · medium | access_failure · escalar=true · medium | ✅ PASS |
| K2-caddy-site-failed | Pagó y falló la configuración del sitio (§7.2) | paid_not_ready · escalar=true · high | paid_not_ready · escalar=true · high | ✅ PASS |
| K3-poisoned-slug | Falla rápida con Permission denied y cada reintento falla (§7.3) | paid_not_ready · escalar=true · high | paid_not_ready · escalar=true · high | ✅ PASS |
| K4-pids-starvation | Panel carga pero el chat se cae con WebSocket 1006 (§7.4) | access_failure · escalar=true · medium | access_failure · escalar=true · medium | ✅ PASS |
| K5-funnel-gap | Pagó, cerró la pestaña y no ve agente (§2) | paid_no_agent · escalar=true · high | paid_no_agent · escalar=true · high | ✅ PASS |
| K6-site-502 | lab.avril.life devuelve 502 (§8) | access_failure · escalar=true · critical | access_failure · escalar=true · critical | ✅ PASS |
| K7-waitlist-after-pay | Pagó y la pantalla de éxito muestra lista de espera (runbook) | paid_no_agent · escalar=true · high | paid_no_agent · escalar=true · high | ✅ PASS |
| K8-launch-failed | 'Launch failed' unos segundos después de pagar (runbook paso 6) | paid_not_ready · escalar=true · high | paid_not_ready · escalar=true · high | ✅ PASS |

### K1-https-degraded — Seat listo pero la dirección da error SSL (§7.1/§4)

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | access_failure | access_failure | ✅ |
| mustEscalate | true | true | ✅ |
| severity | medium | medium | ✅ |
| falla conocida seat-public-https-degraded | detectada | detectada | ✅ |
| borrador de seat-public-https-degraded sin enviar | NOT_SENT + aprobación humana | NOT_SENT + true | ✅ |
| publicReplyDraft (solo FAQ) | null | null | ✅ |
| handoff incluye "seat-public-https-degraded" | sí | sí | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [MEDIUM] LAB-20261102-B001 · access_failure. session=cs_test_K1 slug=seat-k1. Síntoma: Pagué hace 10 minutos, mi agente aparece listo pero al abrir mi dirección me sale error SSL, conexión no es privada.  Posible falla conocida: seat-public-https-degraded. Siguiente: Verificar estado del seat y URL del Control UI (patrón *.avril.life).

**Falla conocida `seat-public-https-degraded`** (§7.1, §4 y §5 (capa TLS))
- Qué ve el cliente: Pagó y el seat figura listo (en versiones anteriores al 2026-11-01 llegaba a desaparecer a los pocos minutos), pero al abrir su dirección <slug>.avril.life el navegador muestra un error SSL/TLS.
- Borrador de acuse (NO enviado): Tu pago quedó registrado y, por lo que vemos, tu agente está funcionando; lo que tarda es activar la dirección pública segura. Se reintenta automáticamente cada pocos minutos. No necesitas pagar de nuevo. Te avisamos en cuanto abra, o si vemos que hace falta intervenir.
- Cuándo escalar: A dev si pasó más de ~5 min (un ciclo de reconcile) y sigue sin abrir, si el incidente NO es PUBLIC_PROBE_DEGRADED/CADDY_TLS_SYNC_FAILED, o si hay un seat 'failed' donde antes estaba 'ready'.

### K2-caddy-site-failed — Pagó y falló la configuración del sitio (§7.2)

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | paid_not_ready | paid_not_ready | ✅ |
| mustEscalate | true | true | ✅ |
| severity | high | high | ✅ |
| falla conocida caddy-site-failed | detectada | detectada | ✅ |
| borrador de caddy-site-failed sin enviar | NOT_SENT + aprobación humana | NOT_SENT + true | ✅ |
| publicReplyDraft (solo FAQ) | null | null | ✅ |
| handoff incluye "caddy-site-failed" | sí | sí | ✅ |
| handoff incluye "no pagues de nuevo" | sí | sí | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [HIGH] LAB-20261102-B002 · paid_not_ready (+access_failure). session=cs_test_K2 elegida=not_ready. Síntoma: Pagué el day pass y me salió: Caddy agent site could not be configured for this seat. ¿Qué hago?  Posible falla conocida: caddy-site-failed. Siguiente: Seguir el runbook docs/guides/lab-paid-not-ready.md (repo Lab-Avril-Life) en orden: dinero → webhook → env → launchers → metadata → logs → contenedor.

**Falla conocida `caddy-site-failed`** (§7.2 y regla 2 (validate no es cobertura))
- Qué ve el cliente: Pagó; el seat falla ~1 min después de que el contenedor está sano, con un mensaje de que no se pudo configurar el sitio del agente.
- Borrador de acuse (NO enviado): Hubo una falla de configuración de nuestro lado al preparar tu sitio; no es algo que hayas hecho tú. Tu pago quedó registrado. Por favor no pagues de nuevo: lo estamos revisando y te escribimos con el siguiente paso.
- Cuándo escalar: A dev de inmediato: un Caddyfile roto impide que CUALQUIER seat obtenga sitio. Si hay 2+ tickets iguales, o dominios propios (apex/www) muestran errores TLS, tratarlo como incidente general.

### K3-poisoned-slug — Falla rápida con Permission denied y cada reintento falla (§7.3)

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | paid_not_ready | paid_not_ready | ✅ |
| mustEscalate | true | true | ✅ |
| severity | high | high | ✅ |
| falla conocida poisoned-slug | detectada | detectada | ✅ |
| borrador de poisoned-slug sin enviar | NOT_SENT + aprobación humana | NOT_SENT + true | ✅ |
| publicReplyDraft (solo FAQ) | null | null | ✅ |
| handoff incluye "poisoned-slug" | sí | sí | ✅ |
| handoff incluye "/tmp/oc-" | sí | sí | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [HIGH] LAB-20261102-B003 · paid_not_ready (+access_failure). session=cs_test_K3 elegida=not_ready. Síntoma: Intenté rentar y falló a los 15 segundos con Permission denied; lo volví a intentar y falla igual.  Posible falla conocida: poisoned-slug. Siguiente: Seguir el runbook docs/guides/lab-paid-not-ready.md (repo Lab-Avril-Life) en orden: dinero → webhook → env → launchers → metadata → logs → contenedor.

**Falla conocida `poisoned-slug`** (§7.3 (slug envenenado))
- Qué ve el cliente: El intento falla en ~15 s (demasiado rápido para un aprovisionamiento real) con un error de permisos ('Permission denied') sobre una ruta temporal; al reintentar con el mismo nombre falla igual.
- Borrador de acuse (NO enviado): Encontramos un problema de nuestro lado: quedaron restos de un intento anterior que bloquean ese nombre. Los limpiamos nosotros. Por favor no intentes pagar de nuevo hasta que te confirmemos que ya está liberado.
- Cuándo escalar: A dev: hay que limpiar el directorio del slug en el worker; es permanente hasta que se haga y no se arregla esperando ni reintentando.

### K4-pids-starvation — Panel carga pero el chat se cae con WebSocket 1006 (§7.4)

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | access_failure | access_failure | ✅ |
| mustEscalate | true | true | ✅ |
| severity | medium | medium | ✅ |
| falla conocida pids-starvation-chat-drops | detectada | detectada | ✅ |
| borrador de pids-starvation-chat-drops sin enviar | NOT_SENT + aprobación humana | NOT_SENT + true | ✅ |
| publicReplyDraft (solo FAQ) | null | null | ✅ |
| handoff incluye "pids" | sí | sí | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [MEDIUM] LAB-20261102-B004 · access_failure. session=cs_test_K4 slug=seat-k4. Síntoma: Mi panel carga pero el chat se cae con WebSocket 1006 cada vez que escribo.  Posible falla conocida: pids-starvation-chat-drops. Siguiente: Verificar estado del seat y URL del Control UI (patrón *.avril.life).

**Falla conocida `pids-starvation-chat-drops`** (§7.4 (agotamiento de pids))
- Qué ve el cliente: El Control UI abre, pero el chat se desconecta ('WebSocket 1006') o no responde; por dentro el contenedor figura unhealthy aunque el gateway responde.
- Borrador de acuse (NO enviado): Tu panel abre pero el chat se corta: es un problema de nuestro lado, no de tu configuración. Lo estamos revisando en el servidor y te avisamos. No necesitas cambiar nada de tu parte.
- Cuándo escalar: A dev si ocurre después del arreglo del 2026-11-01 (sería una regresión) o si varios seats tienen el mismo síntoma. Revisar pids antes de tocar memoria.

### K5-funnel-gap — Pagó, cerró la pestaña y no ve agente (§2)

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | paid_no_agent | paid_no_agent | ✅ |
| mustEscalate | true | true | ✅ |
| severity | high | high | ✅ |
| falla conocida funnel-gap-closed-tab | detectada | detectada | ✅ |
| borrador de funnel-gap-closed-tab sin enviar | NOT_SENT + aprobación humana | NOT_SENT + true | ✅ |
| publicReplyDraft (solo FAQ) | null | null | ✅ |
| handoff incluye "incidents.jsonl" | sí | sí | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [HIGH] LAB-20261102-B005 · paid_no_agent (+access_failure). session=cs_test_K5. Síntoma: Pagué y cerré la pestaña antes de que terminara; ahora no me aparece ningún agente.  Posible falla conocida: funnel-gap-closed-tab. Siguiente: Seguir el runbook docs/guides/lab-paid-not-ready.md (repo Lab-Avril-Life): confirmar el pago, el webhook (2xx) y la metadata (deploymentId).

**Falla conocida `funnel-gap-closed-tab`** (§2 (el embudo no es un registro de fallos) y evidencia faltante de §7.1)
- Qué ve el cliente: Pagó y cerró la página antes de que terminara; después no ve ningún agente ni mensaje de error.
- Borrador de acuse (NO enviado): Tu pago quedó registrado. Vamos a revisar qué pasó con tu agente en nuestro registro de incidentes y te escribimos con el estado. Por favor no pagues de nuevo.
- Cuándo escalar: A dev si Incidentes muestra un fallo real, o si no hay ningún registro del seat. Un fallo con la pestaña cerrada no aparece en el embudo.

### K6-site-502 — lab.avril.life devuelve 502 (§8)

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | access_failure | access_failure | ✅ |
| mustEscalate | true | true | ✅ |
| severity | critical | critical | ✅ |
| falla conocida lab-site-502-deploy | detectada | detectada | ✅ |
| borrador de lab-site-502-deploy sin enviar | NOT_SENT + aprobación humana | NOT_SENT + true | ✅ |
| publicReplyDraft (solo FAQ) | null | null | ✅ |
| handoff incluye "lab-site-502-deploy" | sí | sí | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [CRITICAL] LAB-20261102-B006 · access_failure. Síntoma: lab.avril.life me da 502 Bad Gateway, no carga el sitio.  Posible falla conocida: lab-site-502-deploy. Siguiente: Verificar estado del seat y URL del Control UI (patrón *.avril.life).

**Falla conocida `lab-site-502-deploy`** (§8 (deploy))
- Qué ve el cliente: El sitio lab.avril.life devuelve 502 o no carga, para todos los compradores.
- Borrador de acuse (NO enviado): Estamos con una interrupción del sitio y el equipo ya la está atendiendo. Gracias por avisar.
- Cuándo escalar: A dev de inmediato: afecta a todos los compradores. Si fue por un deploy, el script hace rollback automático; si persiste, no hacer 'pm2 restart' a ciegas.

### K7-waitlist-after-pay — Pagó y la pantalla de éxito muestra lista de espera (runbook)

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | paid_no_agent | paid_no_agent | ✅ |
| mustEscalate | true | true | ✅ |
| severity | high | high | ✅ |
| falla conocida paid-waitlist-no-capacity | detectada | detectada | ✅ |
| borrador de paid-waitlist-no-capacity sin enviar | NOT_SENT + aprobación humana | NOT_SENT + true | ✅ |
| publicReplyDraft (solo FAQ) | null | null | ✅ |
| handoff incluye "paid-waitlist-no-capacity" | sí | sí | ✅ |
| handoff incluye "No abrir un segundo Checkout" | sí | sí | ✅ |
| handoff incluye "No vuelvas a pagar" | sí | sí | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [HIGH] LAB-20261102-B007 · paid_no_agent (+access_failure,topic_not_confirmed). session=cs_test_K7. Síntoma: Pagué y en la pantalla de éxito me sale lista de espera, no me dan mi agente.  Posible falla conocida: paid-waitlist-no-capacity. Siguiente: Seguir el runbook docs/guides/lab-paid-not-ready.md (repo Lab-Avril-Life): confirmar el pago, el webhook (2xx) y la metadata (deploymentId).

**Falla conocida `paid-waitlist-no-capacity`** (runbook paid-not-ready: regla, síntomas y pasos 4–5)
- Qué ve el cliente: Pagó y la pantalla de éxito (/renta/exito) se queda en instalación, falla o lista de espera; 'Mis agentes' aparece vacío o en estado unknown/failed.
- Borrador de acuse (NO enviado): Tu pago está registrado. No vuelvas a pagar. Estamos reparando el laboratorio; avísanos con el session_id de Stripe si tarda más de unos minutos.
- Cuándo escalar: A ops/dev ahora: sin capacidad hay que liberar un seat o esperar capacidad; nunca volver a cobrar.

### K8-launch-failed — 'Launch failed' unos segundos después de pagar (runbook paso 6)

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | paid_not_ready | paid_not_ready | ✅ |
| mustEscalate | true | true | ✅ |
| severity | high | high | ✅ |
| falla conocida launch-failed-after-pay | detectada | detectada | ✅ |
| borrador de launch-failed-after-pay sin enviar | NOT_SENT + aprobación humana | NOT_SENT + true | ✅ |
| publicReplyDraft (solo FAQ) | null | null | ✅ |
| handoff incluye "launch-failed-after-pay" | sí | sí | ✅ |
| handoff incluye "No vuelvas a pagar" | sí | sí | ✅ |
| no filtra email completo | no | no | ✅ |
| no filtra clientIp completo | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [HIGH] LAB-20261102-B008 · paid_not_ready (+access_failure). session=cs_test_K8 elegida=not_ready. Síntoma: Me salió Launch failed unos 15 segundos después de pagar.  Posible falla conocida: launch-failed-after-pay. Siguiente: Seguir el runbook docs/guides/lab-paid-not-ready.md (repo Lab-Avril-Life) en orden: dinero → webhook → env → launchers → metadata → logs → contenedor.

**Falla conocida `launch-failed-after-pay`** (runbook paid-not-ready: paso 6)
- Qué ve el cliente: Pagó y unos 15 s después ve 'Launch failed', aunque el contenedor llegó a levantarse.
- Borrador de acuse (NO enviado): Tu pago está registrado. No vuelvas a pagar. Estamos reparando el laboratorio; avísanos con el session_id de Stripe si tarda más de unos minutos.
- Cuándo escalar: A dev: revisar el log de errores del launcher con el deployment id. No relanzar hasta confirmar que no existe un seat duplicado.

## Métricas
- Escenarios principales: escalados esperados 7/8 · obtenidos 7/8 · resueltos por FAQ: 1
- Casos de fallas reales: 8/8 detectados y escalados
- Errores (esperado ≠ obtenido): 0
- Tiempo total: 61.6 ms · Costo de tokens/API: $0 (reglas deterministas)
