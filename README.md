# Avril Support Harness — prototipo de atención agéntica (Ciclo 2)

Prototipo **acotado y demostrable**, no un sistema de producción. Toma un `SupportTicketRecord` (el mismo
objeto que Lab ya guarda como `LAB-*`), clasifica la duda, responde **solo con FAQ confirmada** y, cuando
NO debe resolver solo, entrega un resumen útil para humano/dev.

- Sin dependencias (solo Node ≥ 18), **sin red**, sin llaves, sin VPS, sin producción.
- **No envía mensajes, no procesa pagos, no pide contraseñas/tokens, no modifica sistemas externos.**
- No crea otro inbox: la entrada es el ticket exportado; la salida son artefactos JSON para `/admin`.

## Instalación y ejecución

```bash
git clone https://github.com/Kevin-vk1614/avril-support-harness.git && cd avril-support-harness
node -v                      # >= 18
npm run scenarios            # 8 escenarios → out/ (evidencia)
npm test                     # 49 pruebas unitarias (node:test)
node src/cli.js fixtures/example-ticket.json     # un ticket → JSON a stdout
cat ticket.json | node src/cli.js -              # o por stdin (también acepta un arreglo)
```

## Entradas / salidas

**Entrada** — `SupportTicketRecord`, **verificado contra el tipo real** de `Avril-Systems/Lab-Avril-Life/lib/support-tickets.ts`
(archivo compartido por Kevin; el repo Lab es de solo lectura y no se modificó). Ver `fixtures/example-ticket.json`.

```ts
type SupportTicketRecord = {
  scope: 'avril.lab.support_ticket'; ticketId: string /* LAB-YYYYMMDD-XXXX */; createdAt: string; email: string
  category: 'not_ready' | 'refund' | 'other'; message: string
  stripeSessionId: string | null; labSlug: string | null; locale: 'en' | 'es'; clientIp: string
}
```

### Tabla: campo supuesto → campo real → diferencia

| Campo supuesto (versión 1 del arnés) | Campo real | Diferencia / qué cambió |
|---|---|---|
| `id` | `ticketId` | Distinto nombre. Formato real `LAB-YYYYMMDD-XXXX` (4 hex mayúsculas). `id` sigue aceptándose como alias con aviso |
| `createdAt` | `createdAt` | Igual |
| `email` | `email` | Igual. Nunca sale completo (se enmascara) |
| `subject` | — | **No existe.** Solo hay `message` |
| `message` | `message` | Igual. Ahora también se enmascaran emails/teléfonos escritos dentro del texto |
| `status`, `source` | — | **No existen** en el tipo (la cola `/admin` puede tener más estado; no está en el registro) |
| `category` (no estaba) | `category` `not_ready \| refund \| other` | **Nuevo y valioso:** la elige el comprador. `not_ready` y `refund` escalan siempre (`user_selected_*`) |
| `slug` | `labSlug` | Distinto nombre; puede ser `null` (seat no creado: pista para el dev) |
| `stripeSessionId` | `stripeSessionId` | Igual, pero `string \| null` |
| `stripePaymentIntentId`, `paymentStatus` | — | **No existen.** El PaymentIntent se obtiene desde la sesión en Stripe; "pagó" se infiere del texto o de `category=not_ready` |
| `rentalStatus`, `deploymentId`, `controlUiUrl` | — | **No existen.** El estado del seat se consulta aparte (`/api/rentals?session_id=…`) |
| `wallet` | — | **No existe** en el ticket |
| (no estaba) | `scope` | Constante `avril.lab.support_ticket`; se valida |
| (no estaba) | `locale` `en \| es` | Si es `en`, el borrador FAQ (en español) marca `needsTranslation: true` |
| (no estaba) | `clientIp` | **Dato personal: nunca sale en ningún artefacto** (hay verificación en cada escenario) |

El arnés avisa (`warnings`) si el ticket trae campos fuera del contrato, `category` inválida, `ticketId` mal formado o `scope` distinto.

### Fixture de ticket

- `fixtures/support-tickets.dev.jsonl` — **los 2 fixtures de desarrollo del propio repo Lab** (`LAB-20261029-DEV1/DEV2`, datos de ejemplo, no son tickets de compradores). Es la muestra con el formato exacto de `data/support-tickets.jsonl`.
- `fixtures/support-tickets.sample.jsonl` — sintético, con la forma del tipo real.
- Para usar un ticket **real anonimizado**: el archivo `data/support-tickets.jsonl` no está en el repo Lab (lo escribe el servidor al crear
  tickets, en `SUPPORT_TICKETS_PATH` o `data/` del proceso). Quien tenga acceso al servidor toma 1–2 líneas y corre:
  ```bash
  node scripts/anonymize-jsonl.js real.jsonl fixtures/support-tickets.real-anon.jsonl
  ```
  Reemplaza email, `clientIp`, `stripeSessionId` y `labSlug` por etiquetas consistentes y limpia secretos/emails/teléfonos del texto.
  **Revisa a mano `message` antes de subir a Git** y no subas nunca el archivo original.

