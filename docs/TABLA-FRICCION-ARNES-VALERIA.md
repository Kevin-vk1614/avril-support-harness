# Tabla de fricción — arnés de Valeria (`valrami-hue/arnes-b2b-avril`)

Probado desde un clon limpio (commit `8e071c2`), siguiendo su README. **Entorno de prueba: Linux, Python 3.12.3.**
No probado: Windows, `py`/`python` del PATH, Python 3.9–3.11. Esos puntos los completa quien corra en Windows (ver fila 9).

| # | Fase | Qué pasó | Cómo reproducir | Severidad | Arreglo (PR) |
|---|---|---|---|---|---|
| 1 | Instalación | No hay `requirements.txt` ni manifiesto. El README dice "sin dependencias", pero nada lo declara en un archivo; quien busca instalar no sabe si falta algo. | `ls` en la raíz del repo | Media | Se agrega `requirements.txt` (solo comentarios) y se aclara en el README |
| 2 | Ejecución | Tras `python3 run.py` el repo queda con `crm/leads.csv` y `crm_modelo/leads.csv` modificados (22 líneas cada uno). El contenido es idéntico salvo los saltos de línea: el commit usa LF y `csv.writer` genera CRLF. | `python3 run.py && git status --short` | Media | `csv.writer(f, lineterminator="\n")` + prueba |
| 3 | Documentación | El README dice "20 pruebas" en Ejecución y "21 automáticas" en Pruebas; el conteo real es 21. | `python3 -m unittest discover -s tests` | Baja | README unificado (24 con las pruebas nuevas) |
| 4 | Caso raro | `--solicitudes` con un archivo inexistente termina con un traceback de `FileNotFoundError`. | `python3 run.py --solicitudes no_existe.json` | Baja | Mensaje "Error en los datos de entrada" y código 2 |
| 5 | Caso raro | Una solicitud sin la clave `mensaje` termina con `KeyError: 'mensaje'`. | `[{"id":"X1"}]` como archivo de solicitudes | Media | Validación con mensaje claro (`La solicitud X1 no tiene 'mensaje'`) |
| 6 | Caso raro | Una solicitud con `"mensaje": null` no truena: queda `faltan_datos` sin aviso. **El PR cambia esto a error claro**; es un cambio de comportamiento a revisar por Valeria. | `[{"id":"X2","mensaje":null}]` | Baja | Cubierto por la validación de la fila 5 |
| 7 | Versión de Python | El README pide 3.9+. Un análisis estático (`vermin`) no encontró sintaxis posterior a 3.5, pero **no la ejecuté** en 3.9. | `pip install vermin && vermin .` | Info | Sin cambio; falta probar en 3.9 |
| 8 | Modo modelo real | `--cliente anthropic` sin `ANTHROPIC_API_KEY` falla con mensaje claro y código 2. Funciona como se documenta. **No se probó con llave real** (el ticket lo prohíbe). | `python3 run.py --modo modelo --cliente anthropic` | — | Ninguno |
| 9 | Windows | **PENDIENTE de probar por quien tenga Windows:** `python3` suele no existir (el README menciona `python`/`py`); verificar acentos y la ñ en consola. | `py run.py` | ? | — |
| 10 | Cosmético | `evidencias/ejecucion de pruebas .png` tiene un espacio antes del punto; puede estorbar en scripts. | `ls evidencias` | Baja | No incluido en el PR |

**Lo que funcionó bien:** corre sin instalar nada, las 21 pruebas pasan, reglas y modo simulado corren en milisegundos, y el modo
`anthropic` falla de forma segura sin llave.
