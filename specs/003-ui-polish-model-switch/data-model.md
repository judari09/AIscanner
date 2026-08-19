# Data Model: Mejora Visual de la Interfaz y Selección de Modelo LLM

Sin base de datos ni ORM (Principio VI) — las dos entidades de esta feature son, respectivamente,
una lectura en vivo de Ollama y un único valor persistido en un archivo JSON local.

## Modelo LLM disponible

Representa un modelo de Ollama instalado localmente. No se persiste en la aplicación — se
recalcula en cada consulta a `GET /api/models` (spec.md, Key Entities).

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | `string` | Nombre/etiqueta del modelo tal como lo reporta Ollama (ej. `"qwen2.5:7b-instruct"`). Único dentro de la lista devuelta. |

**Origen**: `src/llm/model_catalog.py`, vía `ollama.Client(host=...).list()` (research.md §1). No
se agregan campos que la aplicación deba inventar o completar — si Ollama no reporta un dato
(ej. tamaño), la aplicación no lo sintetiza.

**Reglas de validación**: Ninguna del lado de la aplicación — la lista es exactamente la que
Ollama reporta en el momento de la consulta.

## Configuración de modelo activo

Valor único, persistido en `config/settings.json` (ruta configurable, research.md §2),
independiente de cualquier documento o historial de digitalización (spec.md, Key Entities).

| Campo | Tipo | Descripción |
|---|---|---|
| `model_name` | `string` | Nombre del modelo actualmente activo para las digitalizaciones. |

**Reglas de validación**:
- Antes de escribir un `model_name` nuevo, debe existir en la lista devuelta por el catálogo de
  Modelos LLM disponibles en ese momento (FR-005, research.md §3). Si la validación falla, el
  archivo no se modifica.
- Si el archivo no existe todavía (primera ejecución, o instalación nueva), `get_active_model()`
  devuelve el modelo de fábrica (`"gemma3:4b"`, el mismo valor que hoy está hardcodeado en
  `Structuring`, elegido porque debe ser un modelo multimodal) sin necesidad de que el archivo
  exista físicamente en disco.

**Ciclo de vida**: Se crea/sobrescribe únicamente a través de `set_active_model()` (llamado desde
`PUT /api/config/active-model`, ver `contracts/api-additions.md`). No hay eliminación: el archivo
siempre refleja el último modelo confirmado, o no existe si el usuario nunca cambió el modelo de
fábrica.

**Consumidores**: `Structuring.__init__` (vía `config.get_active_model()`) — tanto el pipeline
invocado por la CLI como el invocado por la cola de trabajos de la web leen el mismo valor, sin
ninguna diferencia de comportamiento entre las dos interfaces (Principio II).
