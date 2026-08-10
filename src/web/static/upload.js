/**
 * Lógica de la página de carga (Historia 1): mantiene la lista de páginas
 * seleccionadas en orden, envía el POST /api/jobs, y hace polling del
 * estado del trabajo hasta que termina o falla (research.md §3 — polling
 * corto en vez de WebSocket/SSE, por simplicidad dado que es un solo
 * usuario y los trabajos duran segundos a minutos, no horas).
 */
(() => {
  const POLL_INTERVAL_MS = 1500;

  const dropZone = document.getElementById("drop-zone");
  const imageInput = document.getElementById("image-input");
  const pageList = document.getElementById("page-list");
  const submitBtn = document.getElementById("submit-btn");
  const form = document.getElementById("upload-form");
  const exportDocxCheckbox = document.getElementById("export-docx");
  const statusCard = document.getElementById("job-status");
  const statusChip = document.getElementById("job-status-chip");
  const errorBox = document.getElementById("job-error");
  const resultBox = document.getElementById("job-result");
  const retryBtn = document.getElementById("retry-btn");

  // Estado en memoria de las páginas elegidas, en orden. Se reconstruye el
  // <ol> completo en cada cambio en vez de parchear el DOM incrementalmente
  // -- con el puñado de páginas típico de un documento manuscrito, la
  // simplicidad de "re-renderizar todo" no cuesta nada perceptible.
  let selectedFiles = [];
  let currentJobId = null;
  let pollTimer = null;

  function renderPageList() {
    pageList.innerHTML = "";
    selectedFiles.forEach((file, index) => {
      const item = document.createElement("li");
      item.className = "page-list__item";
      item.innerHTML = `<span>${index + 1}. ${file.name}</span>`;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn--tertiary";
      removeBtn.textContent = "Quitar";
      removeBtn.addEventListener("click", () => {
        selectedFiles.splice(index, 1);
        renderPageList();
      });
      item.appendChild(removeBtn);
      pageList.appendChild(item);
    });
    submitBtn.disabled = selectedFiles.length === 0;
  }

  function addFiles(fileList) {
    for (const file of fileList) {
      if (file.type === "image/jpeg" || file.type === "image/png") {
        selectedFiles.push(file);
      }
    }
    renderPageList();
  }

  imageInput.addEventListener("change", (event) => addFiles(event.target.files));

  ["dragover", "dragenter"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("drop-zone--active");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove("drop-zone--active"));
  });
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  });

  function statusLabel(status) {
    return { queued: "En cola", processing: "Procesando", done: "Completado", failed: "Fallido" }[status] || status;
  }

  function renderJobState(job) {
    statusCard.hidden = false;
    statusChip.innerHTML = `<span class="chip chip--${job.status}">${statusLabel(job.status)}</span>`;

    errorBox.hidden = job.status !== "failed";
    if (job.status === "failed") {
      errorBox.textContent = job.error_message || "Ocurrió un error al procesar el documento.";
    }
    retryBtn.hidden = job.status !== "failed";

    resultBox.hidden = job.status !== "done";
    if (job.status === "done") {
      resultBox.innerHTML = `Documento generado: <strong>${job.result_document_path}</strong>. Puedes verlo en el <a href="/explorer">explorador</a>.`;
    }
  }

  async function pollJob(jobId) {
    const response = await fetch(`/api/jobs/${jobId}`);
    const job = await response.json();
    renderJobState(job);

    if (job.status === "queued" || job.status === "processing") {
      pollTimer = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS);
    }
  }

  async function submitJob() {
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("images", file));
    formData.append("export_docx", exportDocxCheckbox.checked ? "true" : "false");

    submitBtn.disabled = true;
    const response = await fetch("/api/jobs", { method: "POST", body: formData });

    if (response.status === 400) {
      const body = await response.json();
      statusCard.hidden = false;
      errorBox.hidden = false;
      errorBox.textContent = body.detail.error + " Archivos rechazados: " + body.detail.rejected_files.join(", ");
      submitBtn.disabled = false;
      return;
    }

    const job = await response.json();
    currentJobId = job.job_id;
    renderJobState(job);
    pollJob(currentJobId);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (pollTimer) clearTimeout(pollTimer);
    submitJob();
  });

  retryBtn.addEventListener("click", async () => {
    if (!currentJobId) return;
    const response = await fetch(`/api/jobs/${currentJobId}/retry`, { method: "POST" });
    const job = await response.json();
    renderJobState(job);
    pollJob(currentJobId);
  });
})();
