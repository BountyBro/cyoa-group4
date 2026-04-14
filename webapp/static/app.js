let story = null;
let storyStatus = null;
let currentPageId = null;
let mode = "edit";

const pagesContainer = document.getElementById("pages");
const pageSearchInput = document.getElementById("page-search");
const pageTitleInput = document.getElementById("page-title");
const pageTextInput = document.getElementById("page-text");
const choicesContainer = document.getElementById("choices");
const addPageButton = document.getElementById("add-page-button");
const addChoiceButton = document.getElementById("add-choice-button");
const importButton = document.getElementById("import-button");
const saveButton = document.getElementById("save-button");
const downloadButton = document.getElementById("download-button");
const generateButton = document.getElementById("generate-button");
const uploadButton = document.getElementById("upload-button");
const uploadInput = document.getElementById("upload-input");
const editModeButton = document.getElementById("edit-mode-button");
const readerModeButton = document.getElementById("reader-mode-button");
const readerResetButton = document.getElementById("reader-reset-button");
const readerTitle = document.getElementById("reader-page-title");
const readerText = document.getElementById("reader-page-text");
const readerChoices = document.getElementById("reader-choices");
const readerPane = document.getElementById("readerPane");
const editorPane = document.getElementById("editorPane");
const statusSummary = document.getElementById("statusSummary");
const statusDetail = document.getElementById("statusDetail");
const graphPreview = document.getElementById("graphPreview");

async function fetchStory() {
  const response = await fetch("/api/story");
  story = await response.json();
  currentPageId = story.startPageId || Object.keys(story.pages)[0];
  renderPages();
  renderCurrentPage();
  await refreshGraph();
  await refreshStatus();
}

async function refreshStatus() {
  const response = await fetch("/api/status");
  if (response.ok) {
    storyStatus = await response.json();
  } else {
    storyStatus = null;
  }
  renderStatus();
}

function renderPages() {
  const search = pageSearchInput?.value.trim().toLowerCase() || "";
  pagesContainer.innerHTML = "";
  const entries = Object.values(story.pages).sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));

  for (const page of entries) {
    const title = page.title || "Untitled";
    const text = page.text || "";
    const searchText = `${page.id} ${title} ${text}`.toLowerCase();
    if (search && !searchText.includes(search)) {
      continue;
    }

    const item = document.createElement("div");
    item.className = "page-item" + (page.id === currentPageId ? " selected" : "");
    item.addEventListener("click", () => selectPage(page.id));

    const label = document.createElement("span");
    label.className = "page-item-label";
    label.innerHTML = `${page.id}: ${escapeHtml(title)}`;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "page-delete";
    del.title = "Delete this page";
    del.textContent = "×";
    del.addEventListener("click", (event) => {
      event.stopPropagation();
      deletePage(page.id);
    });

    item.appendChild(label);
    item.appendChild(renderPageBadgesNode(page.id));
    item.appendChild(del);
    pagesContainer.appendChild(item);
  }
}

function renderPageBadgesNode(pageId) {
  const group = document.createElement("span");
  group.className = "badge-group";
  if (!storyStatus) {
    return group;
  }
  const status = storyStatus.page_status[pageId] || {};
  const defs = [
    [status.is_start,    "badge-start",    "Start"],
    [status.is_terminal, "badge-terminal", "Terminal"],
    [status.is_orphan,   "badge-orphan",   "Orphan"],
    [status.is_branch,   "badge-branch",   "Branch"],
    [!status.has_text,   "badge-empty",    "Empty"],
  ];
  for (const [condition, cls, label] of defs) {
    if (condition) {
      const span = document.createElement("span");
      span.className = `badge ${cls}`;
      span.textContent = label;
      group.appendChild(span);
    }
  }
  return group;
}

function selectPage(pageId) {
  if (!story.pages[pageId]) {
    return;
  }
  currentPageId = pageId;
  renderPages();
  renderCurrentPage();
}

function renderCurrentPage() {
  if (!story || !currentPageId) {
    return;
  }
  if (mode === "edit") {
    const page = story.pages[currentPageId];
    pageTitleInput.value = page.title || "";
    pageTextInput.value = page.text || "";
    renderChoices(page);
  } else {
    renderReaderPage();
  }
}

function renderChoices(page) {
  choicesContainer.innerHTML = "";
  const choices = page.choices || [];
  if (choices.length === 0) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "This page has no choices yet.";
    choicesContainer.appendChild(empty);
    return;
  }

  for (let index = 0; index < choices.length; index += 1) {
    const choice = choices[index];
    const row = document.createElement("div");
    row.className = "choice-item";
    row.innerHTML = `
      <div class="choice-row">
        <input type="text" placeholder="Choice label" value="${escapeHtml(choice.label)}" data-field="label" data-index="${index}" />
        <input type="text" placeholder="Target page ID" value="${escapeHtml(choice.target)}" data-field="target" data-index="${index}" />
        <button type="button" data-action="delete" data-index="${index}">Delete</button>
      </div>
    `;
    choicesContainer.appendChild(row);
  }
}

