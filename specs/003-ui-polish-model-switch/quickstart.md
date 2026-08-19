# Quickstart: Mejora Visual de la Interfaz y Selección de Modelo LLM

Guía de validación manual — no hay suite de tests automatizada en este proyecto.

## Prerrequisitos

- Ollama corriendo localmente (`ollama serve`), con **al menos dos modelos descargados**
  (ej. `ollama pull gemma3:4b` y `ollama pull qwen2.5:7b-instruct`) para poder probar el cambio.
- Frontend compilado: `cd frontend && npm install && npm run build`.
- Backend arrancado desde la raíz del repo: `uv run serve.py` → `http://127.0.0.1:8000`.

## Escenario 1 — Ver y cambiar el modelo activo (US1/US2, RF1/RF2)

1. Abrir `http://127.0.0.1:8000/settings`.
2. **Esperado**: se ve la lista de modelos instalados (los mismos que devuelve `ollama list` en
   terminal), y uno de ellos marcado como activo.
3. Seleccionar un modelo distinto y confirmar.
4. **Esperado**: aparece una confirmación visual en menos de 2 segundos (SC-003); al recargar la
   página, ese modelo sigue marcado como activo (FR-006).
5. Lanzar una digitalización desde `/` con una imagen cualquiera.
6. **Esperado**: el job se completa; el modelo activo elegido en el paso 3 es el que procesó la
   digitalización (verificable, por ejemplo, revisando los logs del backend si se agregó alguno,
   o confirmando que un modelo no multimodal produce un resultado degradado esperado si se elige
   uno a propósito para la prueba).

## Escenario 2 — Ollama sin modelos o sin conexión (US2, FR-008/FR-009)

1. Con Ollama corriendo pero **sin modelos instalados** (`ollama rm` de todos, o un entorno
   limpio), recargar `/settings`.
2. **Esperado**: mensaje indicando que no hay modelos instalados, sin lista vacía silenciosa.
3. Detener Ollama (`ollama serve` apagado) y recargar `/settings`.
4. **Esperado**: mensaje claro de que no se pudo conectar con Ollama, distinto del mensaje del
   paso 2.

## Escenario 3 — Modelo activo ya no disponible (US1, escenario 3)

1. Cambiar el modelo activo a uno instalado.
2. Eliminarlo fuera de la aplicación (`ollama rm <modelo>`).
3. Recargar `/settings`.
4. **Esperado**: la interfaz señala que el modelo activo configurado no está disponible y pide
   elegir uno de los disponibles.

## Escenario 4 — Iconos SVG y barra lateral colapsable (US4, FR-010/FR-011/FR-012)

1. Abrir cualquier pantalla y observar la barra lateral.
2. **Esperado**: cada pantalla (Cargar, Explorador, Configuración) tiene un icono SVG propio, sin
   emojis.
3. Colapsar la barra lateral con su control.
4. **Esperado**: queda en modo solo-iconos, navegable igual que antes.
5. Recargar la página completa (F5).
6. **Esperado**: la barra lateral sigue colapsada (SC-005).

## Escenario 5 — Ayuda contextual con y sin mouse (US3, FR-013/FR-014)

1. En escritorio, pasar el cursor sobre un icono de pantalla en la barra lateral (expandida y
   colapsada).
2. **Esperado**: aparece un texto breve explicando esa pantalla.
3. En un dispositivo táctil (o simulando touch en las herramientas de desarrollo del navegador),
   tocar el control de ayuda ("?") junto a un icono de pantalla.
4. **Esperado**: aparece el mismo texto explicativo que en el paso 2.

## Referencias

- Contrato de API nuevo: [contracts/api-additions.md](./contracts/api-additions.md)
- Entidades: [data-model.md](./data-model.md)
- Decisiones técnicas: [research.md](./research.md)
