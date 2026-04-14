let story = null;
let currentPageId = null;

const pagesContainer = document.getElementById("pages");
const pageTitleInput = document.getElementById("page-title");
const pageTextInput = document.getElementById("page-text");
const choicesContainer = document.getElementById("choices");
const addPageButton = document.getElementById("add-page-button");
const addChoiceButton = document.getElementById("add-choice-button");
const importButton = document.getElementById("import-button");
const saveButton = document.getElementById("save-button");
const graphPreview = document.getElementById("graphPreview");

async function fetchStory() {
  const response = await fetch("/api/story");
  story = await response.json();
  currentPageId = story.startPageId;
  renderPages();
  selectPage(currentPageId);
  await refreshGraph();
}

function renderPages() {
  pagesContainer.innerHTML = "";
  const entries = Object.values(story.pages).sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
  for (const page of entries) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-item" + (page.id === currentPageId ? " selected" : "");
    button.textContent = `${page.id}: ${page.title || "Untitled"}`;
    button.addEventListener("click", () => selectPage(page.id));
    pagesContainer.appendChild(button);
  }
}

function selectPage(pageId) {
  currentPageId = pageId;
  renderPages();
  const page = story.pages[pageId];
  if (!page) {
    return;
  }

  pageTitleInput.value = page.title || "";
  pageTextInput.value = page.text || "";
  renderChoices(page);
}

function renderChoices(page) {
  choicesContainer.innerHTML = "";
  const choices = page.choices || [];
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
  updateCurrentPage();
  const nextId = String(Object.keys(story.pages).reduce((max, id) => Math.max(max, Number(id)), 0) + 1);
  story.pages[nextId] = {
    id: nextId,
    title: `Page ${nextId}`,
    text: "",
    choices: [],
  };
  renderPages();
  selectPage(nextId);
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

async function saveStory() {
  updateCurrentPage();
  const response = await fetch("/api/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(story),
  });
  if (response.ok) {
    alert("Story saved successfully.");
    await refreshGraph();
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

pagesContainer?.addEventListener("click", () => {
  // Page selection is handled by individual buttons.
});

choicesContainer?.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  const index = Number(target.dataset.index);
  const field = target.dataset.field;
  const page = story.pages[currentPageId];
  if (!page || Number.isNaN(index) || !field) {
    return;
  }
  page.choices[index][field] = target.value;
});

choicesContainer?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (target.dataset.action === "delete") {
    const index = Number(target.dataset.index);
    deleteChoice(index);
  }
});

async function importCoT() {
  if (!confirm("Load the Cave of Time as an example story? This will replace any unsaved changes.")) {
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

addPageButton.addEventListener("click", addPage);
addChoiceButton.addEventListener("click", addChoice);
importButton.addEventListener("click", importCoT);
saveButton.addEventListener("click", saveStory);
pageTitleInput.addEventListener("input", () => {
  if (story && currentPageId) {
    story.pages[currentPageId].title = pageTitleInput.value;
    renderPages();
  }
});

fetchStory();
