# Reporte de escenarios (esperado vs. obtenido)

Ejecución determinista, sin red. Total: **8** escenarios · **8 PASS** · **0 FAIL** · 42.8 ms en total.

| # | Escenario | Esperado | Obtenido | Resultado |
|---|---|---|---|---|
| S01-faq-pricing | FAQ confirmada: precio y duración del trial | faq · escalar=false · none | faq · escalar=false · none | ✅ PASS |
| S02-unconfirmed-topic | Tema NO confirmado: sandbox API / pagos cripto | topic_not_confirmed · escalar=true · low | topic_not_confirmed · escalar=true · low | ✅ PASS |
| S03-paid-not-ready | Pago exitoso, entorno not_ready | paid_not_ready · escalar=true · high | paid_not_ready · escalar=true · high | ✅ PASS |
| S04-paid-no-agent | Pago exitoso, sin agente en 'Mis agentes' | paid_no_agent · escalar=true · high | paid_no_agent · escalar=true · high | ✅ PASS |
| S05-refund | Solicitud de reembolso | refund · escalar=true · high | refund · escalar=true · high | ✅ PASS |
| S06-access-failure | Falla de acceso al Control UI (seat ready) | access_failure · escalar=true · medium | access_failure · escalar=true · medium | ✅ PASS |
| S07-secrets-leak | Comprador pega llave y contraseña en el ticket | secrets_exposed · escalar=true · critical | secrets_exposed · escalar=true · critical | ✅ PASS |
| S08-data-privacy | Solicitud de datos personales / borrado | data_privacy · escalar=true · high | data_privacy · escalar=true · high | ✅ PASS |

## Detalle por escenario

### S01-faq-pricing — FAQ confirmada: precio y duración del trial
_Por qué:_ Cubierto por FAQ confirmada; único caso donde se permite borrador de respuesta.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | faq | faq | ✅ |
| mustEscalate | false | false | ✅ |
| severity | none | none | ✅ |
| publicReplyDraft | true | true | ✅ |
| replyFaqId | faq-pricing-duration | faq-pricing-duration | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** _(n/a: resuelto con FAQ)_

**publicReplyDraft (NO enviado):** Lab tiene tres planes con precio de lista: Day Pass $6 por 48 horas, Trial $15 por 7 días y Monthly $29 por 30 días. El hosting está incluido; el modelo es BYOK (traes tu propia API key).

### S02-unconfirmed-topic — Tema NO confirmado: sandbox API / pagos cripto
_Por qué:_ Las fuentes lo marcan MOCK/NOT SHIPPED/THESIS. Responder sería prometer algo no enviado.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | topic_not_confirmed | topic_not_confirmed | ✅ |
| mustEscalate | true | true | ✅ |
| severity | low | low | ✅ |
| publicReplyDraft | false | false | ✅ |
| handoff incluye "nc-sandbox-api-mcp-skills" | sí | sí | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [LOW] LAB-TEST-0002 · topic_not_confirmed. Síntoma: Integración ¿Puedo pagar con cripto (x402) y tienen una API sandbox para desarrolladores? Siguiente: Humano responde sin prometer. Si se repite, evaluar agregar una entrada FAQ confirmada.

### S03-paid-not-ready — Pago exitoso, entorno not_ready
_Por qué:_ Caso central del runbook not_ready: el handoff debe traer ids Stripe + slug + hipótesis + siguiente paso.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | paid_not_ready | paid_not_ready | ✅ |
| mustEscalate | true | true | ✅ |
| severity | high | high | ✅ |
| publicReplyDraft | false | false | ✅ |
| handoff incluye "cs_test_S03aBcD" | sí | sí | ✅ |
| handoff incluye "pi_test_S03xYz" | sí | sí | ✅ |
| handoff incluye "seat-s03" | sí | sí | ✅ |
| handoff incluye "lab-paid-not-ready.md" | sí | sí | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [HIGH] LAB-TEST-0003 · paid_not_ready. session=cs_test_S03aBcD pi=pi_test_S03xYz slug=seat-s03 rental=not_ready. Síntoma: Pagué y no está listo Pagué el trial hace 45 minutos y mi agente no está listo, sigue en espera. Siguiente: Seguir runbook docs/guides/lab-paid-not-ready.md (repo Lab-Avril-Life).

