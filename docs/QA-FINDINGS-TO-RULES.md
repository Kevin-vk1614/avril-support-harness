# Hallazgos QA → reglas del arnés

Fuente principal: **QA Lab Fricción — Ciclo 1** (Claude Doc, 2026-10-20, lab.avril.life; Edge 131 + OpenClaw Browser).
Complemento: `AvrilContextProtocol-MCP/content/` (Reality Audit 2026-10-02, CURRENT-STATE).

| Hallazgo | Fuente | Regla / FAQ resultante |
|---|---|---|
| 3 planes: Day Pass $6/48h, Trial $15/7d, Monthly $29/30d | QA Caso 1 | `faq-pricing-duration` lista los 3 (caveat: Stripe sin probar, confirmar moneda) |
| Hosting incluido; QA: BYOK. Página 2026-11-01: créditos iniciales + BYOK opcional (**discrepancia**) | QA Caso 2 + metadescripción de lab.avril.life | `faq-byok` con caveat; pedir/guardar llaves sigue escalando (`credentials_or_keys`) |
| OpenClaw o Hermes con un clic; más harnesses "soon" | QA Caso 2 (e85, e97) | `faq-harnesses` (sin fecha para los demás) |
| No hay contador de lugares ni waitlist; solo Monthly menciona tope | QA Caso 4 (e79) | `nc-capacity-waitlist`: nunca se promete disponibilidad |
| Wizard/checkout Stripe sin probar (hash routing, snapshots vacíos) | QA Caso 1 | No afirmar nada sobre el checkout; fallas de pago/acceso escalan; caveat de precios |
| Prueba productiva `pay → ready` UNKNOWN | CURRENT-STATE | `nc-time-to-ready`, `nc-sla-reliability`; pago + not_ready escala siempre |
| Soft-fail `launcher_not_configured` / `paid_waiting_infra` | Reality Audit | El ticket real no trae `rentalStatus`: `category=not_ready` o texto "no está listo" ⇒ `paid_not_ready` + runbook |
| Persistencia frágil owner→agente (JSON) | Reality Audit | Hipótesis principal en `paid_no_agent` |
| Capacidad ~3 seats/VPS; Contabo/SSH/Caddy | Reality Audit | Hipótesis en `paid_not_ready` / `access_failure` |
| Sandbox API / bundles MCP-skills: MOCK / NOT SHIPPED | Reality Audit | `nc-sandbox-api-mcp-skills` |
| Checkout sin Stripe ⇒ `mode: mock` (sin launch) | Reality Audit | Hipótesis en `paid_no_agent` |
| Límite comercial: Avril hospeda, no garantiza resultado | CURRENT-STATE | `faq-no-outcome-guarantee` |
| Regla bloqueada: nunca pedir pagar otra vez el mismo `session_id` | runbook `lab-paid-not-ready.md` | Todas las respuestas sugeridas lo dicen; `doNot` en el handoff; prueba que lo vigila |
| Mensaje oficial al comprador (ES/EN) | runbook, "Buyer message" | `followUpProposal.customerUpdate` en `paid_not_ready` / `paid_no_agent` |
| Pagó y ve lista de espera / sin capacidad; 'Launch failed' ~15 s | runbook, síntomas y pasos 4–6 | casos `paid-waitlist-no-capacity` y `launch-failed-after-pay` |
| La última línea por `ticketId` gana en el seguimiento | `lab-support-ops.md` | El arnés no escribe en Lab; `followUpProposal.caution` |
