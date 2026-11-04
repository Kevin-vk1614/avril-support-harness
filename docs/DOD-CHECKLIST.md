# Checklist de entrega (DoD)

- [x] README: entrada = `SupportTicketRecord` **verificado contra `lib/support-tickets.ts`** + tabla supuesto → real — `README.md`, `fixtures/example-ticket.json`
- [x] Fixture `LAB-*` con la forma real — `fixtures/support-tickets.sample.jsonl` (sintético) + `scripts/anonymize-jsonl.js` para anonimizar uno real
- [x] ≥4 casos de FAQ basados en los post-mortems de `docs/guides/lab-seat-failures.md` (hay 8: 6 post-mortems + 2 del runbook; qué ve el cliente, respuesta y cuándo escalar) — `data/failure-cases.json`, `docs/FAQ-FALLAS-REALES.md`
- [x] Salida JSON: `devHandoff` + `mustEscalate` + `handoffSummary` (+ `publicReplyDraft` opcional) — `src/harness.js`
- [x] 8 escenarios (incl. `not_ready` + reembolso) con esperado vs. obtenido — `out/scenario-report.md`
- [x] Demo sin prod/VPS; otra persona corre el arnés con fixtures — `npm run demo`, `docs/DEMO.md`
- [x] Convertir hallazgos QA en FAQ y reglas — `data/faq.json`, `docs/QA-FINDINGS-TO-RULES.md` (fuente: informe QA Ciclo 1 + Reality Audit)
- [x] Prototipo de respuesta y handoff humano simulado — `publicReplyDraft` (NOT_SENT) + `out/handoffs/*.json`
- [x] Probar ocho escenarios, incl. pago sin agente y reembolso — S03, S04, S05
- [x] Registrar tickets simulados y medir errores/escalaciones — `out/tickets-log.jsonl`, métricas en `scenario-report.md`
- [x] Alineado con `lab-paid-not-ready.md` y `lab-support-ops.md` (mensaje oficial, 'No hacer', `followUpProposal`)
- [ ] Entregar: **subir a GitHub y pegar la liga**, grabar la demo breve (guion en `docs/DEMO.md`)