### S04-paid-no-agent — Pago exitoso, sin agente en 'Mis agentes'
_Por qué:_ Pago sin agente: hipótesis de mapeo owner→agente/wallet. La wallet no debe viajar completa.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | paid_no_agent | paid_no_agent | ✅ |
| mustEscalate | true | true | ✅ |
| severity | high | high | ✅ |
| publicReplyDraft | false | false | ✅ |
| handoff incluye "cs_test_S04aBcD" | sí | sí | ✅ |
| handoff incluye "pi_test_S04xYz" | sí | sí | ✅ |
| no filtra "0xAbC0000000000000000000000000000000000001" | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [HIGH] LAB-TEST-0004 · paid_no_agent. session=cs_test_S04aBcD pi=pi_test_S04xYz. Síntoma: No me aparece nada Me cobraron el trial pero en Mis agentes no me aparece ningún agente. Siguiente: Buscar el rental por stripeSessionId/PaymentIntent y comparar wallet del pago vs. sesión del comprador.

### S05-refund — Solicitud de reembolso
_Por qué:_ Reembolso: decisión humana en Stripe; el arnés no promete ni ejecuta.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | refund | refund | ✅ |
| mustEscalate | true | true | ✅ |
| severity | high | high | ✅ |
| publicReplyDraft | false | false | ✅ |
| handoff incluye "pi_test_S05xYz" | sí | sí | ✅ |
| handoff incluye "no procesa pagos" | sí | sí | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [HIGH] LAB-TEST-0005 · refund. session=cs_test_S05aBcD pi=pi_test_S05xYz slug=seat-s05 rental=ready. Síntoma: Reembolso Quiero un reembolso, ya no quiero el trial. Pagué ayer. Siguiente: Ops verifica el cobro en Stripe con los ids de este handoff (solo lectura).

### S06-access-failure — Falla de acceso al Control UI (seat ready)
_Por qué:_ Falla de acceso: requiere revisar seat/Caddy/health; no se resuelve con FAQ.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | access_failure | access_failure | ✅ |
| mustEscalate | true | true | ✅ |
| severity | medium | medium | ✅ |
| publicReplyDraft | false | false | ✅ |
| handoff incluye "seat-s06" | sí | sí | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [MEDIUM] LAB-TEST-0006 · access_failure. session=cs_test_S06aBcD slug=seat-s06 rental=ready. Síntoma: No abre Mi Control UI da error 502 y no puedo entrar desde ayer. Siguiente: Verificar estado del seat y URL del Control UI (patrón *.avril.life).

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
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [CRITICAL] LAB-TEST-0007 · secrets_exposed (+credentials_or_keys). Síntoma: Ayuda con mi llave Para que lo revises, mi llave es [REDACTED:stripe_secret_key] y mi [REDACTED:password] Ya entra? Siguiente: NO copiar el valor original a otros sistemas; purgarlo del registro del ticket si es posible. ⚠ Secretos enmascarados: stripe_secret_key,password.

### S08-data-privacy — Solicitud de datos personales / borrado
_Por qué:_ No hay política de datos confirmada: humano/legal. El email no viaja completo.

| Verificación | Esperado | Obtenido | |
|---|---|---|---|
| category | data_privacy | data_privacy | ✅ |
| mustEscalate | true | true | ✅ |
| severity | high | high | ✅ |
| publicReplyDraft | false | false | ✅ |
| handoff incluye "LAB-TEST-0008" | sí | sí | ✅ |
| no filtra "elena@example.com" | no | no | ✅ |
| safety (sin envío/pagos/red) | todo false | todo false | ✅ |

**handoffSummary:** [HIGH] LAB-TEST-0008 · data_privacy. Síntoma: Mis datos ¿Qué datos personales guardan de mí? Quiero que borren mis datos. Siguiente: Ops/legal responde. Registrar la solicitud; no borrar ni exportar datos con el arnés.

## Métricas
- Escalados esperados: 7/8 · escalados obtenidos: 7/8
- Errores (esperado ≠ obtenido): 0
- Resueltos por FAQ sin escalar: 1
- Tiempo total: 42.8 ms · Costo de tokens/API: $0 (reglas deterministas)
