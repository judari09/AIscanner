# Data Model: Interfaz Web Desacoplada del Backend

Esta feature no introduce entidades de dominio nuevas — el backend y su contrato de API
(`specs/001-web-ui-upload-explorer/contracts/api.md`) no cambian. Lo que sí se define aquí son
los tipos TypeScript que el frontend usa para modelar las respuestas de esa API ya existente, más
un concepto nuevo puramente de UI (`ConnectionStatus`, FR-012).

## Tipos que reflejan el contrato de API existente (sin cambios en el backend)

```ts
type JobStatus = "queued" | "processing" | "done" | "failed";

interface ProcessingJob {
  jobId: string;
  status: JobStatus;
  errorMessage: string | null;
  resultDocumentPath: string | null;
}

interface FolderEntry {
  name: string;
  path: string;
}

interface DocumentEntry {
  name: string;
  path: string;
  hasDocx: boolean;
  modifiedAt: string; // ISO-8601
}

interface DirectoryListing {
  path: string;
  folders: FolderEntry[];
  documents: DocumentEntry[];
}
```

**Validación**: estos tipos son un reflejo 1:1 de lo que ya documenta `contracts/api.md` de la
feature 001 (`job_id`→`jobId`, etc., adaptado a `camelCase` por convención de TypeScript) — no
hay reglas de validación nuevas que definir aquí, las mismas del backend siguen aplicando.

## Concepto nuevo: estado de conexión con el backend (FR-012)

```ts
type ConnectionStatus = "connected" | "disconnected";
```

No es una entidad del dominio del escáner de documentos — es un estado puramente de la sesión del
navegador, calculado por el hook `useBackendConnection` (ver `research.md` §5) a partir de si las
llamadas a la API fallan por error de red o responden (aunque sea con un error de negocio). No se
persiste entre recargas de página; al abrir la interfaz siempre arranca en `"connected"` hasta
que se demuestre lo contrario.
