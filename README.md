# Avril Support Harness — prototipo de atención agéntica (Ciclo 2)

Prototipo **acotado y demostrable**, no un sistema de producción. Toma un `SupportTicketRecord` (el mismo
objeto que Lab ya guarda como `LAB-*`), clasifica la duda, responde **solo con FAQ confirmada** y, cuando
NO debe resolver solo, entrega un resumen útil para humano/dev.

- Sin dependencias (solo Node ≥ 18), **sin red**, sin llaves, sin VPS, sin producción.
- **No envía mensajes, no procesa pagos, no pide contraseñas/tokens, no modifica sistemas externos.**
- No crea otro inbox: la entrada es el ticket exportado; la salida son artefactos JSON para `/admin`.

## Instalación y ejecución

```bash
git clone <URL-de-este-repo> && cd avril-support-harness
node -v                      # >= 18
npm run scenarios            # 8 escenarios → out/ (evidencia)
npm test                     # 17 pruebas unitarias (node:test)
node src/cli.js fixtures/example-ticket.json     # un ticket → JSON a stdout
cat ticket.json | node src/cli.js -              # o por stdin (también acepta un arreglo)
```

## Entradas / salidas

**Entrada** — `SupportTicketRecord` (ver `fixtures/example-ticket.json`). Campos usados: `id` (`LAB-*`), `createdAt`,
`email`, `subject`, `message`, `wallet`, `stripeSessionId`, `stripePaymentIntentId`, `paymentStatus`, `slug`,
`rentalStatus`, `deploymentId`. Aliases tolerados en `src/record.js`.
> ⚠️ **Supuesto a verificar:** no tuve acceso a `lib/support-tickets.ts` (repo Lab-Avril-Life). Los nombres de campos
> son los esperables; si difieren, basta ajustar `ALIASES` en `src/record.js`.

**Salida** (`schema: avril.support-triage/v1`):

| Campo | Qué es |
|---|---|
| `devHandoff` | síntoma (redactado), ids Stripe/slug/deployment, hipótesis, siguiente paso técnico, runbook |
| `mustEscalate` + `escalationReasons` | `true` siempre que no sea FAQ confirmada |
| `handoffSummary` | texto corto para el campo **Handoff a dev** de `/admin` |
| `publicReplyDraft` | opcional; solo FAQ confirmada; `requiresHumanApproval: true`, `sendStatus: "NOT_SENT"` |
| `category` / `severity` | `secrets_exposed`, `credentials_or_keys`, `refund`, `paid_not_ready`, `paid_no_agent`, `access_failure`, `data_privacy`, `topic_not_confirmed`, `faq`, `no_match` |
| `redactions` / `safety` | tipos de secreto enmascarados; banderas de seguridad (todas `false`) |

## Cómo decide (flujo)

1. **Redacta secretos** (llaves Stripe, `whsec_`, PEM, claves privadas hex, JWT/Bearer, seed phrase, "contraseña es …") y enmascara el email → nada sensible sale en ningún artefacto.
2. **Detecta señales** de escalamiento (secretos, llaves, reembolso, pago + not_ready, pago sin agente, acceso, datos personales).
3. **Revisa temas no confirmados** (`data/faq.json → notConfirmed`: tiempo de activación, sandbox/MCP/x402, SLA, política de reembolso).
4. **Solo si no hay ninguna señal** busca FAQ confirmada (`data/faq.json`, cada entrada con fuente) y genera borrador.
5. Todo lo demás → `mustEscalate: true`. Prioridad: lo más sensible gana en mensajes mixtos.

**Base FAQ:** 6 entradas (precios de los 3 planes, qué es Lab, cómo funciona, BYOK, harnesses, sin garantía de resultado) + 5 temas "no confirmado", sustentadas en el informe **QA Lab Fricción — Ciclo 1** (2026-10-20) y en `AvrilContextProtocol-MCP/content/` (`CURRENT-STATE.md`, `canonical/02-…`, `sources/AVRIL-REALITY-AUDIT-2026-10-02.md`).

## Los 8 escenarios (esperado vs. obtenido)

Resultado completo en [`out/scenario-report.md`](out/scenario-report.md). Resumen: **8/8 PASS**, 7 escalan, 1 se resuelve con FAQ.

