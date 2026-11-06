# Prueba del arnés dentro de un seat de OpenClaw (sin SSH)

Criterio de la tarjeta: *"Arnés de soporte ejecutado dentro de seat OpenClaw, sin SSH, una vez habilitada capacidad/auto-buy."*

**Estado: PENDIENTE** (espera el auto-buy de Gerry). Esta guía se probó solo hasta donde se puede fuera del seat:
el skill se instala y se reconoce en un OpenClaw local; **lo de adentro del seat no se ha probado**.

## Antes de empezar (permisos)
- Pedir a Gerry/Sergio el seat o su autorización: no se paga ni se toca producción por cuenta propia.
- No usar llaves reales de nadie. Si el seat trae créditos iniciales, usar esos. No pegar tokens en el chat del agente.

## Pasos (ajustar a lo que permita la interfaz del seat)
1. Abrir el Control UI del seat. Anotar fecha, hora y el slug del seat.
2. Pedir al agente (o usar la terminal si el seat la ofrece) que corra, **uno por uno**:
   ```bash
   uname -a && node -v && npm -v && git --version
   git clone https://github.com/Kevin-vk1614/avril-support-harness.git
   cd avril-support-harness
   npm test
   npm run scenarios
   ```
   Esperado: `# pass 49` y `16/16 casos PASS`. El arnés no usa red; solo el `git clone` la usa.
3. (Opcional) Instalar el skill: 
   ```bash
   export AVRIL_SUPPORT_HARNESS=$PWD
   openclaw skills install $PWD/skills/avril-support-triage
   openclaw skills info avril-support-triage     # debe decir Ready
   ```
4. Pedir al agente que haga triage de `fixtures/example-ticket.json` con el skill y que **no responda a ningún comprador**.

## Si algo falla (plan B, sin SSH)
- Sin `git` o sin salida a internet: subir el zip del repo por la función de archivos del Control UI, si existe.
- Sin Node ≥ 18: anotarlo; es un hallazgo válido de la prueba.

## Evidencia a guardar
| Dato | Valor |
|---|---|
| Fecha / hora | |
| Slug del seat | |
| `uname -a`, `node -v` | |
| `npm test` (¿49 pass?) | |
| `npm run scenarios` (¿16/16?) | |
| Skill: ¿Ready? | |
| Tiempo total aprox. y créditos usados | |
| Qué falló y cómo se resolvió | |

Capturas: la salida de `npm run scenarios` dentro del seat, con el nombre del seat visible. No incluir tokens ni datos de compradores.