**Salida** (`schema: avril.support-triage/v1`):

| Campo | Qué es |
|---|---|
| `followUpProposal` | propuesta de fila de seguimiento para Lab: `devHandoff` (texto), `customerUpdate` (borrador), `source: harness`. Nunca se escribe en Lab |
| `devHandoff` | síntoma (redactado), `stripeSessionId`/`labSlug`, qué falta para actuar (`missingForTriage`), hipótesis, siguiente paso técnico, runbook |
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

Además, **8 casos de fallas reales** (`fixtures/known-failures.json`): 6 de los post-mortems de `lab-seat-failures.md` y 2 del runbook `lab-paid-not-ready.md`. Total: 16/16 casos PASS.

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
> Por eso hay 49 pruebas (`test/harness.test.js`) que sí encontraron una falla (ver abajo).

## Integración con Lab (según `lab-support-ops.md`)

Flujo real: el comprador envía el formulario **Soporte** → ticket en `data/support-tickets.jsonl` → el fundador trabaja la cola en `/admin → Soporte / reportes`.
El arnés **no reemplaza la cola**: produce lo que iría en la misma fila de seguimiento (`data/support-ticket-follow-up.jsonl`, "la última línea por `ticketId` gana"):

| Campo de Lab | Qué genera el arnés | Notas |
|---|---|---|
| `devHandoff` | `followUpProposal.devHandoff` (texto: síntoma, ids, hipótesis, siguiente paso, **No hacer**, runbook) | para el campo "Handoff a dev" de `/admin` |
| `customerUpdate` | `followUpProposal.customerUpdate` | borrador para correo **aprobado por un humano**. En `paid_not_ready`/`paid_no_agent` es el **mensaje oficial del runbook**, en el idioma del comprador (`locale`); en FAQ resueltas es el borrador FAQ; con secretos, reembolso o datos personales es `null` |
| `source` | `"harness"` | |

- ⚠️ **Fusionar antes de escribir:** como la última línea gana, una fila escrita solo con estos campos borraría el estado y la nota interna que ops ya guardó. Por eso el arnés **nunca escribe** en ese archivo; la integración con `PATCH /api/admin/support/tickets/:id` (con autenticación del arnés) queda como trabajo futuro.
- Cuando el envío de correo esté encendido, el comprador ya recibe un acuse automático al crear el ticket; el `customerUpdate` es la actualización humana posterior.
- Regla bloqueada del runbook, aplicada en todo el arnés: **nunca pedir pagar otra vez** el mismo `session_id` (hay una prueba que lo vigila).

## FAQ de fallas reales (post-mortems)

8 casos con **qué ve el cliente, qué se responde y cuándo escalar**, derivados de `Lab-Avril-Life/docs/guides/lab-seat-failures.md` (actualizado 2026-11-01) y del runbook `lab-paid-not-ready.md` (2026-10-16).
Documento legible: [`docs/FAQ-FALLAS-REALES.md`](docs/FAQ-FALLAS-REALES.md) · datos: `data/failure-cases.json`.

| Caso | Post-mortem | Cuándo escalar a dev |
|---|---|---|
| Dirección del seat da error SSL/TLS | §7.1, §4, §5 | si pasan ~5 min (un ciclo de reconcile) y sigue sin abrir |
| Falla al configurar el sitio (Caddy) | §7.2 + regla 2 | de inmediato: bloquea a TODOS los seats |
| Compra falla rápido con *Permission denied* (slug envenenado) | §7.3 | siempre: hay que limpiar el slug |
| Panel carga pero el chat se cae (WebSocket 1006) | §7.4 | si ocurre después del arreglo del 2026-11-01 (regresión) |
| Pagó, cerró la pestaña y no ve agente | §2 | si Incidentes muestra fallo o no hay registro |
| `lab.avril.life` devuelve 502 | §8 | de inmediato (afecta a todos) |
| Pagó y ve lista de espera / sin capacidad | runbook, pasos 4–5 | ahora: liberar capacidad; **nunca volver a cobrar** |
| 'Launch failed' ~15 s después de pagar | runbook, paso 6 | a dev: log del launcher; no relanzar a ciegas |