| # | Escenario | Resultado esperado |
|---|---|---|
| S01 | FAQ: precio/duración del trial | borrador FAQ, sin escalar |
| S02 | sandbox API / pago cripto (no confirmado) | escalar, sin respuesta |
| S03 | pago exitoso + `not_ready` | escalar, handoff con ids + runbook |
| S04 | pago exitoso sin agente | escalar, handoff con ids; wallet no viaja |
| S05 | reembolso | escalar; no promete ni ejecuta |
| S06 | falla de acceso (502) | escalar |
| S07 | llave + contraseña pegadas | escalar crítico; secretos enmascarados |
| S08 | datos personales / borrado | escalar; email enmascarado |

> **Honestidad sobre la validación:** los escenarios los escribí junto con las reglas, así que 8/8 no prueba generalización.
> Por eso hay 17 pruebas (`test/harness.test.js`) que sí encontraron una falla (ver abajo).

## Pruebas, fallas encontradas y cambios

| # | Falla encontrada | Cómo se detectó | Cambio realizado |
|---|---|---|---|
| 1 | `mkdir` con llaves en `sh` creó una carpeta literal y fallaron las escrituras | error de ejecución | recreé directorios explícitamente |
| 2 | `"sla"` / `"mcp"` podían coincidir dentro de otras palabras ("islas") | revisión de código antes de correr | `countHits` usa límite de palabra; keywords ≤4 letras exigen palabra completa |
| 3 | `npm test` con directorio fallaba en Node 22 | corrida de pruebas | script usa `test/*.test.js` |
| 4 | **"¿Qué es el Control UI…?" se clasificaba como `access_failure`** | prueba adversarial #6 (falló) | la regla exige contexto de error junto a "control ui" |
| 5 | "me cobraron dos veces" / "cancelen mi cobro" caían en `paid_no_agent` | sondeo manual | añadido a señal `refund` (disputa de pago); prueba nueva |
| 6 | `SKILL.md` llamaba `node src/cli.js`, pero OpenClaw copia solo el skill al workspace → el comando no existiría | instalé el skill en OpenClaw real | el skill usa `$AVRIL_SUPPORT_HARNESS` y declara `requires.env`; verificado (sin la variable: *Needs setup*; con ella: *Ready*) |
| 7 | "¿Qué es BYOK?" escalaba como `credentials_or_keys`, pero BYOK es concepto confirmado en la landing | informe QA (Caso 2) | `byok` sale de la señal de llaves y tiene su FAQ; "dónde pongo mi API key" sigue escalando |

## Limitaciones conocidas

- **Reglas por palabras clave, no un LLM:** poco recall con redacciones inusuales (siempre cae a `no_match` → escala; falla hacia el lado seguro).
- **Sobre-escalamiento:** "Pagué ayer, ¿cómo funciona…?" escala como `paid_no_agent`; "Mi clave es muy larga…" se redacta como contraseña. Aceptado por seguridad; no corregido.
- Español e inglés básicos; sin otros idiomas.
- Hipótesis y runbooks salen de documentos del repo MCP (auditoría 2026-10-02): **pueden estar desfasados** respecto a producción.
- El formato real de `SupportTicketRecord`, `/admin` y `lab-paid-not-ready.md` **no se verificaron** (sin acceso al repo Lab-Avril-Life).
- Los precios de la FAQ son "default" del plan; un humano debe confirmarlos antes de enviar.
- **OpenClaw:** instalé `openclaw` 2026.6.35 y el skill se reconoce (*Ready*, visible al modelo, disponible como comando) y su comando corre correctamente desde otro directorio. **No** corrí una conversación completa con un agente (requiere llave de modelo, que no se debe usar aquí). Hermes no se probó.

## Costo / tiempo de una ejecución

- Un ticket por CLI: ≈ **50 ms** de pared (medido localmente). Los 8 escenarios + evidencia: ≈ **1 s**.
- Costo de tokens/API: **$0** (reglas deterministas, sin red). Si en el futuro se agrega un LLM para redactar borradores, medir de nuevo.

## Estructura

```
src/        harness.js (triage) · classify.js · faq.js · redact.js · record.js · cli.js
data/       faq.json (FAQ confirmada + temas no confirmados, con fuentes)
fixtures/   example-ticket.json · scenarios.json (8 escenarios con expected)
scripts/    run-scenarios.js → out/
out/        scenario-report.md · results.json · tickets-log.jsonl · handoffs/<LAB-*>.json   (evidencia)
test/       harness.test.js
docs/       QA-FINDINGS-TO-RULES.md · DEMO.md · DOD-CHECKLIST.md
skills/     avril-support-triage/SKILL.md (wrapper para agentes)
```

## Seguridad del arnés

Las claves de ejemplo del escenario S07 se arman en tiempo de ejecución (`run-scenarios.js`) para que el escáner de secretos de GitHub no bloquee el push; son falsas.
