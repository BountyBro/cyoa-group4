const STORAGE_KEY = "cyoa-authoring-story";

const DEFAULT_STORY = {
  startPageId: "1",
  pages: {
    "1": {
      id: "1",
      title: "Start",
      text: "Write the opening of your story here. Add choices to branch the adventure.",
      choices: [
        {
          label: "Add a choice to begin",
          target: "2",
        },
      ],
    },
    "2": {
      id: "2",
      title: "Next Page",
      text: "Write the next page of the story.",
      choices: [],
    },
  },
};

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

function loadStoryFromLocalStorage() {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) {
      return null;
    }
    const data = JSON.parse(json);
    if (data && data.pages && typeof data.pages === "object") {
      return data;
    }
  } catch {
    return null;
  }
  return null;
}

function saveStoryToLocalStorage(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function fetchStory() {
  story = loadStoryFromLocalStorage() || JSON.parse(JSON.stringify(DEFAULT_STORY));
  currentPageId = story.startPageId || Object.keys(story.pages)[0];
  renderPages();
  renderCurrentPage();
  refreshGraph();
  refreshStatus();
}

function refreshStatus() {
  storyStatus = computeStoryStatus(story);
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

function saveStory() {
  if (mode === "edit") {
    updateCurrentPage();
  }
  saveStoryToLocalStorage(story);
  refreshGraph();
  refreshStatus();
  alert("Story saved locally in your browser.");
}

function refreshGraph() {
  const mermaidText = storyToMermaid(story);
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

function storyToMermaid(story) {
  const lines = ["flowchart LR"];
  for (const pageId of Object.keys(story.pages || {}).sort((a, b) => Number(a) - Number(b))) {
    const page = story.pages[pageId];
    const label = page.title ? `${page.id}: ${page.title}` : `Page ${page.id}`;
    lines.push(`${sanitizeId(page.id)}["${escapeMermaid(label)}"]`);
    for (const choice of page.choices || []) {
      if (choice.target && story.pages[choice.target]) {
        const choiceLabel = choice.label ? escapeMermaid(choice.label) : `Go to ${choice.target}`;
        lines.push(`${sanitizeId(page.id)} -->|${choiceLabel}| ${sanitizeId(choice.target)}`);
      }
    }
  }
  return lines.join("\n");
}

function sanitizeId(value) {
  return `page_${String(value).replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

function escapeMermaid(text) {
  return String(text).replace(/"/g, '\\"').replace(/\n/g, " ");
}

function computeStoryStatus(story) {
  const pages = story.pages || {};
  const parents = {};
  for (const pageId of Object.keys(pages)) {
    parents[pageId] = [];
  }
  for (const [pageId, page] of Object.entries(pages)) {
    for (const choice of page.choices || []) {
      const target = String(choice.target || "").trim();
      if (target && target in parents) {
        parents[target].push(pageId);
      }
    }
  }
  const startPage = chooseStartPage(story);
  const statusMap = {};
  let terminalPages = 0;
  let orphanPages = 0;
  let branchPages = 0;
  let emptyPages = 0;
  for (const [pageId, page] of Object.entries(pages)) {
    const text = String(page.text || "").trim();
    const outCount = (page.choices || []).filter((choice) => choice.target).length;
    const inCount = (parents[pageId] || []).length;
    const isTerminal = outCount === 0;
    const isOrphan = inCount === 0 && pageId !== startPage;
    const isBranch = outCount > 1;
    const isEmpty = text.length === 0;
    if (isTerminal) terminalPages += 1;
    if (isOrphan) orphanPages += 1;
    if (isBranch) branchPages += 1;
    if (isEmpty) emptyPages += 1;
    statusMap[pageId] = {
      incoming: inCount,
      outgoing: outCount,
      is_terminal: isTerminal,
      is_orphan: isOrphan,
      is_branch: isBranch,
      is_start: pageId === startPage,
      has_text: !isEmpty,
    };
  }
  const unreachablePages = Object.entries(statusMap).filter(([, stats]) => stats.incoming === 0 && !stats.is_start).length;
  return {
    total_pages: Object.keys(pages).length,
    start_page: startPage,
    page_count: Object.keys(pages).length,
    terminal_pages: terminalPages,
    orphan_pages: orphanPages,
    branch_pages: branchPages,
    empty_pages: emptyPages,
    unreachable_pages: unreachablePages,
    page_status: statusMap,
  };
}

function chooseStartPage(story) {
  const pages = story.pages || {};
  const startPage = story.startPageId;
  if (startPage && startPage in pages) {
    return startPage;
  }
  const keys = Object.keys(pages);
  if (keys.length > 0) {
    return keys.sort((a, b) => Number(a) - Number(b))[0];
  }
  return "1";
}

function generateStoryVariants(story, maxDecisions = 20) {
  const pages = story.pages || {};
  const startPage = chooseStartPage(story);
  const results = [];
  function dfs(path, decisionPoints) {
    const current = path[path.length - 1];
    const page = pages[current];
    if (!page) {
      results.push({ path: [...path], reason: "missing" });
      return;
    }
    const choices = (page.choices || []).filter((choice) => choice.target);
    if (choices.length === 0) {
      results.push({ path: [...path], reason: "end" });
      return;
    }
    const nextDecisionPoints = decisionPoints + (choices.length > 1 ? 1 : 0);
    if (nextDecisionPoints > maxDecisions) {
      results.push({ path: [...path], reason: "max-decisions" });
      return;
    }
    for (const choice of choices) {
      const target = String(choice.target);
      if (path.includes(target)) {
        results.push({ path: [...path, target], reason: "cycle" });
        continue;
      }
      dfs([...path, target], nextDecisionPoints);
    }
  }
  dfs([startPage], 0);
  return results.map(({ path, reason }) => ({ path, reason, text: renderPathText(path, story, reason) }));
}

function renderPathText(path, story, reason) {
  const pages = story.pages || {};
  const lines = ["Path: " + path.join(" -> "), ""];
  for (let idx = 0; idx < path.length; idx += 1) {
    const pageId = path[idx];
    const page = pages[pageId] || {};
    lines.push(`=== Step ${idx + 1}: Page ${pageId} ===`);
    lines.push(page.text || "[Missing page text]");
    lines.push("");
  }
  if (reason !== "end") {
    lines.push(`[Path terminated by: ${reason}]`);
    lines.push("");
  }
  return lines.join("\n").trim() + "\n";
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

function importCoT() {
  alert("Import from the server is disabled in static mode. Use Upload Story to load a story JSON file instead.");
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

function generateVariants() {
  if (mode === "edit") {
    updateCurrentPage();
  }
  const variants = generateStoryVariants(story);
  if (variants.length === 0) {
    alert("No variants were generated.");
    return;
  }
  downloadFile(JSON.stringify(variants, null, 2), "story-variants.json", "application/json");
  alert(`Generated ${variants.length} story variants and downloaded them as story-variants.json.`);
}

function handleUploadFile(event) {
  const file = uploadInput.files?.[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = JSON.parse(String(reader.result));
      story = imported;
      if (!story.startPageId) {
        story.startPageId = chooseStartPage(story);
      }
      saveStoryToLocalStorage(story);
      fetchStory();
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