Estos casos **siempre escalan**; el campo `knownFailureMatches[].replyDraft` es un borrador de acuse **sin enviar** (`NOT_SENT`, requiere aprobación humana).
`publicReplyDraft` sigue siendo solo para la FAQ confirmada. El archivo fuente trae hostnames, IPs y rutas de llaves: **no se copiaron** (el repo es público; hay una prueba que lo verifica).

## Modo tickets reales exportados (con humano en el medio)

Para demostrar el flujo con tickets de verdad **sin que el arnés toque producción**: una persona con permiso crea 1–2 tickets
en el formulario de apoyo de lab.avril.life, los exporta (JSONL de Lab o `/admin`) y el arnés los procesa:

```bash
node scripts/triage-jsonl.js ruta/al/export.jsonl        # salida en out/live/ (ignorada por git)
```

Hace triage de cada línea, escribe `out/live/handoffs/<LAB-*>.json` y `out/live/tickets-log.jsonl`, y reporta líneas inválidas sin detenerse.
El arnés **nunca** envía el formulario, ni responde al comprador, ni escribe en Lab: crear el ticket y pegar el handoff en `/admin` son pasos humanos.
Prueba con `fixtures/support-tickets.sample.jsonl`. Nota: un export real trae emails reales; los artefactos salen enmascarados, pero no subas el export a Git.

## Pruebas, fallas encontradas y cambios

