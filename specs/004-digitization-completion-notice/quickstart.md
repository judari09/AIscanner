# Quickstart: Aviso de Digitalización Completada

Guía de validación manual — no hay suite de tests automatizada en este proyecto.

## Prerrequisitos

- Ollama corriendo localmente con el modelo activo configurado (ver 003-ui-polish-model-switch).
- Frontend compilado: `cd frontend && npm install && npm run build`.
- Backend arrancado desde la raíz del repo: `uv run serve.py` → `http://127.0.0.1:8000`.
- Una o más imágenes de prueba (jpg/png) a mano para subir.

## Escenario 1 — Aviso al completarse, solo Markdown (US1, FR-001/002/003)

1. Abrir `http://127.0.0.1:8000/` (pantalla de Cargar).
2. Subir una imagen sin marcar "Generar también un archivo .docx" y enviar a procesar.
3. Esperar a que el estado pase a "Completado".
4. **Esperado**: en menos de 2 segundos aparece un aviso visible (distinto del chip de estado) que
   indica que el documento está disponible en el Explorador, con el nombre del archivo Markdown
   generado. El aviso **no** muestra ninguna ruta de carpeta del sistema de archivos.

## Escenario 2 — Aviso con Markdown + Word (US1, FR-004)

1. Repetir el escenario 1 pero marcando "Generar también un archivo .docx".
2. **Esperado**: el aviso muestra los nombres de **ambos** archivos generados (el `.md` y el
   `.docx`), no solo uno.

## Escenario 3 — Ir directo al documento (US2, FR-008)

1. Con el aviso del escenario 1 o 2 visible, activar su acción de ir al documento.
2. **Esperado**: se llega al Explorador con ese documento específico ya abierto en el visor
   (mismo modal que al hacer clic en un documento desde la lista), sin tener que buscarlo
   manualmente entre carpetas.

## Escenario 4 — Cerrar y auto-descarte (US3, FR-005/006/007)

1. Con el aviso visible, activar su botón de cerrar.
2. **Esperado**: el aviso desaparece de inmediato.
3. Repetir una digitalización y, esta vez, no interactuar con el aviso.
4. **Esperado**: el aviso desaparece por sí solo después de unos segundos.
5. Con el aviso visible (sin cerrarlo), iniciar una nueva digitalización desde la misma pantalla.
6. **Esperado**: el envío se realiza sin que el aviso lo bloquee (SC-004); al completarse esta
   segunda digitalización, el aviso se actualiza para reflejarla, sin acumular dos avisos a la vez
   (FR-010).

## Escenario 5 — Sin aviso ante un fallo (US1, FR-009)

1. Provocar un fallo de procesamiento (por ejemplo, deteniendo Ollama antes de enviar, o con una
   imagen que dispare un error conocido del pipeline).
2. **Esperado**: se muestra el manejo de error ya existente (chip "Fallido" + botón "Reintentar"),
   y **no** aparece el aviso de finalización exitosa.
3. Reintentar y dejar que complete con éxito.
4. **Esperado**: el aviso de éxito aparece igual que en un primer intento exitoso.

## Referencias

- Contrato de API extendido: [contracts/api-additions.md](./contracts/api-additions.md)
- Extensión de `ProcessingJob`: [data-model.md](./data-model.md)
- Decisiones técnicas: [research.md](./research.md)
