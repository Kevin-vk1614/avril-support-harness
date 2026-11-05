# Tabla de fricción — arnés de Valeria (`valrami-hue/arnes-b2b-avril`)

Probado desde clones limpios siguiendo su README:
- **Linux, Python 3.12.3:** primero sobre el commit `8e071c2` y luego re-verificado sobre `d85d3e3` (versión actual, 2026-11-03).
- **Windows, PowerShell, `py` (Kevin):** `py run.py` corre (10 solicitudes en 0.024 s), `py -m unittest discover -s tests` pasa 21/21 y, tras el parche del PR, 23/23.

Verificado en Windows con el parche del PR: tras `py run.py`, `git status` solo muestra los archivos del parche y **no** `crm/leads.csv`.
No verificado: el modo `--cliente anthropic` con llave real (el ticket lo prohíbe) y Python 3.9–3.11.

| # | Fase | Qué pasó | Cómo reproducir | Severidad | Estado |
|---|---|---|---|---|---|
| 1 | Instalación | Faltaba `requirements.txt`/manifiesto aunque el README decía "sin dependencias". | `ls` en `8e071c2` | Media | ✅ **Resuelto por Valeria** (commit `1da758e`: `requirements.txt` + pasos con `venv` en el README) |
| 2 | Ejecución | **Solo Linux/macOS:** tras `python3 run.py` el repo queda con `crm/leads.csv` modificado (el commit usa LF y `csv.writer` genera CRLF; el contenido es idéntico). **En Windows el repo queda limpio** (verificado por Kevin: `git add -A` tras correr no incluyó ningún CSV). | `python3 run.py && git status --short` (Linux) | Baja | ⚠️ **Sin arreglo en el PR.** Probé forzar LF con `csv.writer(f, lineterminator="\n")` y en Windows (Git con autocrlf) **empeoró**: `crm/leads.csv` quedó modificado. Opción a evaluar: `.gitattributes`; no verificada |
| 3 | Documentación | El README dice "20 pruebas" en la línea de ejecución; el conteo real es 21 (23 con las pruebas del PR). | `python3 -m unittest discover -s tests` | Baja | 🔧 En el PR |
| 4 | Caso raro | `--solicitudes` con archivo inexistente termina con traceback de `FileNotFoundError`. | `python3 run.py --solicitudes no_existe.json` | Baja | 🔧 En el PR: mensaje claro y código de salida 2 |
| 5 | Caso raro | Una solicitud sin la clave `mensaje` termina con `KeyError: 'mensaje'`. | `[{"id":"X1"}]` como solicitudes | Media | 🔧 En el PR: `La solicitud X1 no tiene 'mensaje'` |
| 6 | Caso raro | `"mensaje": null` no truena: queda `faltan_datos` sin aviso. **El PR lo cambia a error claro** (cambio de comportamiento para que Valeria decida). | `[{"id":"X2","mensaje":null}]` | Baja | 🔧 En el PR |
| 7 | Versión de Python | Ahora el README dice "probado 3.14.3 en Windows (no se probó con anteriores)", lo cual es honesto. Un análisis estático (`vermin`) no halló sintaxis posterior a 3.5, pero solo la ejecuté en 3.12.3. | `vermin .` | Info | Sin cambio |
| 8 | Modo modelo real | `--cliente anthropic` sin `ANTHROPIC_API_KEY` falla con mensaje claro y código 2. **No probado con llave real.** | `python3 run.py --modo modelo --cliente anthropic` | — | ✅ Correcto |
| 9 | Windows | `py run.py` y las 21 pruebas funcionan en Windows PowerShell. | `py run.py` | — | ✅ Verificado por Kevin |
| 10 | Cosmético | `evidencias/ejecucion de pruebas .png` tiene un espacio antes del punto; puede estorbar en scripts. | `ls evidencias` | Baja | No incluido en el PR |

**Lección de la verificación:** un arreglo que funciona en Linux puede empeorar Windows; por eso se probó en ambos y se retiró el cambio del CSV.

**Lo que funcionó bien:** corre sin instalar nada, las pruebas pasan en Linux y en Windows, reglas y modo simulado tardan milisegundos, y el modo `anthropic` falla de forma segura sin llave.
