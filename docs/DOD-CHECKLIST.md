# Checklist de entrega (DoD)

- [x] README: entrada = `SupportTicketRecord` (fixture JSON) — `README.md`, `fixtures/example-ticket.json`
- [x] Salida JSON: `devHandoff` + `mustEscalate` + `handoffSummary` (+ `publicReplyDraft` opcional) — `src/harness.js`
- [x] 8 escenarios (incl. `not_ready` + reembolso) con esperado vs. obtenido — `out/scenario-report.md`
- [x] Demo sin prod/VPS; otra persona corre el arnés con fixtures — `npm run demo`, `docs/DEMO.md`
- [x] Convertir hallazgos QA en FAQ y reglas — `data/faq.json`, `docs/QA-FINDINGS-TO-RULES.md` (fuente: informe QA Ciclo 1 + Reality Audit)
- [x] Prototipo de respuesta y handoff humano simulado — `publicReplyDraft` (NOT_SENT) + `out/handoffs/*.json`
- [x] Probar ocho escenarios, incl. pago sin agente y reembolso — S03, S04, S05
- [x] Registrar tickets simulados y medir errores/escalaciones — `out/tickets-log.jsonl`, métricas en `scenario-report.md`
- [ ] Entregar: **subir a GitHub y pegar la liga**, grabar la demo breve (guion en `docs/DEMO.md`)