| # | Falla encontrada | Cómo se detectó | Cambio realizado |
|---|---|---|---|
| 1 | `mkdir` con llaves en `sh` creó una carpeta literal y fallaron las escrituras | error de ejecución | recreé directorios explícitamente |
| 2 | `"sla"` / `"mcp"` podían coincidir dentro de otras palabras ("islas") | revisión de código antes de correr | `countHits` usa límite de palabra; keywords ≤4 letras exigen palabra completa |
| 3 | `npm test` con directorio fallaba en Node 22 | corrida de pruebas | script usa `test/*.test.js` |
| 4 | **"¿Qué es el Control UI…?" se clasificaba como `access_failure`** | prueba adversarial #6 (falló) | la regla exige contexto de error junto a "control ui" |
| 5 | "me cobraron dos veces" / "cancelen mi cobro" caían en `paid_no_agent` | sondeo manual | añadido a señal `refund` (disputa de pago); prueba nueva |
| 6 | `SKILL.md` llamaba `node src/cli.js`, pero OpenClaw copia solo el skill al workspace → el comando no existiría | instalé el skill en OpenClaw real | el skill usa `$AVRIL_SUPPORT_HARNESS` y declara `requires.env`; verificado (sin la variable: *Needs setup*; con ella: *Ready*) |
| 9 | **El arnés asumía 9 campos que no existen** (`id`, `subject`, `status`, `source`, `wallet`, `stripePaymentIntentId`, `paymentStatus`, `rentalStatus`, `deploymentId`) y no usaba `category`, `locale`, `clientIp`, `scope` | tipo real `lib/support-tickets.ts` | Contrato reescrito, tabla supuesto → real, fixtures rehechos, `clientIp` nunca sale, `category` usada como señal |
| 10 | Un email escrito dentro del `message` viajaba completo al handoff | revisión al cambiar el contrato | `maskPiiInText` + prueba |
| 16 | **Un `ticketId` repetido en el export sobrescribía el handoff anterior** (el log decía 2 tickets, había 1 archivo) | PR #3 de valrami-hue (reproducido) | `triage-jsonl.js` guarda `<id>__dup2.json`, avisa y marca `duplicateOf` en el log; prueba nueva |
| 17 | Mensaje de solo espacios (PR #4) | PR #4 de valrami-hue | Ya se rechazaba; se agregó la prueba que lo vigila |
| 14 | El mensaje oficial del runbook y su **'No hacer'** (no segundo Checkout, no relanzar `launchCompany`) no estaban en el arnés; las pistas de `/api/rentals?session_id=` eran suposiciones del Reality Audit | `lab-paid-not-ready.md` | Playbook rehecho con los pasos 1–7 del runbook; `doNot` y mensaje oficial (ES/EN) en la salida |
| 15 | "¿Hay lista de espera?" antes de comprar se habría tratado como falla de capacidad | diseño del caso nuevo | El caso exige contexto de pago (`requirePaid`); control negativo en pruebas |
| 12 | `ticketId` exigía 4 hex (`[0-9A-F]`), pero los fixtures dev reales usan `DEV1`/`DEV2` | `support-tickets_dev.jsonl` del repo Lab | Regex a 4 alfanuméricos mayúsculas (el generador sí produce hex); prueba con el fixture real |
| 13 | Los casos de fallas reales solo detectaban español; un ticket con `locale: "en"` pasaba sin detectar | prueba adversarial | Palabras clave en inglés + prueba |
| 11 | **Llaves en mayúsculas (`SK_LIVE_…`) no se enmascaraban y salían completas en el handoff** (además `WHSEC_`, `RK_`, `BEARER`, `API_KEY_` en cualquier combinación) | PR #1 de valrami-hue (reproducido y ampliado) | Todos los patrones de `src/redact.js` son insensibles a mayúsculas; prueba nueva |
| 8 | La FAQ decía "modelo BYOK" (según QA 2026-10-20), pero la página actual dice créditos iniciales + BYOK opcional | leí la metadescripción de lab.avril.life | FAQ corregida con aviso de discrepancia; confirmar con el equipo |
| 7 | "¿Qué es BYOK?" escalaba como `credentials_or_keys`, pero BYOK es concepto confirmado en la landing | informe QA (Caso 2) | `byok` sale de la señal de llaves y tiene su FAQ; "dónde pongo mi API key" sigue escalando |

## Limitaciones conocidas

- **Reglas por palabras clave, no un LLM:** poco recall con redacciones inusuales (siempre cae a `no_match` → escala; falla hacia el lado seguro).
- **Sobre-escalamiento:** "Pagué ayer, ¿cómo funciona…?" escala como `paid_no_agent`; "Mi clave es muy larga…" se redacta como contraseña. Aceptado por seguridad; no corregido.
- Español e inglés básicos; sin otros idiomas.
- Hipótesis y runbooks salen de documentos del repo MCP (auditoría 2026-10-02): **pueden estar desfasados** respecto a producción.
- **Verificado contra documentos reales de Lab:** `lib/support-tickets.ts`, `lab-seat-failures.md`, `lab-paid-not-ready.md` y `lab-support-ops.md`. **No verificado:** la interfaz `/admin` en vivo, el esquema real de `data/support-ticket-follow-up.jsonl` (solo se conocen 4 campos) y el comportamiento del envío de correo (Resend, hoy apagado por defecto). Las hipótesis mezclan los documentos de Lab (más recientes) con el Reality Audit (2026-10-02).
- Los casos de fallas reconocen español e inglés con palabras clave: un mensaje con otras palabras caerá en `no_match`/`access_failure` y escala igual (falla hacia el lado seguro).
- **Ids no únicos:** el `ticketId` real usa solo 4 hex (65 536 valores por día); con unos ~300 tickets en un día ya es probable una colisión. El arnés no asume unicidad (ver fila 16), pero en Lab conviene tenerlo presente porque la fila de seguimiento usa "última línea por `ticketId` gana".
- Un mensaje que solo mencione "certificado", "caddy" o "websocket" (aunque sea una pregunta general) escala como falla conocida: sobre-escalamiento aceptado.
- El ticket real no trae estado de pago ni PaymentIntent: "pagó" se **infiere** del texto o de `category=not_ready`.
- Emails/teléfonos dentro del texto se enmascaran con reglas simples; nombres propios y direcciones no.
- Los precios de la FAQ son "default" del plan; un humano debe confirmarlos antes de enviar.
- **OpenClaw:** instalé `openclaw` 2026.6.35 y el skill se reconoce (*Ready*, visible al modelo, disponible como comando) y su comando corre correctamente desde otro directorio. **No** corrí una conversación completa con un agente (requiere llave de modelo, que no se debe usar aquí). Hermes no se probó.

## Costo / tiempo de una ejecución

- Un ticket por CLI: ≈ **50 ms** de pared (medido localmente). Los 8 escenarios + evidencia: ≈ **1 s**.
- Costo de tokens/API: **$0** (reglas deterministas, sin red). Si en el futuro se agrega un LLM para redactar borradores, medir de nuevo.

## Estructura

```
src/        harness.js (triage) · classify.js · faq.js · failures.js · redact.js · record.js · anonymize.js · cli.js
data/       faq.json (FAQ confirmada + temas no confirmados) · failure-cases.json (6 fallas reales)
fixtures/   example-ticket.json · scenarios.json (8 escenarios con expected)
scripts/    run-scenarios.js → out/
out/        scenario-report.md · results.json · tickets-log.jsonl · handoffs/<LAB-*>.json   (evidencia)
test/       harness.test.js
docs/       QA-FINDINGS-TO-RULES.md · DEMO.md · DOD-CHECKLIST.md
skills/     avril-support-triage/SKILL.md (wrapper para agentes)
```

## Seguridad del arnés

Las claves de ejemplo del escenario S07 se arman en tiempo de ejecución (`run-scenarios.js`) para que el escáner de secretos de GitHub no bloquee el push; son falsas.
