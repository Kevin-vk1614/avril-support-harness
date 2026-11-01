---
name: avril-support-triage
description: Clasifica un SupportTicketRecord de Avril Lab, decide si escalar y produce devHandoff/handoffSummary (y borrador FAQ opcional). Solo lectura; no envía nada.
metadata: {"openclaw":{"requires":{"bins":["node"],"env":["AVRIL_SUPPORT_HARNESS"]}}}
---
# avril-support-triage

Úsalo cuando haya un ticket `LAB-*` exportado como JSON y necesites triage.

Requiere la variable `AVRIL_SUPPORT_HARNESS` apuntando a la carpeta del repo `avril-support-harness` (el skill no copia el código).

```bash
node "$AVRIL_SUPPORT_HARNESS/src/cli.js" <ticket.json>
cat ticket.json | node "$AVRIL_SUPPORT_HARNESS/src/cli.js" -
```

Reglas para el agente que lo invoque:
- Si `mustEscalate` es `true`: entrega `handoffSummary` a un humano para el campo "Handoff a dev" de `/admin` y NO respondas al comprador.
- Si hay `publicReplyDraft`: es borrador; requiere aprobación humana. Nunca lo envíes de forma autónoma.
- Nunca pidas contraseñas, llaves ni tokens; nunca ejecutes pagos ni reembolsos.
