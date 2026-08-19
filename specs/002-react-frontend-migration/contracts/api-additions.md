# Adiciones al Contrato de API: Interfaz Web Desacoplada del Backend

El contrato de API completo de `/api/jobs*` y `/api/files*` está definido en
`specs/001-web-ui-upload-explorer/contracts/api.md` y **no cambia** con esta migración (FR-003,
FR-005 de esta spec: la interfaz nueva consume ese mismo contrato sin modificarlo). Esta feature
solo agrega un endpoint nuevo, necesario para FR-012 (detección de backend sin conexión).

## `GET /health`

Responde de inmediato, sin tocar el pipeline, el explorador ni ningún estado — sirve únicamente
para que el frontend pueda distinguir "el proceso del backend está arriba" de un fallo de red.

- **Response** `200 OK`: `{"status": "ok"}`
- No hay casos de error documentados — si el proceso no responde en absoluto, eso ya es la señal
  de "sin conexión" que necesita el cliente (research.md §5), no una respuesta con código de
  error.