function renderReaderPage() {
  const page = story.pages[currentPageId];
  if (!page) {
    return;
  }
  readerTitle.textContent = `Page ${page.id}: ${page.title || "Untitled"}`;
  readerText.innerHTML = formatTextAsHtml(page.text || "<em>No text available.</em>");
  readerChoices.innerHTML = "";

  const choices = page.choices || [];
  if (choices.length === 0) {
    const endNode = document.createElement("div");
    endNode.className = "reader-end";
    endNode.textContent = "The story ends here. Use the page list to explore another path.";
    readerChoices.appendChild(endNode);
    return;
  }

  for (const choice of choices) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reader-choice";
    button.textContent = choice.label || `Go to ${choice.target}`;
    button.addEventListener("click", () => {
      if (choice.target && story.pages[choice.target]) {
        currentPageId = choice.target;
        renderCurrentPage();
        renderPages();
      }
    });
    readerChoices.appendChild(button);
  }
}

function formatTextAsHtml(text) {
  const paragraphs = text.split(/\n\n+/).map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`);
  return paragraphs.join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&"'<>]/g, (char) => ({
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&#39;",
    "<": "&lt;",
    ">": "&gt;",
  }[char]));
}

function updateCurrentPage() {
  if (!currentPageId || !story.pages[currentPageId]) {
    return;
  }
  const page = story.pages[currentPageId];
  page.title = pageTitleInput.value;
  page.text = pageTextInput.value;
  const choiceInputs = choicesContainer.querySelectorAll("[data-field]");
  const nextChoices = [];
  for (const input of choiceInputs) {
    const index = Number(input.dataset.index);
    const field = input.dataset.field;
    const value = input.value.trim();
    nextChoices[index] = nextChoices[index] || { label: "", target: "" };
    nextChoices[index][field] = value;
  }
  page.choices = nextChoices.filter((choice) => choice.target.length > 0 || choice.label.length > 0);
}

function addPage() {
  if (mode === "edit") {
    updateCurrentPage();
  }
  const nextId = String(Object.keys(story.pages).reduce((max, id) => Math.max(max, Number(id)), 0) + 1);
  story.pages[nextId] = {
    id: nextId,
    title: `Page ${nextId}`,
    text: "",
    choices: [],
  };
  currentPageId = nextId;
  renderPages();
  renderCurrentPage();
}

function addChoice() {
  const page = story.pages[currentPageId];
  if (!page) {
    return;
  }
  page.choices = page.choices || [];
  page.choices.push({ label: "", target: "" });
  renderChoices(page);
}

function deleteChoice(index) {
  const page = story.pages[currentPageId];
  if (!page) {
    return;
  }
  page.choices.splice(index, 1);
  renderChoices(page);
}

function deletePage(pageId) {
  const allPages = Object.keys(story.pages);
  if (allPages.length <= 1) {
    alert("Cannot delete the only page in the story.");
    return;
  }

  // Count pages that have a choice pointing here
  const incomingPages = Object.values(story.pages).filter((p) =>
    (p.choices || []).some((c) => String(c.target) === String(pageId))
  );

  const warningPart = incomingPages.length > 0
    ? ` ${incomingPages.length} other page(s) have choices pointing here and will become dangling.`
    : "";

  if (!confirm(`Delete page ${pageId}?${warningPart}`)) {
    return;
  }

  delete story.pages[pageId];

  // If the deleted page was the start, reassign to the lowest remaining page
  if (story.startPageId === String(pageId)) {
    story.startPageId = String(Math.min(...Object.keys(story.pages).map(Number)));
  }

  // Move selection to start page if deleted page was selected
  if (currentPageId === String(pageId)) {
    currentPageId = story.startPageId;
  }

  renderPages();
  renderCurrentPage();
}

async function saveStory() {
  if (mode === "edit") {
    updateCurrentPage();
  }
  const response = await fetch("/api/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(story),
  });
  if (response.ok) {
    await refreshGraph();
    await refreshStatus();
    alert("Story saved successfully.");
  } else {
    alert("Failed to save story.");
  }
}

async function refreshGraph() {
  const response = await fetch("/api/graph");
  const mermaidText = await response.text();
  if (!window.mermaid || !mermaid.render) {
    graphPreview.textContent = "Mermaid is not available.";
    return;
  }
  try {
    const renderId = `mermaid-${Date.now()}`;
    mermaid.render(renderId, mermaidText, (svgCode) => {
      graphPreview.innerHTML = svgCode;
    });
  } catch (error) {
    graphPreview.textContent = error.message;
  }
}

function renderStatus() {
  if (!storyStatus) {
    statusSummary.textContent = "Unable to load story status.";
    statusDetail.textContent = "";
    return;
  }

  statusSummary.innerHTML = `
    <div class="status-card">
      <span class="status-label">Pages</span>
      <strong>${storyStatus.page_count}</strong>
    </div>
    <div class="status-card">
      <span class="status-label">Start page</span>
      <strong>${storyStatus.start_page}</strong>
    </div>
    <div class="status-card">
      <span class="status-label">Terminal</span>
      <strong>${storyStatus.terminal_pages}</strong>
    </div>
    <div class="status-card">
      <span class="status-label">Branching</span>
      <strong>${storyStatus.branch_pages}</strong>
    </div>
  `;

  const details = [];
  if (storyStatus.orphan_pages > 0) {
    details.push(`<div class="status-note">Orphan pages: ${storyStatus.orphan_pages}</div>`);
  }
  if (storyStatus.empty_pages > 0) {
    details.push(`<div class="status-note">Empty pages: ${storyStatus.empty_pages}</div>`);
  }
  if (storyStatus.unreachable_pages > 0) {
    details.push(`<div class="status-note">Unreachable pages: ${storyStatus.unreachable_pages}</div>`);
  }
  if (details.length === 0) {
    details.push(`<div class="status-note">Story structure looks healthy.</div>`);
  }

  statusDetail.innerHTML = details.join("");
}

async function importCoT() {
  if (!confirm("Import the Cave of Time pages and replace the current story?")) {
    return;
  }
  const response = await fetch("/api/import");
  if (response.ok) {
    const result = await response.json();
    await fetchStory();
    alert(`Imported ${result.page_count} pages. Start page: ${result.start_page}.`);
  } else {
    alert("Import failed. Make sure the server is run from the repo root and the OCR pages exist.");
  }
}

function setMode(newMode) {
  if (mode === newMode) {
    return;
  }
  if (mode === "edit") {
    updateCurrentPage();
  }
  mode = newMode;
  editModeButton.classList.toggle("active", mode === "edit");
  readerModeButton.classList.toggle("active", mode === "reader");
  editorPane.classList.toggle("hidden", mode !== "edit");
  readerPane.classList.toggle("hidden", mode !== "reader");
  if (mode === "reader") {
    currentPageId = story.startPageId || currentPageId;
  }
  renderCurrentPage();
}

function resetReader() {
  currentPageId = story.startPageId || currentPageId;
  renderCurrentPage();
  renderPages();
}

function downloadStory() {
  if (mode === "edit") {
    updateCurrentPage();
  }
  const payload = JSON.stringify(story, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "authoring-story.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

async function generateVariants() {
  const response = await fetch("/api/generate");
  if (response.ok) {
    const result = await response.json();
    alert(`Generated ${result.story_count} story variants in ${result.output_dir}.`);
  } else {
    alert("Failed to generate story variants.");
  }
}

function handleUploadFile(event) {
  const file = uploadInput.files?.[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    try {
      const imported = JSON.parse(String(reader.result));
      const response = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(imported),
      });
      if (!response.ok) {
        throw new Error("Failed to save uploaded story.");
      }
      await fetchStory();
      alert("Story uploaded successfully.");
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    }
  });
  reader.readAsText(file, "utf-8");
}

function chooseDefaultPage() {
  if (!story) {
    return null;
  }
  return story.startPageId || Object.keys(story.pages)[0] || null;
}

pageSearchInput?.addEventListener("input", renderPages);
addPageButton.addEventListener("click", addPage);
addChoiceButton.addEventListener("click", addChoice);
importButton.addEventListener("click", importCoT);
saveButton.addEventListener("click", saveStory);
downloadButton.addEventListener("click", downloadStory);
generateButton.addEventListener("click", generateVariants);
uploadButton.addEventListener("click", () => uploadInput.click());
uploadInput.addEventListener("change", handleUploadFile);
editModeButton.addEventListener("click", () => setMode("edit"));
readerModeButton.addEventListener("click", () => setMode("reader"));
readerResetButton.addEventListener("click", resetReader);
pageTitleInput.addEventListener("input", () => {
  if (story && currentPageId && mode === "edit") {
    story.pages[currentPageId].title = pageTitleInput.value;
    renderPages();
  }
});

fetchStory();
