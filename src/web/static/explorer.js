/**
 * Lógica de la página de explorador (Historia 2): navega el árbol vía
 * GET /api/files, visualiza un documento, crea carpetas y mueve documentos
 * (con manejo de conflicto de nombre, FR-014), y dispara las descargas.
 */
(() => {
  const pathBar = document.getElementById("path-bar");
  const grid = document.getElementById("explorer-grid");
  const emptyState = document.getElementById("explorer-empty");
  const newFolderBtn = document.getElementById("new-folder-btn");
  const viewerOverlay = document.getElementById("viewer-overlay");
  const viewerContent = document.getElementById("viewer-content");
  const viewerClose = document.getElementById("viewer-close");

  let currentPath = new URLSearchParams(window.location.search).get("path") || "";

  function renderPathBar() {
    pathBar.innerHTML = "";
    const segments = currentPath ? currentPath.split("/") : [];
    const rootBtn = document.createElement("button");
    rootBtn.className = "path-bar__segment";
    rootBtn.textContent = "🏠 Raíz";
    rootBtn.addEventListener("click", () => navigateTo(""));
    pathBar.appendChild(rootBtn);

    let accumulated = "";
    segments.forEach((segment) => {
      accumulated = accumulated ? `${accumulated}/${segment}` : segment;
      const sep = document.createElement("span");
      sep.textContent = " / ";
      pathBar.appendChild(sep);

      const btn = document.createElement("button");
      btn.className = "path-bar__segment";
      btn.textContent = segment;
      const target = accumulated;
      btn.addEventListener("click", () => navigateTo(target));
      pathBar.appendChild(btn);
    });
  }

  function iconFor(kind, hasDocx) {
    if (kind === "folder") return `<div class="explorer-item__icon explorer-item__icon--folder">📁</div>`;
    const badge = hasDocx ? `<span class="chip chip--docx">DOCX</span>` : "";
    return `<div class="explorer-item__icon explorer-item__icon--document">📄</div>${badge}`;
  }

  async function loadCurrentPath() {
    const response = await fetch(`/api/files?path=${encodeURIComponent(currentPath)}`);
    if (!response.ok) {
      grid.innerHTML = "";
      emptyState.hidden = false;
      emptyState.querySelector("p.text-headline-sm").textContent = "No se pudo abrir esta carpeta";
      return;
    }
    const data = await response.json();
    renderPathBar();
    renderGrid(data);
  }

  function renderGrid(data) {
    grid.innerHTML = "";
    const isEmpty = data.folders.length === 0 && data.documents.length === 0;
    emptyState.hidden = !isEmpty;
    if (isEmpty) return;

    data.folders.forEach((folder) => {
      const item = document.createElement("div");
      item.className = "explorer-item card";
      item.draggable = true;
      item.dataset.path = folder.path;
      item.dataset.kind = "folder";
      item.innerHTML = `
        ${iconFor("folder")}
        <span class="explorer-item__name">${folder.name}</span>
        <button class="btn btn--tertiary download-folder-btn">Descargar carpeta</button>
      `;
      item.addEventListener("click", (event) => {
        if (event.target.closest(".download-folder-btn")) return;
        navigateTo(folder.path);
      });
      item.querySelector(".download-folder-btn").addEventListener("click", (event) => {
        event.stopPropagation();
        window.location.href = `/api/files/download-folder?path=${encodeURIComponent(folder.path)}`;
      });
      attachDropTarget(item, folder.path);
      attachDragSource(item, folder.path);
      grid.appendChild(item);
    });

    data.documents.forEach((doc) => {
      const item = document.createElement("div");
      item.className = "explorer-item card";
      item.draggable = true;
      item.dataset.path = doc.path;
      item.dataset.kind = "document";
      item.innerHTML = `
        ${iconFor("document", doc.has_docx)}
        <span class="explorer-item__name">${doc.name}</span>
        <span class="explorer-item__meta text-label-sm">Modificado: ${new Date(doc.modified_at).toLocaleString()}</span>
        <button class="btn btn--tertiary download-doc-btn">Descargar</button>
      `;
      item.addEventListener("click", (event) => {
        if (event.target.closest(".download-doc-btn")) return;
        openViewer(doc.path, doc.name);
      });
      item.querySelector(".download-doc-btn").addEventListener("click", (event) => {
        event.stopPropagation();
        window.location.href = `/api/files/download?path=${encodeURIComponent(doc.path)}`;
      });
      attachDragSource(item, doc.path);
      grid.appendChild(item);
    });
  }

  function navigateTo(path) {
    currentPath = path;
    const url = new URL(window.location);
    url.searchParams.set("path", path);
    window.history.replaceState({}, "", url);
    loadCurrentPath();
  }

  // ---------- Drag & drop para mover documentos/carpetas ----------

  function attachDragSource(element, path) {
    element.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", path);
    });
  }

  function attachDropTarget(element, destinationFolderPath) {
    element.addEventListener("dragover", (event) => {
      event.preventDefault();
      element.classList.add("drop-zone--active");
    });
    element.addEventListener("dragleave", () => element.classList.remove("drop-zone--active"));
    element.addEventListener("drop", async (event) => {
      event.preventDefault();
      element.classList.remove("drop-zone--active");
      const sourcePath = event.dataTransfer.getData("text/plain");
      if (!sourcePath || sourcePath === destinationFolderPath) return;
      const name = sourcePath.split("/").pop();
      await moveWithConflictHandling(sourcePath, `${destinationFolderPath}/${name}`);
    });
  }

  async function moveWithConflictHandling(source, destination) {
    const response = await fetch("/api/files/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, destination }),
    });
    if (response.status === 409) {
      const newName = prompt("Ya existe algo con ese nombre en el destino. Elige otro nombre:");
      if (!newName) return;
      const parentPath = destination.split("/").slice(0, -1).join("/");
      await moveWithConflictHandling(source, parentPath ? `${parentPath}/${newName}` : newName);
      return;
    }
    await loadCurrentPath();
  }

  // ---------- Crear carpeta ----------

  newFolderBtn.addEventListener("click", async () => {
    const name = prompt("Nombre de la nueva carpeta:");
    if (!name) return;
    const path = currentPath ? `${currentPath}/${name}` : name;
    const response = await fetch("/api/files/folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (response.status === 409) {
      alert("Ya existe una carpeta o archivo con ese nombre aquí.");
      return;
    }
    await loadCurrentPath();
  });

  // ---------- Visor de documento ----------

  async function openViewer(path, name) {
    const response = await fetch(`/api/files/view?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    viewerContent.innerHTML = `<h2 class="text-headline-sm">${name}</h2>${renderMarkdown(data.markdown)}`;
    viewerOverlay.hidden = false;
  }

  viewerClose.addEventListener("click", () => {
    viewerOverlay.hidden = true;
  });
  viewerOverlay.addEventListener("click", (event) => {
    if (event.target === viewerOverlay) viewerOverlay.hidden = true;
  });

  /**
   * Convertidor de Markdown a HTML deliberadamente mínimo: cubre lo que el
   * prompt del LLM (src/llm/prompts.py) produce en la práctica (títulos,
   * párrafos, listas, negrita/cursiva, imágenes) sin traer una librería de
   * terceros -- no hay CDN externo disponible (research.md §1) y no vale
   * la pena auto-hospedar un parser CommonMark completo para este alcance.
   * No cubre tablas ni markdown anidado complejo a propósito.
   */
  function renderMarkdown(markdown) {
    const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const inline = (text) =>
      escapeHtml(text)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%;" />')
        .replace(/\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");

    const lines = markdown.split("\n");
    let html = "";
    let listType = null;
    // Bloques ```fenced``` que no se resolvieron a una imagen (ej. un
    // diagrama mermaid sin PNG porque no había Node/mermaid-cli cuando se
    // procesó, ver FileExplorerService._substitute_rendered_diagrams) se
    // muestran como código en vez de mezclarse como párrafos sueltos.
    let inCodeBlock = false;
    let codeBuffer = [];

    const closeList = () => {
      if (listType) html += `</${listType}>`;
      listType = null;
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const fence = line.match(/^```(.*)$/);

      if (fence) {
        if (inCodeBlock) {
          html += `<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`;
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          closeList();
          inCodeBlock = true;
        }
        continue;
      }
      if (inCodeBlock) {
        codeBuffer.push(rawLine);
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      const unordered = line.match(/^[-*]\s+(.*)$/);
      const ordered = line.match(/^\d+\.\s+(.*)$/);

      if (heading) {
        closeList();
        const level = heading[1].length;
        html += `<h${level}>${inline(heading[2])}</h${level}>`;
      } else if (unordered) {
        if (listType !== "ul") { closeList(); html += "<ul>"; listType = "ul"; }
        html += `<li>${inline(unordered[1])}</li>`;
      } else if (ordered) {
        if (listType !== "ol") { closeList(); html += "<ol>"; listType = "ol"; }
        html += `<li>${inline(ordered[1])}</li>`;
      } else if (line === "") {
        closeList();
      } else {
        closeList();
        html += `<p>${inline(line)}</p>`;
      }
    }
    closeList();
    // Si el markdown termina sin cerrar el fence (no debería pasar con
    // Markdown válido, pero por si acaso no dejamos el contenido perdido).
    if (inCodeBlock && codeBuffer.length) {
      html += `<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`;
    }
    return html;
  }

  loadCurrentPath();
})();
