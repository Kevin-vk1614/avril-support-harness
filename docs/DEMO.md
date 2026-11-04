# Demo breve (≈3 min) — otra persona puede repetirla

```bash
node -v && npm run scenarios        # 16/16 PASS (8 escenarios + 8 fallas reales)
cat out/scenario-report.md          # esperado vs obtenido
node src/cli.js fixtures/example-ticket.json   # un caso paid_not_ready con devHandoff
cat out/handoffs/LAB-TEST-0007.json # secretos enmascarados (S07)
npm test                            # 49 pruebas
```
Guion: (1) caso FAQ S01 → borrador `NOT_SENT`; (2) S03 → handoff con ids Stripe + runbook; (3) S07 → llave enmascarada;
(4) mostrar que `safety` siempre es `false` y que no hay llamadas de red.
