---

description: "Task list for 003-ui-polish-model-switch"
---

# Tasks: Mejora Visual de la Interfaz y Selección de Modelo LLM

**Input**: Design documents from `/specs/003-ui-polish-model-switch/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-additions.md, quickstart.md

**Tests**: No se generan tareas de test — el proyecto no tiene framework de tests configurado
(plan.md, Technical Context) y la spec no pide TDD; la validación es manual vía `quickstart.md`
(última tarea de Polish).

**Organización**: Las tareas se agrupan por historia de usuario. **US1 y US2 son ambas P1 y están
explícitamente acopladas en spec.md** ("[US2] se implementa junto con la Historia 1 como parte
del mismo flujo, pero se prueba de forma independiente"; US1 depende de poder ver la lista que
entrega US2 para poder seleccionar algo). Por eso, aunque US1 aparece primero en spec.md, aquí
**US2 se implementa antes que US1** — es la única forma de que el checkpoint de US1 sea
verificable de forma independiente tal como pide su propio "Independent Test".

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1–US4, ver spec.md)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Aplicación web con backend y frontend separados (plan.md, Project Structure):
`src/` (backend Python) y `frontend/src/` (frontend TypeScript/React).

---

## Phase 1: Setup

**Purpose**: Preparar el repositorio para el archivo de configuración nuevo antes de tocar código.

- [X] T001 Agregar `config/` (carpeta donde vivirá `settings.json`, research.md §2) al `.gitignore` de la raíz del repo, con un comentario breve explicando que es configuración local de máquina, no código fuente.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida por US1 y US2 (persistencia del modelo activo y catálogo
de modelos de Ollama) que ambas historias necesitan antes de exponer cualquier endpoint o
pantalla. US3 y US4 no dependen de esta fase y podrían implementarse en paralelo si hay más de
una persona disponible.

**⚠️ CRITICAL**: Ningún trabajo de US1/US2 puede empezar hasta completar esta fase.

- [X] T002 [P] En `src/config.py`, agregar la ruta del archivo de configuración (ej. `ACTIVE_MODEL_FILE`, configurable por variable de entorno igual que `AISCANNER_OUTPUT_DIR`), `DEFAULT_MODEL = "gemma3:4b"`, `get_active_model() -> str` (lee el JSON si existe, si no devuelve `DEFAULT_MODEL`) y `set_active_model(name: str) -> None` (escribe `{"model_name": name}`), con docstrings numpydoc (data-model.md, research.md §2).
- [X] T003 [P] Crear `src/llm/model_catalog.py`: una función o clase delgada que envuelve `ollama.Client(base_url).list()` y devuelve solo los nombres de modelo (`list[str]`); debe propagar una excepción distinguible (ej. `OllamaUnavailableError`) cuando la conexión falla, para que el router pueda mapearla a `503`. Docstring numpydoc completo (research.md §1, Principio II/III).
- [X] T004 En `src/llm/structuring.py`, cambiar el default de `Structuring.__init__` de `OllamaClient(model_name="gemma3:4b")` a `OllamaClient(model_name=config.get_active_model())` (importando `config`), preservando que `client` siga siendo inyectable. Actualizar su docstring para reflejar el nuevo comportamiento (research.md §7 — depende de T002).

**Checkpoint**: `config.get_active_model()`/`set_active_model()` y `model_catalog` listos para ser consumidos por los routers de US1/US2; la CLI ya usa el modelo activo configurado sin ningún cambio en `cli.py`.

---

## Phase 3: User Story 2 - Ver los modelos de Ollama disponibles localmente (Priority: P1)

**Goal**: El usuario abre la pantalla de configuración y ve qué modelos de Ollama tiene
instalados localmente y cuál está activo, sin usar una terminal (spec.md US2).

**Independent Test**: Con Ollama corriendo y con modelos ya descargados, abrir `/settings` y ver
la lista completa con el modelo activo marcado; con Ollama sin modelos o inalcanzable, ver el
mensaje correspondiente en cada caso (quickstart.md Escenario 2).

### Implementation for User Story 2

- [X] T005 [US2] Crear `src/web/routers/models.py` con `GET /api/models`: llama a `model_catalog` (T003) y `config.get_active_model()` (T002); responde `200` con `{"models": [{"name": ...}, ...], "active_model": ...}` (lista vacía incluida como caso válido); captura la excepción de conexión de T003 y responde `503` con `{"error": "No se pudo conectar con Ollama en el equipo local."}` (contracts/api-additions.md).
- [X] T006 [US2] Registrar el router de T005 en `src/web/app.py` (`app.include_router(models_router.router)`, mismo patrón que `jobs_router`/`files_router`).
- [X] T007 [P] [US2] En `frontend/src/api/types.ts`, agregar los tipos `AvailableModel { name: string }` y `ModelsResponse { models: AvailableModel[]; activeModel: string }`; en `frontend/src/api/client.ts`, agregar `getModels(): Promise<ModelsResponse>` que llama `GET /api/models` y convierte `active_model` → `activeModel` (mismo patrón `toX` que el resto del archivo).
- [X] T008 [US2] Crear `frontend/src/pages/SettingsPage.tsx`: al montar, llama `getModels()`; renderiza la lista de nombres de modelo marcando visualmente cuál es `activeModel`; si `models` está vacío muestra un mensaje de "no hay modelos instalados, instálalos con `ollama pull` fuera de la aplicación" (FR-009); si la llamada falla con `NetworkError`/`ApiError 503` muestra un mensaje distinto de "no se pudo conectar con Ollama" (FR-008). Con JSDoc en el componente.
- [X] T009 [US2] Agregar la ruta `/settings` → `SettingsPage` en `frontend/src/App.tsx`, y una entrada de navegación "Configuración" en `frontend/src/components/Sidebar.tsx` (enlace de texto simple por ahora; su icono SVG llega en US4, T019).

**Checkpoint**: US2 es funcional y verificable de forma independiente — se puede ver la lista de modelos y el activo, y los estados de error/vacío, aunque todavía no se pueda cambiar el modelo desde la UI.

---

## Phase 4: User Story 1 - Cambiar el modelo LLM activo (Priority: P1)

**Goal**: El usuario elige un modelo distinto de la lista (ya visible gracias a US2) y ese pasa a
ser el modelo activo para todas las digitalizaciones futuras (spec.md US1).

**Independent Test**: Con al menos dos modelos descargados, seleccionar uno distinto al activo en
`/settings`, confirmar, y comprobar (lanzando una digitalización) que la corrida usa el modelo
nuevo; verificar que sigue activo tras recargar la página (quickstart.md Escenario 1).

### Implementation for User Story 1

- [X] T010 [US1] Agregar `PUT /api/config/active-model` a `src/web/routers/models.py` (creado en T005): valida `model_name` del body contra la lista actual de `model_catalog`; si coincide, llama `config.set_active_model` y responde `200` con `{"active_model": ...}`; si no coincide responde `409` con `{"error": ..., "active_model": <el anterior sin cambios>}`; si `model_catalog` no puede conectar responde `503` sin tocar la configuración (contracts/api-additions.md, FR-005 — depende de T002, T003, T005).
- [X] T011 [P] [US1] En `frontend/src/api/client.ts`, agregar `setActiveModel(modelName: string): Promise<{ activeModel: string }>` (`PUT /api/config/active-model`, mismo patrón `request<T>` que el resto del archivo; debe dejar pasar el `ApiError` con status `409`/`503` para que la UI lo distinga).
- [X] T012 [US1] Extender `SettingsPage.tsx` (de T008): hacer cada modelo de la lista seleccionable; agregar una acción de confirmar que llama `setActiveModel`; al resolver con éxito, mostrar una confirmación visual explícita (FR-004, en menos de 2s — SC-003) y refrescar cuál es el modelo activo mostrado; al fallar (409/503), mostrar un error inline y dejar el modelo activo mostrado sin cambios (FR-005).
- [X] T013 [US1] En `SettingsPage.tsx`, manejar el caso "modelo activo configurado ya no disponible": si `activeModel` devuelto por `getModels()` no aparece dentro de `models`, mostrar un aviso distinto pidiendo elegir uno de los modelos sí disponibles, en vez de marcar silenciosamente ninguno como activo (US1, escenario de aceptación 3).

**Checkpoint**: US1 + US2 juntas entregan el flujo completo de selección de modelo (quickstart.md Escenarios 1–3 pasan de punta a punta).

---

## Phase 5: User Story 3 - Entender cada pantalla mediante ayuda contextual (Priority: P2)

**Goal**: El usuario puede pasar el cursor (o tocar un control de ayuda) sobre el icono de una
pantalla en la barra lateral y ver una explicación breve de qué puede hacer ahí (spec.md US3).

**Independent Test**: En escritorio, hover sobre cualquier icono de la barra lateral (expandida o
colapsada) muestra el texto explicativo; en un dispositivo táctil, tocar el control "?" junto al
icono muestra el mismo texto (quickstart.md Escenario 5; Clarifications 2026-08-14).

### Implementation for User Story 3

- [X] T014 [P] [US3] Crear `frontend/src/components/icons/HelpIcon.tsx`: componente SVG inline de un icono "?", con `aria-hidden` y JSDoc.
- [X] T015 [US3] Crear `frontend/src/components/ScreenHelpTooltip.tsx`: envuelve un icono de pantalla con (a) un `title`/`aria-describedby` nativo visible en hover de escritorio, y (b) un botón visible con `HelpIcon` (T014) que al recibir foco o tap muestra el mismo texto en un popover simple; recibe el texto explicativo como prop. JSDoc completo (research.md §6, FR-013/FR-014).
- [X] T016 [US3] Integrar `ScreenHelpTooltip` (T015) en `frontend/src/components/Sidebar.tsx` para las tres pantallas (Cargar, Explorador, Configuración), cada una con su texto explicativo propio, funcionando igual en modo expandido y colapsado.

**Checkpoint**: La ayuda contextual funciona en las tres pantallas, con y sin mouse, de forma independiente de si US4 ya cambió la apariencia de los iconos.

---

## Phase 6: User Story 4 - Reconocer visualmente las pantallas y navegar con una barra lateral colapsable (Priority: P2)

**Goal**: Cada pantalla se distingue con un icono SVG propio (no emoji) y la barra lateral puede
colapsarse a un modo solo-iconos que se recuerda entre sesiones (spec.md US4).

**Independent Test**: Cada pantalla tiene un icono SVG reconocible; colapsar/expandir la barra
lateral cambia su modo de visualización sin perder la navegación; tras recargar la página
completa, el estado de colapso elegido se mantiene (quickstart.md Escenario 4).

### Implementation for User Story 4

- [X] T017 [P] [US4] Crear `frontend/src/components/icons/UploadIcon.tsx` (SVG inline que reemplaza el emoji ⬆ de "Cargar"), con JSDoc.
- [X] T018 [P] [US4] Crear `frontend/src/components/icons/ExplorerIcon.tsx` (SVG inline que reemplaza el emoji 📁 de "Explorador"), con JSDoc.
- [X] T019 [P] [US4] Crear `frontend/src/components/icons/SettingsIcon.tsx` (SVG inline tipo engranaje para la entrada "Configuración" agregada en T009), con JSDoc.
- [X] T020 [P] [US4] Crear `frontend/src/components/icons/ChevronIcon.tsx` (SVG inline direccional para el control de colapsar/expandir), con JSDoc.
- [X] T021 [P] [US4] Crear `frontend/src/hooks/useSidebarCollapse.ts`: lee/escribe la clave `localStorage` `aiscanner:sidebar-collapsed` y expone `{ collapsed, toggle }`, con JSDoc (research.md §5, FR-011/FR-012).
- [X] T022 [US4] Actualizar `frontend/src/components/Sidebar.tsx`: reemplazar los `<span>` emoji por `UploadIcon`/`ExplorerIcon`/`SettingsIcon` (T017–T019), agregar un botón de colapsar/expandir con `ChevronIcon` (T020) conectado a `useSidebarCollapse` (T021), y una clase de layout compacto (solo iconos) cuando `collapsed` es `true`. **Nota**: este archivo también lo toca T016 (US3) — completar esa tarea antes de esta para evitar conflictos de merge, no ejecutar en paralelo.
- [X] T023 [US4] Actualizar `frontend/src/components/Sidebar.module.css` con los estilos del modo compacto (ancho reducido, etiquetas de texto ocultas, iconos centrados) y la transición entre ambos modos.

**Checkpoint**: Las cuatro historias de usuario están completas y son verificables juntas vía `quickstart.md`.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final que atraviesa todas las historias.

- [X] T024 Ejecutar `cd frontend && npx oxlint --react-plugin` y corregir cualquier hallazgo de accesibilidad (`jsx-a11y`) introducido por `SettingsPage.tsx`, `ScreenHelpTooltip.tsx` o los iconos nuevos (Principio IV/constitución).
- [X] T025 Ejecutar manualmente los 5 escenarios de `specs/003-ui-polish-model-switch/quickstart.md` de punta a punta (con `uv run serve.py` y el frontend compilado) y corregir cualquier discrepancia encontrada antes de dar la feature por completa.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede empezar de inmediato.
- **Foundational (Phase 2)**: Depende de Setup. Bloquea a US1 y US2 (T005–T013); no bloquea a US3/US4.
- **US2 (Phase 3)**: Depende de Foundational (T002, T003). Debe completarse **antes** que US1 (ver nota de organización arriba) — su lista de modelos es lo que US1 necesita para poder seleccionar algo.
- **US1 (Phase 4)**: Depende de US2 (T005–T009: usa el mismo router `models.py` y la misma `SettingsPage.tsx`).
- **US3 (Phase 5)**: Depende solo de Foundational-menos-lo-específico-de-modelo — en la práctica, de que exista `Sidebar.tsx` (ya existe hoy) y las tres pantallas a documentar (`/`, `/explorer` ya existen; `/settings` la agrega US2, T009). Puede desarrollarse en paralelo con US1 si `/settings` ya está montada.
- **US4 (Phase 6)**: Igual que US3 — depende de que exista la entrada "Configuración" en el sidebar (T009). T022 depende además de que T016 (US3) ya haya tocado `Sidebar.tsx` (mismo archivo, ver nota en T022).
- **Polish (Phase 7)**: Depende de todas las historias que se vayan a entregar.

### Parallel Opportunities

- T002 y T003 (Foundational) en paralelo — archivos distintos.
- T007 (US2, frontend types/client) en paralelo con T005–T006 (US2, backend) — archivos distintos, se integran en T008.
- T011 (US1, frontend client) en paralelo con T010 (US1, backend).
- T014 (US3) en paralelo con cualquier tarea de US1/US2 una vez completada Foundational.
- T017, T018, T019, T020, T021 (US4) en paralelo entre sí — archivos independientes; su integración conjunta ocurre en T022.
- US3 y US4 pueden trabajarse en paralelo entre dos personas distintas, coordinando solo la edición secuencial de `Sidebar.tsx` (T016 antes que T022).

---

## Parallel Example: Foundational

```bash
Task: "Agregar persistencia de modelo activo en src/config.py (T002)"
Task: "Crear src/llm/model_catalog.py (T003)"
```

## Parallel Example: User Story 4

```bash
Task: "Crear frontend/src/components/icons/UploadIcon.tsx (T017)"
Task: "Crear frontend/src/components/icons/ExplorerIcon.tsx (T018)"
Task: "Crear frontend/src/components/icons/SettingsIcon.tsx (T019)"
Task: "Crear frontend/src/components/icons/ChevronIcon.tsx (T020)"
Task: "Crear frontend/src/hooks/useSidebarCollapse.ts (T021)"
```

---

## Implementation Strategy

### MVP First (US2 + US1)

1. Completar Phase 1 (Setup) y Phase 2 (Foundational).
2. Completar Phase 3 (US2) — pantalla de configuración visible con la lista de modelos.
3. Completar Phase 4 (US1) — selección y cambio de modelo activo.
4. **Validar**: quickstart.md Escenarios 1–3.
5. Esto ya resuelve el valor funcional principal pedido (US1/US2 del feature description).

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US2 → pantalla de configuración de solo lectura, demostrable.
3. US1 → cambio de modelo funcional (MVP funcional completo).
4. US3 → ayuda contextual (mejora de usabilidad).
5. US4 → iconos SVG + sidebar colapsable (mejora visual/de reconocimiento).
6. Polish → lint de accesibilidad + validación manual completa.

---

## Notes

- [P] = archivos distintos sin dependencias pendientes entre sí.
- Cada tarea de código nuevo/modificado DEBE incluir su docstring numpydoc (Python) o JSDoc
  (TypeScript/React) como parte de la propia tarea, no como paso separado (Principio IV de la
  constitución) — no se generó una tarea de "agregar documentación" aparte porque no es un paso
  posterior, es parte de terminar cada tarea.
- Comentarios que expliquen decisiones no obvias (por qué el archivo de configuración vive fuera
  de `OUTPUT_DIR`, por qué la validación de FR-005 ocurre en el servidor) van en el código de la
  tarea correspondiente (T002, T010), no en una tarea separada (Principio V).
- Confirmar tras cada tarea que no se rompió ninguna historia ya completada antes de continuar.
