var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LogCalendarPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  logFolder: "LOG\u65E5\u5FD7\u8BB0\u5F55",
  todoFolder: "Todo",
  dateFormat: "YYYYMMDD",
  previewLines: 200,
  todoPanelMaxHeight: 300,
  completedAction: "keep",
  overdueAction: "highlight"
};
function buildDateRegex(fmt) {
  switch (fmt) {
    case "YYYY-MM-DD":
      return /^\*{0,2}(\d{4}-\d{2}-\d{2})\*{0,2}$/;
    case "YYYY/MM/DD":
      return /^\*{0,2}(\d{4}\/\d{2}\/\d{2})\*{0,2}$/;
    default:
      return /^\*{0,2}(\d{8})\*{0,2}$/;
  }
}
function normalizeDateStr(raw, fmt) {
  if (fmt === "YYYYMMDD")
    return raw;
  return raw.replace(/[-\/]/g, "");
}
function isValidDate(yyyymmdd) {
  if (yyyymmdd.length !== 8)
    return false;
  const y = parseInt(yyyymmdd.substring(0, 4));
  const m = parseInt(yyyymmdd.substring(4, 6));
  const d = parseInt(yyyymmdd.substring(6, 8));
  if (m < 1 || m > 12 || d < 1 || d > 31)
    return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
function todayStr() {
  const t = /* @__PURE__ */ new Date();
  return `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}`;
}
function parseLogEntries(content, fmt, maxLines) {
  const lines = content.split("\n").slice(0, maxLines);
  const entries = [];
  const dateRegex = buildDateRegex(fmt);
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(dateRegex);
    if (!match)
      continue;
    const normalized = normalizeDateStr(match[1], fmt);
    if (!isValidDate(normalized) || seen.has(normalized))
      continue;
    seen.add(normalized);
    let preview = "";
    for (let j = i + 1; j < lines.length && j < i + 8; j++) {
      const next = lines[j].trim();
      if (!next || next.match(dateRegex))
        break;
      const clean = next.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*+/g, "").replace(/#+\s*/g, "").replace(/^-\s*\[.\]\s*/, "").trim();
      if (clean.length > 0) {
        preview = clean.substring(0, 80) + (clean.length > 80 ? "..." : "");
        break;
      }
    }
    entries.push({ date: normalized, preview: preview || normalized, heading: match[1] });
  }
  return entries;
}
function getTodoFilePath(dateStr, settings) {
  const { todoFolder } = settings;
  return `${todoFolder}/${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}.md`;
}
function parseTodos(content, dateStr) {
  const lines = content.split("\n");
  const todos = [];
  const today = todayStr();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^- \[([ xX])\] (.+)$/);
    if (!m)
      continue;
    const checked = m[1].toLowerCase() === "x";
    let text = m[2].trim();
    let itemDate;
    const dateTagMatch = text.match(/@date:(\d{4}[-\/]?\d{2}[-\/]?\d{2})/) || text.match(/[📅🗓📆]\s*(\d{4}[-\/]?\d{2}[-\/]?\d{2})/) || text.match(/(?:^|\s)(\d{8})$/);
    if (dateTagMatch) {
      itemDate = dateTagMatch[1].replace(/[-\/]/g, "");
      text = text.replace(/@date:\S+/, "").replace(/[📅🗓📆]\s*\S+/, "").replace(/\s\d{8}$/, "").trim();
    }
    if (!itemDate)
      continue;
    if (itemDate !== dateStr)
      continue;
    const overdue = !checked && itemDate && itemDate < today;
    todos.push({ text, checked, lineIndex: i, date: itemDate, overdue: !!overdue });
  }
  return todos;
}
var LogCalendarView = class {
  // debounce flag
  constructor(app, plugin, containerEl) {
    __publicField(this, "app");
    __publicField(this, "plugin");
    __publicField(this, "containerEl");
    __publicField(this, "currentYear");
    __publicField(this, "currentMonth");
    __publicField(this, "selectedDate");
    __publicField(this, "dayMap");
    __publicField(this, "_clicking", false);
    this.app = app;
    this.plugin = plugin;
    this.containerEl = containerEl;
    const now = /* @__PURE__ */ new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.selectedDate = null;
    this.dayMap = /* @__PURE__ */ new Map();
  }
  async load() {
    this.showLoading();
    await this.buildDayMap();
    this.render();
  }
  showLoading() {
    this.containerEl.empty();
    this.containerEl.addClass("log-calendar-container");
    this.containerEl.createDiv({ cls: "log-cal-loading", text: "\u52A0\u8F7D\u4E2D..." });
    this.injectStyles();
  }
  async buildDayMap() {
    this.dayMap.clear();
    const folder = this.plugin.settings.logFolder;
    const folderExists = this.app.vault.getAbstractFileByPath(folder);
    if (!folderExists) {
      new import_obsidian.Notice(`\u26A0\uFE0F \u65E5\u5FD7\u6587\u4EF6\u5939\u300C${folder}\u300D\u4E0D\u5B58\u5728\uFF0C\u8BF7\u68C0\u67E5\u8BBE\u7F6E`);
      return;
    }
    const files = this.app.vault.getMarkdownFiles().filter(
      (f) => {
        var _a;
        return f.path.startsWith(folder + "/") || ((_a = f.parent) == null ? void 0 : _a.name) === folder;
      }
    );
    for (const file of files) {
      try {
        const content = await this.app.vault.read(file);
        const entries = parseLogEntries(content, this.plugin.settings.dateFormat, this.plugin.settings.previewLines);
        for (const entry of entries) {
          const existing = this.dayMap.get(entry.date) || [];
          existing.push({ ...entry, file });
          this.dayMap.set(entry.date, existing);
        }
      } catch (e) {
        console.warn(`Log Calendar: failed to read ${file.path}`, e);
      }
    }
  }
  render() {
    this.containerEl.empty();
    this.containerEl.addClass("log-calendar-container");
    this.renderCalendar();
    this.renderTodoPanel(this.selectedDate);
    this.injectStyles();
  }
  renderCalendar() {
    const header = this.containerEl.createDiv({ cls: "log-cal-header" });
    const prevBtn = header.createEl("button", { text: "\u25C0", cls: "log-cal-nav" });
    const title = header.createEl("span", { cls: "log-cal-title" });
    const nextBtn = header.createEl("button", { text: "\u25B6", cls: "log-cal-nav" });
    const refreshBtn = header.createEl("button", { text: "\u21BA", cls: "log-cal-nav log-cal-refresh", title: "\u5237\u65B0" });
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    title.setText(`${this.currentYear}  ${monthNames[this.currentMonth]}`);
    prevBtn.onclick = () => {
      this.currentMonth--;
      if (this.currentMonth < 0) {
        this.currentMonth = 11;
        this.currentYear--;
      }
      this.render();
    };
    nextBtn.onclick = () => {
      this.currentMonth++;
      if (this.currentMonth > 11) {
        this.currentMonth = 0;
        this.currentYear++;
      }
      this.render();
    };
    refreshBtn.onclick = async () => {
      this.showLoading();
      await this.buildDayMap();
      this.render();
      new import_obsidian.Notice("\u5DF2\u5237\u65B0");
    };
    const grid = this.containerEl.createDiv({ cls: "log-cal-grid" });
    for (const d of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      grid.createDiv({ cls: "log-cal-day-label", text: d });
    }
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0)
      startOffset = 6;
    for (let i = 0; i < startOffset; i++)
      grid.createDiv({ cls: "log-cal-cell empty" });
    const today = todayStr();
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${this.currentYear}${String(this.currentMonth + 1).padStart(2, "0")}${String(day).padStart(2, "0")}`;
      const cell = grid.createDiv({ cls: "log-cal-cell" });
      if (dateStr === today)
        cell.addClass("today");
      if (dateStr === this.selectedDate)
        cell.addClass("selected");
      cell.createDiv({ cls: "log-cal-day-num", text: String(day) });
      const entries = this.dayMap.get(dateStr);
      if (entries && entries.length > 0) {
        cell.addClass("has-entry");
        cell.createDiv({ cls: "log-cal-dot" });
        cell.createDiv({ cls: "log-cal-preview" }).setText(entries[0].preview);
      }
      cell.onclick = async () => {
        if (this._clicking)
          return;
        this._clicking = true;
        setTimeout(() => {
          this._clicking = false;
        }, 300);
        this.selectedDate = dateStr;
        this.containerEl.querySelectorAll(".log-cal-cell").forEach((c) => c.removeClass("selected"));
        cell.addClass("selected");
        const existingPanel = this.containerEl.querySelector(".log-todo-panel");
        if (existingPanel)
          existingPanel.remove();
        await this.renderTodoPanel(dateStr);
        if (entries && entries.length > 0) {
          const entry = entries[0];
          let targetLeaf = null;
          this.app.workspace.iterateAllLeaves((l) => {
            var _a;
            if (l.view instanceof import_obsidian.MarkdownView && ((_a = l.view.file) == null ? void 0 : _a.path) === entry.file.path) {
              targetLeaf = l;
            }
          });
          const leaf = targetLeaf || this.app.workspace.getLeaf("tab");
          try {
            if (!targetLeaf)
              await leaf.openFile(entry.file);
            this.app.workspace.setActiveLeaf(leaf, { focus: true });
            setTimeout(() => {
              const view = leaf.view;
              if (view instanceof import_obsidian.MarkdownView) {
                const editor = view.editor;
                const lines = editor.getValue().split("\n");
                for (let i = 0; i < lines.length; i++) {
                  if (lines[i].replace(/\*+/g, "").trim() === entry.heading) {
                    editor.setCursor({ line: i, ch: 0 });
                    editor.scrollIntoView({ from: { line: i, ch: 0 }, to: { line: i + 10, ch: 0 } }, true);
                    break;
                  }
                }
              }
            }, 300);
          } catch (e) {
            new import_obsidian.Notice("\u26A0\uFE0F \u65E0\u6CD5\u6253\u5F00\u7B14\u8BB0\u6587\u4EF6");
          }
        }
      };
    }
  }
  async renderTodoPanel(dateStr) {
    const { todoPanelMaxHeight, completedAction, overdueAction } = this.plugin.settings;
    const panel = this.containerEl.createDiv({ cls: "log-todo-panel" });
    const panelHeader = panel.createDiv({ cls: "log-todo-header" });
    if (dateStr) {
      const label = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
      panelHeader.createEl("span", { cls: "log-todo-title", text: label });
    } else {
      panelHeader.createEl("span", { cls: "log-todo-title", text: "Tasks" });
    }
    const addBtn = panelHeader.createEl("button", { text: "+ Task", cls: "log-cal-nav log-todo-add-btn" });
    if (!dateStr) {
      addBtn.disabled = true;
      panel.createDiv({ cls: "log-todo-empty", text: "\u70B9\u51FB\u65E5\u671F\u67E5\u770B\u6216\u6DFB\u52A0\u4EFB\u52A1" });
      return;
    }
    const filePath = getTodoFilePath(dateStr, this.plugin.settings);
    let todos = [];
    try {
      const todoFile = this.app.vault.getAbstractFileByPath(filePath);
      if (todoFile instanceof import_obsidian.TFile) {
        const content = await this.app.vault.read(todoFile);
        todos = parseTodos(content, dateStr);
      }
    } catch (e) {
      new import_obsidian.Notice("\u26A0\uFE0F \u4EFB\u52A1\u6587\u4EF6\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5");
      return;
    }
    const todayD = todayStr();
    if (overdueAction === "rollover" && dateStr === todayD) {
      try {
        const allTodoFile = this.app.vault.getAbstractFileByPath(filePath);
        if (allTodoFile instanceof import_obsidian.TFile) {
          const allContent = await this.app.vault.read(allTodoFile);
          const allLines = allContent.split("\n");
          for (let i = 0; i < allLines.length; i++) {
            const m = allLines[i].match(/^- \[([ ])\] (.+)$/);
            if (!m)
              continue;
            let text = m[2].trim();
            const dtMatch = text.match(/@date:(\d{4}[-\/]?\d{2}[-\/]?\d{2})/);
            if (!dtMatch)
              continue;
            const itemDate = dtMatch[1].replace(/[-\/]/g, "");
            if (itemDate >= todayD)
              continue;
            text = text.replace(/@date:\S+/, "").trim();
            if (!todos.find((t) => t.text === text && t.date === itemDate)) {
              const overdueLabel = "\u23F0 " + text + " (" + itemDate.substring(0, 4) + "-" + itemDate.substring(4, 6) + "-" + itemDate.substring(6, 8) + ")";
              todos.push({ text: overdueLabel, checked: false, lineIndex: i, date: itemDate, overdue: true });
            }
          }
        }
      } catch (e) {
      }
    }
    const listWrap = panel.createDiv({ cls: "log-todo-list-wrap" });
    listWrap.style.maxHeight = `${todoPanelMaxHeight}px`;
    const list = listWrap.createDiv({ cls: "log-todo-list" });
    if (todos.length === 0) {
      list.createDiv({ cls: "log-todo-empty", text: "\u6682\u65E0\u4EFB\u52A1" });
    } else {
      const incomplete = todos.filter((t) => !t.checked);
      const completed = todos.filter((t) => t.checked);
      for (const todo of [...incomplete, ...completed]) {
        this.renderTodoItem(list, todo, filePath, dateStr);
      }
    }
    const addRow = panel.createDiv({ cls: "log-todo-add-row log-todo-hidden" });
    const input = addRow.createEl("input", { type: "text", cls: "log-todo-input", placeholder: "\u65B0\u4EFB\u52A1..." });
    const confirmBtn = addRow.createEl("button", { text: "\u2713", cls: "log-cal-nav" });
    const cancelBtn = addRow.createEl("button", { text: "\u2715", cls: "log-cal-nav" });
    addBtn.onclick = () => {
      addRow.removeClass("log-todo-hidden");
      input.focus();
    };
    cancelBtn.onclick = () => {
      addRow.addClass("log-todo-hidden");
      input.value = "";
    };
    const doAdd = async () => {
      const raw = input.value.trim();
      if (!raw)
        return;
      const safe = raw.replace(/([[\]*_`])/g, "\\$1");
      await this.addTodoItem(filePath, safe, dateStr);
      input.value = "";
      addRow.addClass("log-todo-hidden");
      const existing = this.containerEl.querySelector(".log-todo-panel");
      if (existing)
        existing.remove();
      await this.renderTodoPanel(dateStr);
    };
    confirmBtn.onclick = doAdd;
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter")
        await doAdd();
      if (e.key === "Escape")
        cancelBtn.onclick(new MouseEvent("click"));
    });
  }
  renderTodoItem(container, todo, filePath, dateStr) {
    const { completedAction, overdueAction } = this.plugin.settings;
    const item = container.createDiv({ cls: "log-todo-item" + (todo.checked ? " checked" : "") + (todo.overdue && overdueAction === "highlight" ? " overdue" : "") });
    const checkbox = item.createEl("input", { type: "checkbox", cls: "log-todo-checkbox" });
    checkbox.checked = todo.checked;
    item.createEl("span", { cls: "log-todo-text", text: todo.text });
    checkbox.onchange = async () => {
      try {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof import_obsidian.TFile)) {
          new import_obsidian.Notice("\u26A0\uFE0F \u4EFB\u52A1\u6587\u4EF6\u4E0D\u5B58\u5728");
          checkbox.checked = !checkbox.checked;
          return;
        }
        const content = await this.app.vault.read(file);
        const lines = content.split("\n");
        if (todo.lineIndex >= lines.length) {
          new import_obsidian.Notice("\u26A0\uFE0F \u4EFB\u52A1\u884C\u5DF2\u6539\u53D8\uFF0C\u8BF7\u5237\u65B0");
          return;
        }
        if (checkbox.checked) {
          if (completedAction === "delete") {
            lines.splice(todo.lineIndex, 1);
          } else if (completedAction === "archive") {
            const doneLine = lines[todo.lineIndex].replace("- [ ]", "- [x]");
            lines.splice(todo.lineIndex, 1);
            const doneIdx = lines.findIndex((l) => l.trim() === "<!-- done -->");
            if (doneIdx >= 0)
              lines.splice(doneIdx + 1, 0, doneLine);
            else
              lines.push("", "<!-- done -->", doneLine);
          } else {
            lines[todo.lineIndex] = lines[todo.lineIndex].replace("- [ ]", "- [x]");
          }
        } else {
          lines[todo.lineIndex] = lines[todo.lineIndex].replace(/- \[[xX]\]/, "- [ ]");
        }
        await this.app.vault.modify(file, lines.join("\n"));
        if (completedAction === "delete" || completedAction === "archive") {
          const existing = this.containerEl.querySelector(".log-todo-panel");
          if (existing)
            existing.remove();
          await this.renderTodoPanel(dateStr);
        } else {
          item.toggleClass("checked", checkbox.checked);
        }
      } catch (e) {
        new import_obsidian.Notice("\u26A0\uFE0F \u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5");
        checkbox.checked = !checkbox.checked;
      }
    };
  }
  async addTodoItem(filePath, text, dateStr) {
    const { dateFormat } = this.plugin.settings;
    const newLine = `- [ ] ${text} @date:${dateStr}`;
    try {
      const existing = this.app.vault.getAbstractFileByPath(filePath);
      if (existing instanceof import_obsidian.TFile) {
        const content = await this.app.vault.read(existing);
        const lines = content.split("\n");
        const doneIdx = lines.findIndex((l) => l.trim() === "<!-- done -->");
        if (doneIdx >= 0) {
          lines.splice(doneIdx, 0, newLine);
        } else {
          lines.push(newLine);
        }
        await this.app.vault.modify(existing, lines.join("\n"));
      } else {
        const folder = this.plugin.settings.todoFolder;
        if (!this.app.vault.getAbstractFileByPath(folder)) {
          await this.app.vault.createFolder(folder);
        }
        await this.app.vault.create(filePath, newLine + "\n");
      }
    } catch (e) {
      new import_obsidian.Notice("\u26A0\uFE0F \u65E0\u6CD5\u521B\u5EFA\u4EFB\u52A1\u6587\u4EF6\uFF0C\u8BF7\u68C0\u67E5\u6743\u9650");
    }
  }
  injectStyles() {
    const styleId = "log-calendar-styles";
    const existing = document.getElementById(styleId);
    if (existing)
      existing.remove();
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .log-calendar-container { padding: 12px; font-family: var(--font-interface); }
      .log-cal-loading { text-align: center; color: var(--text-muted); padding: 24px 0; font-size: 0.9em; }
      .log-cal-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
      .log-cal-title { font-size: 1.1em; font-weight: 600; flex: 1; text-align: center; }
      .log-cal-nav { background: var(--interactive-normal); border: 1px solid var(--background-modifier-border); border-radius: 4px; cursor: pointer; padding: 2px 8px; color: var(--text-normal); font-size: 0.9em; }
      .log-cal-nav:hover { background: var(--interactive-hover); }
      .log-cal-nav:disabled { opacity: 0.4; cursor: default; }
      .log-cal-refresh { font-size: 1.1em; font-weight: bold; }
      .log-cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
      .log-cal-day-label { text-align: center; font-size: 0.72em; color: var(--text-muted); padding: 4px 0; font-weight: 600; overflow: hidden; white-space: nowrap; }
      .log-cal-cell { height: 64px; box-sizing: border-box; border-radius: 6px; padding: 4px; position: relative; border: 1px solid transparent; transition: background 0.15s; overflow: hidden; min-width: 0; cursor: pointer; }
      .log-cal-cell.empty { background: none !important; border: none !important; cursor: default; pointer-events: none; }
      .log-cal-cell:not(.empty) { background: var(--background-secondary); border: 1px solid var(--background-modifier-border-hover) !important; }
      .log-cal-cell:not(.empty):hover { background: var(--interactive-hover); }
      .log-cal-cell.today { border-color: var(--color-accent) !important; }
      .log-cal-cell.selected { border-color: var(--color-accent) !important; background: var(--interactive-hover) !important; }
      .log-cal-cell.has-entry { background: var(--background-secondary-alt); }
      .log-cal-day-num { font-size: 0.8em; color: var(--text-muted); }
      .log-cal-cell.today .log-cal-day-num, .log-cal-cell.selected .log-cal-day-num { color: var(--color-accent); font-weight: 700; }
      .log-cal-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-accent); margin: 2px auto 2px; }
      .log-cal-preview { font-size: 0.68em; color: var(--text-normal); line-height: 1.3; overflow: hidden; word-break: break-all; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
      .log-todo-panel { margin-top: 14px; border-top: 1px solid var(--background-modifier-border); padding-top: 12px; }
      .log-todo-header { display: flex; align-items: center; margin-bottom: 10px; }
      .log-todo-title { font-size: 0.9em; font-weight: 600; flex: 1; color: var(--text-normal); }
      .log-todo-add-btn { font-size: 0.78em; padding: 2px 8px; }
      .log-todo-list-wrap { overflow-y: auto; }
      .log-todo-list { display: flex; flex-direction: column; gap: 6px; }
      .log-todo-item { display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px; border-radius: 6px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border-hover); transition: background 0.15s; }
      .log-todo-item:hover { background: var(--interactive-hover); }
      .log-todo-item.checked .log-todo-text { text-decoration: line-through; color: var(--text-muted); }
      .log-todo-item.overdue { border-color: var(--color-red) !important; }
      .log-todo-item.overdue .log-todo-text { color: var(--color-red); }
      .log-todo-checkbox { margin-top: 2px; cursor: pointer; accent-color: var(--color-accent); flex-shrink: 0; }
      .log-todo-text { font-size: 0.85em; color: var(--text-normal); line-height: 1.4; word-break: break-word; }
      .log-todo-empty { font-size: 0.82em; color: var(--text-muted); text-align: center; padding: 16px 0; }
      .log-todo-add-row { display: flex; gap: 6px; margin-top: 8px; align-items: center; }
      .log-todo-add-row.log-todo-hidden { display: none; }
      .log-todo-input { flex: 1; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 8px; font-size: 0.85em; color: var(--text-normal); outline: none; }
      .log-todo-input:focus { border-color: var(--color-accent); }
    `;
    document.head.appendChild(style);
  }
};
var LogCalendarPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "settings");
    __publicField(this, "calendarView", null);
  }
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("calendar-days", "\u65E5\u5FD7\u65E5\u5386", () => {
      this.openCalendarPanel();
    });
    this.addCommand({ id: "open-log-calendar", name: "\u6253\u5F00\u65E5\u5FD7\u65E5\u5386", callback: () => this.openCalendarPanel() });
    this.addSettingTab(new LogCalendarSettingTab(this.app, this));
  }
  async openCalendarPanel() {
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf)
      return;
    await leaf.setViewState({ type: "empty" });
    leaf.view.containerEl.empty();
    leaf.view.containerEl.style.overflow = "auto";
    this.calendarView = new LogCalendarView(this.app, this, leaf.view.containerEl);
    await this.calendarView.load();
    this.app.workspace.revealLeaf(leaf);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var LogCalendarSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "\u65E5\u5FD7\u65E5\u5386 \xB7 \u8BBE\u7F6E" });
    containerEl.createEl("h3", { text: "\u{1F4D3} \u65E5\u5FD7\u8BBE\u7F6E" });
    new import_obsidian.Setting(containerEl).setName("\u65E5\u5FD7\u6587\u4EF6\u5939").setDesc("\u5B58\u653E\u65E5\u5FD7\u7B14\u8BB0\u7684\u6587\u4EF6\u5939\u540D\u79F0").addText((t) => t.setPlaceholder("LOG\u65E5\u5FD7\u8BB0\u5F55").setValue(this.plugin.settings.logFolder).onChange(async (v) => {
      this.plugin.settings.logFolder = v;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u65E5\u671F\u6807\u9898\u683C\u5F0F").setDesc("\u65E5\u5FD7\u91CC\u6BCF\u5929\u6BB5\u843D\u7684\u6807\u9898\u683C\u5F0F").addDropdown((d) => d.addOption("YYYYMMDD", "20260501\uFF08\u9ED8\u8BA4\uFF09").addOption("YYYY-MM-DD", "2026-05-01").addOption("YYYY/MM/DD", "2026/05/01").setValue(this.plugin.settings.dateFormat).onChange(async (v) => {
      this.plugin.settings.dateFormat = v;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u9884\u89C8\u8BFB\u53D6\u884C\u6570\u4E0A\u9650").setDesc("\u6BCF\u7BC7\u65E5\u5FD7\u6700\u591A\u626B\u63CF\u591A\u5C11\u884C\uFF08\u6570\u5B57\u8D8A\u5927\u8D8A\u6162\uFF0C\u5EFA\u8BAE 100\u2013500\uFF09").addSlider((s) => s.setLimits(50, 1e3, 50).setValue(this.plugin.settings.previewLines).setDynamicTooltip().onChange(async (v) => {
      this.plugin.settings.previewLines = v;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "\u2705 Todo \u8BBE\u7F6E" });
    new import_obsidian.Setting(containerEl).setName("Todo \u6587\u4EF6\u5939").setDesc("\u5B58\u653E\u4EFB\u52A1\u6587\u4EF6\u7684\u6587\u4EF6\u5939\u540D\u79F0\uFF08\u6BCF\u6708\u81EA\u52A8\u521B\u5EFA\u4E00\u4E2A\u6587\u4EF6\uFF0C\u5982 2026-05.md\uFF09").addText((t) => t.setPlaceholder("Todo").setValue(this.plugin.settings.todoFolder).onChange(async (v) => {
      this.plugin.settings.todoFolder = v;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u5B8C\u6210\u4EFB\u52A1\u540E\u7684\u5904\u7406").setDesc("\u4FDD\u7559\u5E76\u5212\u7EBF / \u76F4\u63A5\u5220\u9664 / \u79FB\u5230\u6587\u4EF6\u5E95\u90E8\u5F52\u6863\u533A").addDropdown((d) => d.addOption("keep", "\u4FDD\u7559\u5E76\u663E\u793A\u5220\u9664\u7EBF").addOption("delete", "\u76F4\u63A5\u5220\u9664").addOption("archive", "\u5F52\u6863\u5230\u6587\u4EF6\u5E95\u90E8").setValue(this.plugin.settings.completedAction).onChange(async (v) => {
      this.plugin.settings.completedAction = v;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u8FC7\u671F\u672A\u5B8C\u6210\u4EFB\u52A1").setDesc("\u622A\u6B62\u65E5\u671F\u5DF2\u8FC7\u4F46\u672A\u5B8C\u6210\u7684\u4EFB\u52A1\u5982\u4F55\u5904\u7406").addDropdown((d) => d.addOption("highlight", "\u7EA2\u8272\u9AD8\u4EAE\u63D0\u793A").addOption("keep", "\u6B63\u5E38\u663E\u793A\uFF0C\u4E0D\u63D0\u793A").addOption("rollover", "\u81EA\u52A8\u987A\u5EF6\u5230\u4ECA\u5929\u663E\u793A").setValue(this.plugin.settings.overdueAction).onChange(async (v) => {
      this.plugin.settings.overdueAction = v;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Todo \u9762\u677F\u6700\u5927\u9AD8\u5EA6\uFF08px\uFF09").setDesc("\u8D85\u51FA\u540E\u663E\u793A\u6EDA\u52A8\u6761\uFF0C\u5EFA\u8BAE 200\u2013500").addSlider((s) => s.setLimits(100, 600, 50).setValue(this.plugin.settings.todoPanelMaxHeight).setDynamicTooltip().onChange(async (v) => {
      this.plugin.settings.todoPanelMaxHeight = v;
      await this.plugin.saveSettings();
    }));
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IEFwcCwgUGx1Z2luLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nLCBURmlsZSwgTWFya2Rvd25WaWV3LCBOb3RpY2UgfSBmcm9tICdvYnNpZGlhbic7XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUeXBlcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxudHlwZSBEYXRlRm9ybWF0ID0gJ1lZWVlNTUREJyB8ICdZWVlZLU1NLUREJyB8ICdZWVlZL01NL0REJztcbi8vIFN0b3JhZ2UgaXMgZml4ZWQgdG8gbW9udGhseSAob25lIGZpbGUgcGVyIG1vbnRoKVxudHlwZSBDb21wbGV0ZWRBY3Rpb24gPSAna2VlcCcgfCAnZGVsZXRlJyB8ICdhcmNoaXZlJztcbnR5cGUgT3ZlcmR1ZUFjdGlvbiA9ICdrZWVwJyB8ICdoaWdobGlnaHQnIHwgJ3JvbGxvdmVyJztcblxuaW50ZXJmYWNlIExvZ0NhbGVuZGFyU2V0dGluZ3Mge1xuICBsb2dGb2xkZXI6IHN0cmluZztcbiAgdG9kb0ZvbGRlcjogc3RyaW5nO1xuICBkYXRlRm9ybWF0OiBEYXRlRm9ybWF0O1xuICBwcmV2aWV3TGluZXM6IG51bWJlcjtcbiAgdG9kb1BhbmVsTWF4SGVpZ2h0OiBudW1iZXI7XG4gIGNvbXBsZXRlZEFjdGlvbjogQ29tcGxldGVkQWN0aW9uO1xuICBvdmVyZHVlQWN0aW9uOiBPdmVyZHVlQWN0aW9uO1xufVxuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBMb2dDYWxlbmRhclNldHRpbmdzID0ge1xuICBsb2dGb2xkZXI6ICdMT0dcdTY1RTVcdTVGRDdcdThCQjBcdTVGNTUnLFxuICB0b2RvRm9sZGVyOiAnVG9kbycsXG4gIGRhdGVGb3JtYXQ6ICdZWVlZTU1ERCcsXG4gIHByZXZpZXdMaW5lczogMjAwLFxuICB0b2RvUGFuZWxNYXhIZWlnaHQ6IDMwMCxcbiAgY29tcGxldGVkQWN0aW9uOiAna2VlcCcsXG4gIG92ZXJkdWVBY3Rpb246ICdoaWdobGlnaHQnLFxufTtcblxuaW50ZXJmYWNlIFRvZG9JdGVtIHtcbiAgdGV4dDogc3RyaW5nO1xuICBjaGVja2VkOiBib29sZWFuO1xuICBsaW5lSW5kZXg6IG51bWJlcjtcbiAgZGF0ZT86IHN0cmluZzsgLy8gWVlZWU1NREQsIHVzZWQgaW4gc2luZ2xlLWZpbGUgbW9kZVxuICBvdmVyZHVlPzogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIExvZ0VudHJ5IHtcbiAgZGF0ZTogc3RyaW5nOyAvLyBZWVlZTU1ERFxuICBwcmV2aWV3OiBzdHJpbmc7XG4gIGhlYWRpbmc6IHN0cmluZztcbiAgZmlsZTogVEZpbGU7XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBIZWxwZXJzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBidWlsZERhdGVSZWdleChmbXQ6IERhdGVGb3JtYXQpOiBSZWdFeHAge1xuICBzd2l0Y2ggKGZtdCkge1xuICAgIGNhc2UgJ1lZWVktTU0tREQnOiByZXR1cm4gL15cXCp7MCwyfShcXGR7NH0tXFxkezJ9LVxcZHsyfSlcXCp7MCwyfSQvO1xuICAgIGNhc2UgJ1lZWVkvTU0vREQnOiByZXR1cm4gL15cXCp7MCwyfShcXGR7NH1cXC9cXGR7Mn1cXC9cXGR7Mn0pXFwqezAsMn0kLztcbiAgICBkZWZhdWx0OiAgICAgICAgICAgcmV0dXJuIC9eXFwqezAsMn0oXFxkezh9KVxcKnswLDJ9JC87XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplRGF0ZVN0cihyYXc6IHN0cmluZywgZm10OiBEYXRlRm9ybWF0KTogc3RyaW5nIHtcbiAgLy8gQWx3YXlzIHJldHVybiBZWVlZTU1ERFxuICBpZiAoZm10ID09PSAnWVlZWU1NREQnKSByZXR1cm4gcmF3O1xuICByZXR1cm4gcmF3LnJlcGxhY2UoL1stXFwvXS9nLCAnJyk7XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWREYXRlKHl5eXltbWRkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgaWYgKHl5eXltbWRkLmxlbmd0aCAhPT0gOCkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCB5ID0gcGFyc2VJbnQoeXl5eW1tZGQuc3Vic3RyaW5nKDAsIDQpKTtcbiAgY29uc3QgbSA9IHBhcnNlSW50KHl5eXltbWRkLnN1YnN0cmluZyg0LCA2KSk7XG4gIGNvbnN0IGQgPSBwYXJzZUludCh5eXl5bW1kZC5zdWJzdHJpbmcoNiwgOCkpO1xuICBpZiAobSA8IDEgfHwgbSA+IDEyIHx8IGQgPCAxIHx8IGQgPiAzMSkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoeSwgbSAtIDEsIGQpO1xuICByZXR1cm4gZGF0ZS5nZXRGdWxsWWVhcigpID09PSB5ICYmIGRhdGUuZ2V0TW9udGgoKSA9PT0gbSAtIDEgJiYgZGF0ZS5nZXREYXRlKCkgPT09IGQ7XG59XG5cbmZ1bmN0aW9uIHRvZGF5U3RyKCk6IHN0cmluZyB7XG4gIGNvbnN0IHQgPSBuZXcgRGF0ZSgpO1xuICByZXR1cm4gYCR7dC5nZXRGdWxsWWVhcigpfSR7U3RyaW5nKHQuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCcwJyl9JHtTdHJpbmcodC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsJzAnKX1gO1xufVxuXG5mdW5jdGlvbiBmb3JtYXREYXRlRm9yRmlsZSh5eXl5bW1kZDogc3RyaW5nLCBmbXQ6IERhdGVGb3JtYXQpOiBzdHJpbmcge1xuICBjb25zdCB5ID0geXl5eW1tZGQuc3Vic3RyaW5nKDAsIDQpO1xuICBjb25zdCBtID0geXl5eW1tZGQuc3Vic3RyaW5nKDQsIDYpO1xuICBjb25zdCBkID0geXl5eW1tZGQuc3Vic3RyaW5nKDYsIDgpO1xuICBzd2l0Y2ggKGZtdCkge1xuICAgIGNhc2UgJ1lZWVktTU0tREQnOiByZXR1cm4gYCR7eX0tJHttfS0ke2R9YDtcbiAgICBjYXNlICdZWVlZL01NL0REJzogcmV0dXJuIGAke3l9LyR7bX0vJHtkfWA7XG4gICAgZGVmYXVsdDogcmV0dXJuIHl5eXltbWRkO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlTG9nRW50cmllcyhjb250ZW50OiBzdHJpbmcsIGZtdDogRGF0ZUZvcm1hdCwgbWF4TGluZXM6IG51bWJlcik6IExvZ0VudHJ5W10ge1xuICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpLnNsaWNlKDAsIG1heExpbmVzKTtcbiAgY29uc3QgZW50cmllczogT21pdDxMb2dFbnRyeSwgJ2ZpbGUnPltdID0gW107XG4gIGNvbnN0IGRhdGVSZWdleCA9IGJ1aWxkRGF0ZVJlZ2V4KGZtdCk7XG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcbiAgICBjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2goZGF0ZVJlZ2V4KTtcbiAgICBpZiAoIW1hdGNoKSBjb250aW51ZTtcbiAgICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplRGF0ZVN0cihtYXRjaFsxXSwgZm10KTtcbiAgICBpZiAoIWlzVmFsaWREYXRlKG5vcm1hbGl6ZWQpIHx8IHNlZW4uaGFzKG5vcm1hbGl6ZWQpKSBjb250aW51ZTtcbiAgICBzZWVuLmFkZChub3JtYWxpemVkKTtcblxuICAgIGxldCBwcmV2aWV3ID0gJyc7XG4gICAgZm9yIChsZXQgaiA9IGkgKyAxOyBqIDwgbGluZXMubGVuZ3RoICYmIGogPCBpICsgODsgaisrKSB7XG4gICAgICBjb25zdCBuZXh0ID0gbGluZXNbal0udHJpbSgpO1xuICAgICAgaWYgKCFuZXh0IHx8IG5leHQubWF0Y2goZGF0ZVJlZ2V4KSkgYnJlYWs7XG4gICAgICBjb25zdCBjbGVhbiA9IG5leHRcbiAgICAgICAgLnJlcGxhY2UoL1xcWyhbXlxcXV0rKVxcXVxcKFteKV0rXFwpL2csICckMScpXG4gICAgICAgIC5yZXBsYWNlKC9cXCorL2csICcnKVxuICAgICAgICAucmVwbGFjZSgvIytcXHMqL2csICcnKVxuICAgICAgICAucmVwbGFjZSgvXi1cXHMqXFxbLlxcXVxccyovLCAnJylcbiAgICAgICAgLnRyaW0oKTtcbiAgICAgIGlmIChjbGVhbi5sZW5ndGggPiAwKSB7XG4gICAgICAgIHByZXZpZXcgPSBjbGVhbi5zdWJzdHJpbmcoMCwgODApICsgKGNsZWFuLmxlbmd0aCA+IDgwID8gJy4uLicgOiAnJyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBlbnRyaWVzLnB1c2goeyBkYXRlOiBub3JtYWxpemVkLCBwcmV2aWV3OiBwcmV2aWV3IHx8IG5vcm1hbGl6ZWQsIGhlYWRpbmc6IG1hdGNoWzFdIH0pO1xuICB9XG4gIHJldHVybiBlbnRyaWVzIGFzIExvZ0VudHJ5W107XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUb2RvIGZpbGUgcGF0aCBoZWxwZXJzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBnZXRUb2RvRmlsZVBhdGgoZGF0ZVN0cjogc3RyaW5nLCBzZXR0aW5nczogTG9nQ2FsZW5kYXJTZXR0aW5ncyk6IHN0cmluZyB7XG4gIGNvbnN0IHsgdG9kb0ZvbGRlciB9ID0gc2V0dGluZ3M7XG4gIC8vIE9uZSBmaWxlIHBlciBtb250aDogVG9kby8yMDI2LTA1Lm1kXG4gIHJldHVybiBgJHt0b2RvRm9sZGVyfS8ke2RhdGVTdHIuc3Vic3RyaW5nKDAsNCl9LSR7ZGF0ZVN0ci5zdWJzdHJpbmcoNCw2KX0ubWRgO1xufVxuXG4vLyBQYXJzZSB0b2RvcyBmcm9tIGNvbnRlbnQ7IGZvciBzaW5nbGUvbW9udGhseSBtb2RlLCBmaWx0ZXIgYnkgZGF0ZSB0YWdcbmZ1bmN0aW9uIHBhcnNlVG9kb3MoY29udGVudDogc3RyaW5nLCBkYXRlU3RyOiBzdHJpbmcpOiBUb2RvSXRlbVtdIHtcbiAgY29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KCdcXG4nKTtcbiAgY29uc3QgdG9kb3M6IFRvZG9JdGVtW10gPSBbXTtcbiAgY29uc3QgdG9kYXkgPSB0b2RheVN0cigpO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBtID0gbGluZXNbaV0ubWF0Y2goL14tIFxcWyhbIHhYXSlcXF0gKC4rKSQvKTtcbiAgICBpZiAoIW0pIGNvbnRpbnVlO1xuICAgIGNvbnN0IGNoZWNrZWQgPSBtWzFdLnRvTG93ZXJDYXNlKCkgPT09ICd4JztcbiAgICBsZXQgdGV4dCA9IG1bMl0udHJpbSgpO1xuICAgIGxldCBpdGVtRGF0ZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gICAgLy8gRXh0cmFjdCBkYXRlIHRhZzogQGRhdGU6WVlZWU1NREQgKHByaW1hcnkpIG9yIHBsYWluIFlZWVlNTUREIGF0IGVuZCAobGVnYWN5IGZhbGxiYWNrKVxuICAgIGNvbnN0IGRhdGVUYWdNYXRjaCA9IHRleHQubWF0Y2goL0BkYXRlOihcXGR7NH1bLVxcL10/XFxkezJ9Wy1cXC9dP1xcZHsyfSkvKVxuICAgICAgfHwgdGV4dC5tYXRjaCgvW1x1RDgzRFx1RENDNVx1RDgzRFx1REREM1x1RDgzRFx1RENDNl1cXHMqKFxcZHs0fVstXFwvXT9cXGR7Mn1bLVxcL10/XFxkezJ9KS8pXG4gICAgICB8fCB0ZXh0Lm1hdGNoKC8oPzpefFxccykoXFxkezh9KSQvKTtcbiAgICBpZiAoZGF0ZVRhZ01hdGNoKSB7XG4gICAgICBpdGVtRGF0ZSA9IGRhdGVUYWdNYXRjaFsxXS5yZXBsYWNlKC9bLVxcL10vZywgJycpO1xuICAgICAgdGV4dCA9IHRleHQucmVwbGFjZSgvQGRhdGU6XFxTKy8sICcnKS5yZXBsYWNlKC9bXHVEODNEXHVEQ0M1XHVEODNEXHVEREQzXHVEODNEXHVEQ0M2XVxccypcXFMrLywgJycpLnJlcGxhY2UoL1xcc1xcZHs4fSQvLCAnJykudHJpbSgpO1xuICAgIH1cblxuICAgIC8vIE1vbnRobHkgbW9kZTogb25seSBzaG93IGl0ZW1zIG1hdGNoaW5nIHRoaXMgZGF0ZVxuICAgIGlmICghaXRlbURhdGUpIGNvbnRpbnVlO1xuICAgIGlmIChpdGVtRGF0ZSAhPT0gZGF0ZVN0cikgY29udGludWU7XG5cbiAgICBjb25zdCBvdmVyZHVlID0gIWNoZWNrZWQgJiYgaXRlbURhdGUgJiYgaXRlbURhdGUgPCB0b2RheTtcbiAgICB0b2Rvcy5wdXNoKHsgdGV4dCwgY2hlY2tlZCwgbGluZUluZGV4OiBpLCBkYXRlOiBpdGVtRGF0ZSwgb3ZlcmR1ZTogISFvdmVyZHVlIH0pO1xuICB9XG4gIHJldHVybiB0b2Rvcztcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFZpZXcgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmNsYXNzIExvZ0NhbGVuZGFyVmlldyB7XG4gIGFwcDogQXBwO1xuICBwbHVnaW46IExvZ0NhbGVuZGFyUGx1Z2luO1xuICBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XG4gIGN1cnJlbnRZZWFyOiBudW1iZXI7XG4gIGN1cnJlbnRNb250aDogbnVtYmVyO1xuICBzZWxlY3RlZERhdGU6IHN0cmluZyB8IG51bGw7XG4gIGRheU1hcDogTWFwPHN0cmluZywgTG9nRW50cnlbXT47XG4gIHByaXZhdGUgX2NsaWNraW5nID0gZmFsc2U7IC8vIGRlYm91bmNlIGZsYWdcblxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBMb2dDYWxlbmRhclBsdWdpbiwgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KSB7XG4gICAgdGhpcy5hcHAgPSBhcHA7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgdGhpcy5jb250YWluZXJFbCA9IGNvbnRhaW5lckVsO1xuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgdGhpcy5jdXJyZW50WWVhciA9IG5vdy5nZXRGdWxsWWVhcigpO1xuICAgIHRoaXMuY3VycmVudE1vbnRoID0gbm93LmdldE1vbnRoKCk7XG4gICAgdGhpcy5zZWxlY3RlZERhdGUgPSBudWxsO1xuICAgIHRoaXMuZGF5TWFwID0gbmV3IE1hcCgpO1xuICB9XG5cbiAgYXN5bmMgbG9hZCgpIHtcbiAgICB0aGlzLnNob3dMb2FkaW5nKCk7XG4gICAgYXdhaXQgdGhpcy5idWlsZERheU1hcCgpO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBzaG93TG9hZGluZygpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgdGhpcy5jb250YWluZXJFbC5hZGRDbGFzcygnbG9nLWNhbGVuZGFyLWNvbnRhaW5lcicpO1xuICAgIHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnbG9nLWNhbC1sb2FkaW5nJywgdGV4dDogJ1x1NTJBMFx1OEY3RFx1NEUyRC4uLicgfSk7XG4gICAgdGhpcy5pbmplY3RTdHlsZXMoKTtcbiAgfVxuXG4gIGFzeW5jIGJ1aWxkRGF5TWFwKCkge1xuICAgIHRoaXMuZGF5TWFwLmNsZWFyKCk7XG4gICAgY29uc3QgZm9sZGVyID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9nRm9sZGVyO1xuXG4gICAgLy8gVmFsaWRhdGUgZm9sZGVyIGV4aXN0c1xuICAgIGNvbnN0IGZvbGRlckV4aXN0cyA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmb2xkZXIpO1xuICAgIGlmICghZm9sZGVyRXhpc3RzKSB7XG4gICAgICBuZXcgTm90aWNlKGBcdTI2QTBcdUZFMEYgXHU2NUU1XHU1RkQ3XHU2NTg3XHU0RUY2XHU1OTM5XHUzMDBDJHtmb2xkZXJ9XHUzMDBEXHU0RTBEXHU1QjU4XHU1NzI4XHVGRjBDXHU4QkY3XHU2OEMwXHU2N0U1XHU4QkJFXHU3RjZFYCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZmlsZXMgPSB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkuZmlsdGVyKFxuICAgICAgZiA9PiBmLnBhdGguc3RhcnRzV2l0aChmb2xkZXIgKyAnLycpIHx8IGYucGFyZW50Py5uYW1lID09PSBmb2xkZXJcbiAgICApO1xuXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcbiAgICAgICAgY29uc3QgZW50cmllcyA9IHBhcnNlTG9nRW50cmllcyhjb250ZW50LCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYXRlRm9ybWF0LCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmV2aWV3TGluZXMpO1xuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuZGF5TWFwLmdldChlbnRyeS5kYXRlKSB8fCBbXTtcbiAgICAgICAgICBleGlzdGluZy5wdXNoKHsgLi4uZW50cnksIGZpbGUgfSk7XG4gICAgICAgICAgdGhpcy5kYXlNYXAuc2V0KGVudHJ5LmRhdGUsIGV4aXN0aW5nKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLndhcm4oYExvZyBDYWxlbmRhcjogZmFpbGVkIHRvIHJlYWQgJHtmaWxlLnBhdGh9YCwgZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyKCkge1xuICAgIHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICB0aGlzLmNvbnRhaW5lckVsLmFkZENsYXNzKCdsb2ctY2FsZW5kYXItY29udGFpbmVyJyk7XG4gICAgdGhpcy5yZW5kZXJDYWxlbmRhcigpO1xuICAgIHRoaXMucmVuZGVyVG9kb1BhbmVsKHRoaXMuc2VsZWN0ZWREYXRlKTtcbiAgICB0aGlzLmluamVjdFN0eWxlcygpO1xuICB9XG5cbiAgcmVuZGVyQ2FsZW5kYXIoKSB7XG4gICAgLy8gSGVhZGVyXG4gICAgY29uc3QgaGVhZGVyID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdsb2ctY2FsLWhlYWRlcicgfSk7XG4gICAgY29uc3QgcHJldkJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnXHUyNUMwJywgY2xzOiAnbG9nLWNhbC1uYXYnIH0pO1xuICAgIGNvbnN0IHRpdGxlID0gaGVhZGVyLmNyZWF0ZUVsKCdzcGFuJywgeyBjbHM6ICdsb2ctY2FsLXRpdGxlJyB9KTtcbiAgICBjb25zdCBuZXh0QnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdcdTI1QjYnLCBjbHM6ICdsb2ctY2FsLW5hdicgfSk7XG4gICAgY29uc3QgcmVmcmVzaEJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnXHUyMUJBJywgY2xzOiAnbG9nLWNhbC1uYXYgbG9nLWNhbC1yZWZyZXNoJywgdGl0bGU6ICdcdTUyMzdcdTY1QjAnIH0pO1xuXG4gICAgY29uc3QgbW9udGhOYW1lcyA9IFsnSmFuJywnRmViJywnTWFyJywnQXByJywnTWF5JywnSnVuJywnSnVsJywnQXVnJywnU2VwJywnT2N0JywnTm92JywnRGVjJ107XG4gICAgdGl0bGUuc2V0VGV4dChgJHt0aGlzLmN1cnJlbnRZZWFyfSAgJHttb250aE5hbWVzW3RoaXMuY3VycmVudE1vbnRoXX1gKTtcblxuICAgIHByZXZCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHRoaXMuY3VycmVudE1vbnRoLS07XG4gICAgICBpZiAodGhpcy5jdXJyZW50TW9udGggPCAwKSB7IHRoaXMuY3VycmVudE1vbnRoID0gMTE7IHRoaXMuY3VycmVudFllYXItLTsgfVxuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9O1xuICAgIG5leHRCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHRoaXMuY3VycmVudE1vbnRoKys7XG4gICAgICBpZiAodGhpcy5jdXJyZW50TW9udGggPiAxMSkgeyB0aGlzLmN1cnJlbnRNb250aCA9IDA7IHRoaXMuY3VycmVudFllYXIrKzsgfVxuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9O1xuICAgIHJlZnJlc2hCdG4ub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgIHRoaXMuc2hvd0xvYWRpbmcoKTtcbiAgICAgIGF3YWl0IHRoaXMuYnVpbGREYXlNYXAoKTtcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICBuZXcgTm90aWNlKCdcdTVERjJcdTUyMzdcdTY1QjAnKTtcbiAgICB9O1xuXG4gICAgLy8gR3JpZFxuICAgIGNvbnN0IGdyaWQgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7IGNsczogJ2xvZy1jYWwtZ3JpZCcgfSk7XG4gICAgZm9yIChjb25zdCBkIG9mIFsnTW9uJywnVHVlJywnV2VkJywnVGh1JywnRnJpJywnU2F0JywnU3VuJ10pIHtcbiAgICAgIGdyaWQuY3JlYXRlRGl2KHsgY2xzOiAnbG9nLWNhbC1kYXktbGFiZWwnLCB0ZXh0OiBkIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGZpcnN0RGF5ID0gbmV3IERhdGUodGhpcy5jdXJyZW50WWVhciwgdGhpcy5jdXJyZW50TW9udGgsIDEpO1xuICAgIGNvbnN0IGxhc3REYXkgPSBuZXcgRGF0ZSh0aGlzLmN1cnJlbnRZZWFyLCB0aGlzLmN1cnJlbnRNb250aCArIDEsIDApO1xuICAgIGxldCBzdGFydE9mZnNldCA9IGZpcnN0RGF5LmdldERheSgpIC0gMTtcbiAgICBpZiAoc3RhcnRPZmZzZXQgPCAwKSBzdGFydE9mZnNldCA9IDY7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdGFydE9mZnNldDsgaSsrKSBncmlkLmNyZWF0ZURpdih7IGNsczogJ2xvZy1jYWwtY2VsbCBlbXB0eScgfSk7XG5cbiAgICBjb25zdCB0b2RheSA9IHRvZGF5U3RyKCk7XG5cbiAgICBmb3IgKGxldCBkYXkgPSAxOyBkYXkgPD0gbGFzdERheS5nZXREYXRlKCk7IGRheSsrKSB7XG4gICAgICBjb25zdCBkYXRlU3RyID0gYCR7dGhpcy5jdXJyZW50WWVhcn0ke1N0cmluZyh0aGlzLmN1cnJlbnRNb250aCsxKS5wYWRTdGFydCgyLCcwJyl9JHtTdHJpbmcoZGF5KS5wYWRTdGFydCgyLCcwJyl9YDtcbiAgICAgIGNvbnN0IGNlbGwgPSBncmlkLmNyZWF0ZURpdih7IGNsczogJ2xvZy1jYWwtY2VsbCcgfSk7XG5cbiAgICAgIGlmIChkYXRlU3RyID09PSB0b2RheSkgY2VsbC5hZGRDbGFzcygndG9kYXknKTtcbiAgICAgIGlmIChkYXRlU3RyID09PSB0aGlzLnNlbGVjdGVkRGF0ZSkgY2VsbC5hZGRDbGFzcygnc2VsZWN0ZWQnKTtcbiAgICAgIGNlbGwuY3JlYXRlRGl2KHsgY2xzOiAnbG9nLWNhbC1kYXktbnVtJywgdGV4dDogU3RyaW5nKGRheSkgfSk7XG5cbiAgICAgIGNvbnN0IGVudHJpZXMgPSB0aGlzLmRheU1hcC5nZXQoZGF0ZVN0cik7XG4gICAgICBpZiAoZW50cmllcyAmJiBlbnRyaWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY2VsbC5hZGRDbGFzcygnaGFzLWVudHJ5Jyk7XG4gICAgICAgIGNlbGwuY3JlYXRlRGl2KHsgY2xzOiAnbG9nLWNhbC1kb3QnIH0pO1xuICAgICAgICBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2xvZy1jYWwtcHJldmlldycgfSkuc2V0VGV4dChlbnRyaWVzWzBdLnByZXZpZXcpO1xuICAgICAgfVxuXG4gICAgICBjZWxsLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLl9jbGlja2luZykgcmV0dXJuO1xuICAgICAgICB0aGlzLl9jbGlja2luZyA9IHRydWU7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4geyB0aGlzLl9jbGlja2luZyA9IGZhbHNlOyB9LCAzMDApO1xuXG4gICAgICAgIHRoaXMuc2VsZWN0ZWREYXRlID0gZGF0ZVN0cjtcbiAgICAgICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKCcubG9nLWNhbC1jZWxsJykuZm9yRWFjaChjID0+IChjIGFzIEhUTUxFbGVtZW50KS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKSk7XG4gICAgICAgIGNlbGwuYWRkQ2xhc3MoJ3NlbGVjdGVkJyk7XG5cbiAgICAgICAgY29uc3QgZXhpc3RpbmdQYW5lbCA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcignLmxvZy10b2RvLXBhbmVsJyk7XG4gICAgICAgIGlmIChleGlzdGluZ1BhbmVsKSBleGlzdGluZ1BhbmVsLnJlbW92ZSgpO1xuICAgICAgICBhd2FpdCB0aGlzLnJlbmRlclRvZG9QYW5lbChkYXRlU3RyKTtcblxuICAgICAgICBpZiAoZW50cmllcyAmJiBlbnRyaWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb25zdCBlbnRyeSA9IGVudHJpZXNbMF07XG4gICAgICAgICAgLy8gQ2hlY2sgaWYgZmlsZSBhbHJlYWR5IG9wZW4gaW4gYW55IGxlYWYgLSBpZiBzbywganVzdCByZXZlYWwgaXRcbiAgICAgICAgICBsZXQgdGFyZ2V0TGVhZiA9IG51bGw7XG4gICAgICAgICAgdGhpcy5hcHAud29ya3NwYWNlLml0ZXJhdGVBbGxMZWF2ZXMobCA9PiB7XG4gICAgICAgICAgICBpZiAobC52aWV3IGluc3RhbmNlb2YgTWFya2Rvd25WaWV3ICYmIGwudmlldy5maWxlPy5wYXRoID09PSBlbnRyeS5maWxlLnBhdGgpIHtcbiAgICAgICAgICAgICAgdGFyZ2V0TGVhZiA9IGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY29uc3QgbGVhZiA9IHRhcmdldExlYWYgfHwgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYoJ3RhYicpO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIXRhcmdldExlYWYpIGF3YWl0IGxlYWYub3BlbkZpbGUoZW50cnkuZmlsZSk7XG4gICAgICAgICAgICB0aGlzLmFwcC53b3Jrc3BhY2Uuc2V0QWN0aXZlTGVhZihsZWFmLCB7IGZvY3VzOiB0cnVlIH0pO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSBsZWFmLnZpZXc7XG4gICAgICAgICAgICAgIGlmICh2aWV3IGluc3RhbmNlb2YgTWFya2Rvd25WaWV3KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZWRpdG9yID0gdmlldy5lZGl0b3I7XG4gICAgICAgICAgICAgICAgY29uc3QgbGluZXMgPSBlZGl0b3IuZ2V0VmFsdWUoKS5zcGxpdCgnXFxuJyk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgaWYgKGxpbmVzW2ldLnJlcGxhY2UoL1xcKisvZywgJycpLnRyaW0oKSA9PT0gZW50cnkuaGVhZGluZykge1xuICAgICAgICAgICAgICAgICAgICBlZGl0b3Iuc2V0Q3Vyc29yKHsgbGluZTogaSwgY2g6IDAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGVkaXRvci5zY3JvbGxJbnRvVmlldyh7IGZyb206IHsgbGluZTogaSwgY2g6IDAgfSwgdG86IHsgbGluZTogaSsxMCwgY2g6IDAgfSB9LCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAzMDApO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoJ1x1MjZBMFx1RkUwRiBcdTY1RTBcdTZDRDVcdTYyNTNcdTVGMDBcdTdCMTRcdThCQjBcdTY1ODdcdTRFRjYnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVuZGVyVG9kb1BhbmVsKGRhdGVTdHI6IHN0cmluZyB8IG51bGwpIHtcbiAgICBjb25zdCB7IHRvZG9QYW5lbE1heEhlaWdodCwgY29tcGxldGVkQWN0aW9uLCBvdmVyZHVlQWN0aW9uIH0gPSB0aGlzLnBsdWdpbi5zZXR0aW5ncztcbiAgICBjb25zdCBwYW5lbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnbG9nLXRvZG8tcGFuZWwnIH0pO1xuXG4gICAgLy8gUGFuZWwgaGVhZGVyXG4gICAgY29uc3QgcGFuZWxIZWFkZXIgPSBwYW5lbC5jcmVhdGVEaXYoeyBjbHM6ICdsb2ctdG9kby1oZWFkZXInIH0pO1xuICAgIGlmIChkYXRlU3RyKSB7XG4gICAgICBjb25zdCBsYWJlbCA9IGAke2RhdGVTdHIuc3Vic3RyaW5nKDAsNCl9LSR7ZGF0ZVN0ci5zdWJzdHJpbmcoNCw2KX0tJHtkYXRlU3RyLnN1YnN0cmluZyg2LDgpfWA7XG4gICAgICBwYW5lbEhlYWRlci5jcmVhdGVFbCgnc3BhbicsIHsgY2xzOiAnbG9nLXRvZG8tdGl0bGUnLCB0ZXh0OiBsYWJlbCB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFuZWxIZWFkZXIuY3JlYXRlRWwoJ3NwYW4nLCB7IGNsczogJ2xvZy10b2RvLXRpdGxlJywgdGV4dDogJ1Rhc2tzJyB9KTtcbiAgICB9XG4gICAgY29uc3QgYWRkQnRuID0gcGFuZWxIZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJysgVGFzaycsIGNsczogJ2xvZy1jYWwtbmF2IGxvZy10b2RvLWFkZC1idG4nIH0pO1xuXG4gICAgaWYgKCFkYXRlU3RyKSB7XG4gICAgICBhZGRCdG4uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgcGFuZWwuY3JlYXRlRGl2KHsgY2xzOiAnbG9nLXRvZG8tZW1wdHknLCB0ZXh0OiAnXHU3MEI5XHU1MUZCXHU2NUU1XHU2NzFGXHU2N0U1XHU3NzBCXHU2MjE2XHU2REZCXHU1MkEwXHU0RUZCXHU1MkExJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlUGF0aCA9IGdldFRvZG9GaWxlUGF0aChkYXRlU3RyLCB0aGlzLnBsdWdpbi5zZXR0aW5ncyk7XG4gICAgbGV0IHRvZG9zOiBUb2RvSXRlbVtdID0gW107XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgdG9kb0ZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZVBhdGgpO1xuICAgICAgaWYgKHRvZG9GaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQodG9kb0ZpbGUpO1xuICAgICAgICB0b2RvcyA9IHBhcnNlVG9kb3MoY29udGVudCwgZGF0ZVN0cik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbmV3IE5vdGljZSgnXHUyNkEwXHVGRTBGIFx1NEVGQlx1NTJBMVx1NjU4N1x1NEVGNlx1OEJGQlx1NTNENlx1NTkzMVx1OEQyNVx1RkYwQ1x1OEJGN1x1OTFDRFx1OEJENScpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFJvbGxvdmVyOiBpZiB0b2RheSwgYWxzbyBzaG93IG92ZXJkdWUgaW5jb21wbGV0ZSB0YXNrcyBmcm9tIHBhc3QgZGF0ZXNcbiAgICBjb25zdCB0b2RheUQgPSB0b2RheVN0cigpO1xuICAgIGlmIChvdmVyZHVlQWN0aW9uID09PSAncm9sbG92ZXInICYmIGRhdGVTdHIgPT09IHRvZGF5RCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgYWxsVG9kb0ZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZVBhdGgpO1xuICAgICAgICBpZiAoYWxsVG9kb0ZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICAgIGNvbnN0IGFsbENvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGFsbFRvZG9GaWxlKTtcbiAgICAgICAgICBjb25zdCBhbGxMaW5lcyA9IGFsbENvbnRlbnQuc3BsaXQoJ1xcbicpO1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWxsTGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG0gPSBhbGxMaW5lc1tpXS5tYXRjaCgvXi0gXFxbKFsgXSlcXF0gKC4rKSQvKTtcbiAgICAgICAgICAgIGlmICghbSkgY29udGludWU7XG4gICAgICAgICAgICBsZXQgdGV4dCA9IG1bMl0udHJpbSgpO1xuICAgICAgICAgICAgY29uc3QgZHRNYXRjaCA9IHRleHQubWF0Y2goL0BkYXRlOihcXGR7NH1bLVxcL10/XFxkezJ9Wy1cXC9dP1xcZHsyfSkvKTtcbiAgICAgICAgICAgIGlmICghZHRNYXRjaCkgY29udGludWU7XG4gICAgICAgICAgICBjb25zdCBpdGVtRGF0ZSA9IGR0TWF0Y2hbMV0ucmVwbGFjZSgvWy1cXC9dL2csICcnKTtcbiAgICAgICAgICAgIGlmIChpdGVtRGF0ZSA+PSB0b2RheUQpIGNvbnRpbnVlOyAvLyBub3Qgb3ZlcmR1ZVxuICAgICAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZSgvQGRhdGU6XFxTKy8sICcnKS50cmltKCk7XG4gICAgICAgICAgICAvLyBBdm9pZCBkdXBsaWNhdGVzXG4gICAgICAgICAgICBpZiAoIXRvZG9zLmZpbmQodCA9PiB0LnRleHQgPT09IHRleHQgJiYgdC5kYXRlID09PSBpdGVtRGF0ZSkpIHtcbiAgICAgICAgICAgICAgY29uc3Qgb3ZlcmR1ZUxhYmVsID0gJ1x1MjNGMCAnICsgdGV4dCArICcgKCcgKyBpdGVtRGF0ZS5zdWJzdHJpbmcoMCw0KSArICctJyArIGl0ZW1EYXRlLnN1YnN0cmluZyg0LDYpICsgJy0nICsgaXRlbURhdGUuc3Vic3RyaW5nKDYsOCkgKyAnKSc7XG4gICAgICAgICAgICAgIHRvZG9zLnB1c2goeyB0ZXh0OiBvdmVyZHVlTGFiZWwsIGNoZWNrZWQ6IGZhbHNlLCBsaW5lSW5kZXg6IGksIGRhdGU6IGl0ZW1EYXRlLCBvdmVyZHVlOiB0cnVlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaChlKSB7IC8qIHNpbGVudCAqLyB9XG4gICAgfVxuXG4gICAgLy8gU2Nyb2xsYWJsZSBsaXN0IGNvbnRhaW5lclxuICAgIGNvbnN0IGxpc3RXcmFwID0gcGFuZWwuY3JlYXRlRGl2KHsgY2xzOiAnbG9nLXRvZG8tbGlzdC13cmFwJyB9KTtcbiAgICBsaXN0V3JhcC5zdHlsZS5tYXhIZWlnaHQgPSBgJHt0b2RvUGFuZWxNYXhIZWlnaHR9cHhgO1xuXG4gICAgY29uc3QgbGlzdCA9IGxpc3RXcmFwLmNyZWF0ZURpdih7IGNsczogJ2xvZy10b2RvLWxpc3QnIH0pO1xuXG4gICAgaWYgKHRvZG9zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbGlzdC5jcmVhdGVEaXYoeyBjbHM6ICdsb2ctdG9kby1lbXB0eScsIHRleHQ6ICdcdTY2ODJcdTY1RTBcdTRFRkJcdTUyQTEnIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTb3J0OiBpbmNvbXBsZXRlIGZpcnN0LCBvdmVyZHVlIGhpZ2hsaWdodGVkLCBjb21wbGV0ZWQgbGFzdFxuICAgICAgY29uc3QgaW5jb21wbGV0ZSA9IHRvZG9zLmZpbHRlcih0ID0+ICF0LmNoZWNrZWQpO1xuICAgICAgY29uc3QgY29tcGxldGVkID0gdG9kb3MuZmlsdGVyKHQgPT4gdC5jaGVja2VkKTtcbiAgICAgIGZvciAoY29uc3QgdG9kbyBvZiBbLi4uaW5jb21wbGV0ZSwgLi4uY29tcGxldGVkXSkge1xuICAgICAgICB0aGlzLnJlbmRlclRvZG9JdGVtKGxpc3QsIHRvZG8sIGZpbGVQYXRoLCBkYXRlU3RyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZGQgdGFzayBpbnB1dCByb3dcbiAgICBjb25zdCBhZGRSb3cgPSBwYW5lbC5jcmVhdGVEaXYoeyBjbHM6ICdsb2ctdG9kby1hZGQtcm93IGxvZy10b2RvLWhpZGRlbicgfSk7XG4gICAgY29uc3QgaW5wdXQgPSBhZGRSb3cuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAndGV4dCcsIGNsczogJ2xvZy10b2RvLWlucHV0JywgcGxhY2Vob2xkZXI6ICdcdTY1QjBcdTRFRkJcdTUyQTEuLi4nIH0pO1xuICAgIGNvbnN0IGNvbmZpcm1CdG4gPSBhZGRSb3cuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1MjcxMycsIGNsczogJ2xvZy1jYWwtbmF2JyB9KTtcbiAgICBjb25zdCBjYW5jZWxCdG4gPSBhZGRSb3cuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1MjcxNScsIGNsczogJ2xvZy1jYWwtbmF2JyB9KTtcblxuICAgIGFkZEJ0bi5vbmNsaWNrID0gKCkgPT4geyBhZGRSb3cucmVtb3ZlQ2xhc3MoJ2xvZy10b2RvLWhpZGRlbicpOyBpbnB1dC5mb2N1cygpOyB9O1xuICAgIGNhbmNlbEJ0bi5vbmNsaWNrID0gKCkgPT4geyBhZGRSb3cuYWRkQ2xhc3MoJ2xvZy10b2RvLWhpZGRlbicpOyBpbnB1dC52YWx1ZSA9ICcnOyB9O1xuXG4gICAgY29uc3QgZG9BZGQgPSBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByYXcgPSBpbnB1dC52YWx1ZS50cmltKCk7XG4gICAgICBpZiAoIXJhdykgcmV0dXJuO1xuICAgICAgLy8gRXNjYXBlIHNwZWNpYWwgbWFya2Rvd24gY2hhcnNcbiAgICAgIGNvbnN0IHNhZmUgPSByYXcucmVwbGFjZSgvKFtbXFxdKl9gXSkvZywgJ1xcXFwkMScpO1xuICAgICAgYXdhaXQgdGhpcy5hZGRUb2RvSXRlbShmaWxlUGF0aCwgc2FmZSwgZGF0ZVN0cik7XG4gICAgICBpbnB1dC52YWx1ZSA9ICcnO1xuICAgICAgYWRkUm93LmFkZENsYXNzKCdsb2ctdG9kby1oaWRkZW4nKTtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcubG9nLXRvZG8tcGFuZWwnKTtcbiAgICAgIGlmIChleGlzdGluZykgZXhpc3RpbmcucmVtb3ZlKCk7XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlclRvZG9QYW5lbChkYXRlU3RyKTtcbiAgICB9O1xuXG4gICAgY29uZmlybUJ0bi5vbmNsaWNrID0gZG9BZGQ7XG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGFzeW5jIChlKSA9PiB7XG4gICAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicpIGF3YWl0IGRvQWRkKCk7XG4gICAgICBpZiAoZS5rZXkgPT09ICdFc2NhcGUnKSBjYW5jZWxCdG4ub25jbGljayhuZXcgTW91c2VFdmVudCgnY2xpY2snKSk7XG4gICAgfSk7XG4gIH1cblxuICByZW5kZXJUb2RvSXRlbShjb250YWluZXI6IEhUTUxFbGVtZW50LCB0b2RvOiBUb2RvSXRlbSwgZmlsZVBhdGg6IHN0cmluZywgZGF0ZVN0cjogc3RyaW5nKSB7XG4gICAgY29uc3QgeyBjb21wbGV0ZWRBY3Rpb24sIG92ZXJkdWVBY3Rpb24gfSA9IHRoaXMucGx1Z2luLnNldHRpbmdzO1xuICAgIGNvbnN0IGl0ZW0gPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnbG9nLXRvZG8taXRlbScgKyAodG9kby5jaGVja2VkID8gJyBjaGVja2VkJyA6ICcnKSArICh0b2RvLm92ZXJkdWUgJiYgb3ZlcmR1ZUFjdGlvbiA9PT0gJ2hpZ2hsaWdodCcgPyAnIG92ZXJkdWUnIDogJycpIH0pO1xuICAgIGNvbnN0IGNoZWNrYm94ID0gaXRlbS5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdjaGVja2JveCcsIGNsczogJ2xvZy10b2RvLWNoZWNrYm94JyB9KTtcbiAgICBjaGVja2JveC5jaGVja2VkID0gdG9kby5jaGVja2VkO1xuICAgIGl0ZW0uY3JlYXRlRWwoJ3NwYW4nLCB7IGNsczogJ2xvZy10b2RvLXRleHQnLCB0ZXh0OiB0b2RvLnRleHQgfSk7XG5cbiAgICBjaGVja2JveC5vbmNoYW5nZSA9IGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZVBhdGgpO1xuICAgICAgICBpZiAoIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpKSB7IG5ldyBOb3RpY2UoJ1x1MjZBMFx1RkUwRiBcdTRFRkJcdTUyQTFcdTY1ODdcdTRFRjZcdTRFMERcdTVCNThcdTU3MjgnKTsgY2hlY2tib3guY2hlY2tlZCA9ICFjaGVja2JveC5jaGVja2VkOyByZXR1cm47IH1cblxuICAgICAgICAvLyBSZS1yZWFkIHRvIGF2b2lkIG92ZXJ3cml0ZSBjb25mbGljdFxuICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcbiAgICAgICAgY29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KCdcXG4nKTtcblxuICAgICAgICBpZiAodG9kby5saW5lSW5kZXggPj0gbGluZXMubGVuZ3RoKSB7IG5ldyBOb3RpY2UoJ1x1MjZBMFx1RkUwRiBcdTRFRkJcdTUyQTFcdTg4NENcdTVERjJcdTY1MzlcdTUzRDhcdUZGMENcdThCRjdcdTUyMzdcdTY1QjAnKTsgcmV0dXJuOyB9XG5cbiAgICAgICAgaWYgKGNoZWNrYm94LmNoZWNrZWQpIHtcbiAgICAgICAgICBpZiAoY29tcGxldGVkQWN0aW9uID09PSAnZGVsZXRlJykge1xuICAgICAgICAgICAgbGluZXMuc3BsaWNlKHRvZG8ubGluZUluZGV4LCAxKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNvbXBsZXRlZEFjdGlvbiA9PT0gJ2FyY2hpdmUnKSB7XG4gICAgICAgICAgICBjb25zdCBkb25lTGluZSA9IGxpbmVzW3RvZG8ubGluZUluZGV4XS5yZXBsYWNlKCctIFsgXScsICctIFt4XScpO1xuICAgICAgICAgICAgbGluZXMuc3BsaWNlKHRvZG8ubGluZUluZGV4LCAxKTtcbiAgICAgICAgICAgIC8vIEFwcGVuZCB0byBlbmQgb3IgYWZ0ZXIgYSAtLS0gRG9uZSAtLS0gZGl2aWRlclxuICAgICAgICAgICAgY29uc3QgZG9uZUlkeCA9IGxpbmVzLmZpbmRJbmRleChsID0+IGwudHJpbSgpID09PSAnPCEtLSBkb25lIC0tPicpO1xuICAgICAgICAgICAgaWYgKGRvbmVJZHggPj0gMCkgbGluZXMuc3BsaWNlKGRvbmVJZHggKyAxLCAwLCBkb25lTGluZSk7XG4gICAgICAgICAgICBlbHNlIGxpbmVzLnB1c2goJycsICc8IS0tIGRvbmUgLS0+JywgZG9uZUxpbmUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsaW5lc1t0b2RvLmxpbmVJbmRleF0gPSBsaW5lc1t0b2RvLmxpbmVJbmRleF0ucmVwbGFjZSgnLSBbIF0nLCAnLSBbeF0nKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGluZXNbdG9kby5saW5lSW5kZXhdID0gbGluZXNbdG9kby5saW5lSW5kZXhdLnJlcGxhY2UoLy0gXFxbW3hYXVxcXS8sICctIFsgXScpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIGxpbmVzLmpvaW4oJ1xcbicpKTtcblxuICAgICAgICBpZiAoY29tcGxldGVkQWN0aW9uID09PSAnZGVsZXRlJyB8fCBjb21wbGV0ZWRBY3Rpb24gPT09ICdhcmNoaXZlJykge1xuICAgICAgICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcubG9nLXRvZG8tcGFuZWwnKTtcbiAgICAgICAgICBpZiAoZXhpc3RpbmcpIGV4aXN0aW5nLnJlbW92ZSgpO1xuICAgICAgICAgIGF3YWl0IHRoaXMucmVuZGVyVG9kb1BhbmVsKGRhdGVTdHIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW0udG9nZ2xlQ2xhc3MoJ2NoZWNrZWQnLCBjaGVja2JveC5jaGVja2VkKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBuZXcgTm90aWNlKCdcdTI2QTBcdUZFMEYgXHU0RkREXHU1QjU4XHU1OTMxXHU4RDI1XHVGRjBDXHU4QkY3XHU5MUNEXHU4QkQ1Jyk7XG4gICAgICAgIGNoZWNrYm94LmNoZWNrZWQgPSAhY2hlY2tib3guY2hlY2tlZDtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgYWRkVG9kb0l0ZW0oZmlsZVBhdGg6IHN0cmluZywgdGV4dDogc3RyaW5nLCBkYXRlU3RyOiBzdHJpbmcpIHtcbiAgICBjb25zdCB7IGRhdGVGb3JtYXQgfSA9IHRoaXMucGx1Z2luLnNldHRpbmdzO1xuICAgIC8vIEluIHNpbmdsZS9tb250aGx5IG1vZGUsIGFwcGVuZCBkYXRlIHRhZ1xuICAgIGNvbnN0IG5ld0xpbmUgPSBgLSBbIF0gJHt0ZXh0fSBAZGF0ZToke2RhdGVTdHJ9YDtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlUGF0aCk7XG4gICAgICBpZiAoZXhpc3RpbmcgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChleGlzdGluZyk7XG4gICAgICAgIGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGNvbnN0IGRvbmVJZHggPSBsaW5lcy5maW5kSW5kZXgobCA9PiBsLnRyaW0oKSA9PT0gJzwhLS0gZG9uZSAtLT4nKTtcbiAgICAgICAgaWYgKGRvbmVJZHggPj0gMCkge1xuICAgICAgICAgIC8vIEluc2VydCBiZWZvcmUgPCEtLSBkb25lIC0tPiBkaXZpZGVyXG4gICAgICAgICAgbGluZXMuc3BsaWNlKGRvbmVJZHgsIDAsIG5ld0xpbmUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxpbmVzLnB1c2gobmV3TGluZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2xlYW4gdXAgdHJhaWxpbmcgZW1wdHkgbGluZXMgdGhlbiBhZGQgb25lXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShleGlzdGluZywgbGluZXMuam9pbignXFxuJykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MudG9kb0ZvbGRlcjtcbiAgICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZm9sZGVyKSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihmb2xkZXIpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShmaWxlUGF0aCwgbmV3TGluZSArICdcXG4nKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBuZXcgTm90aWNlKCdcdTI2QTBcdUZFMEYgXHU2NUUwXHU2Q0Q1XHU1MjFCXHU1RUZBXHU0RUZCXHU1MkExXHU2NTg3XHU0RUY2XHVGRjBDXHU4QkY3XHU2OEMwXHU2N0U1XHU2NzQzXHU5NjUwJyk7XG4gICAgfVxuICB9XG5cbiAgaW5qZWN0U3R5bGVzKCkge1xuICAgIGNvbnN0IHN0eWxlSWQgPSAnbG9nLWNhbGVuZGFyLXN0eWxlcyc7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzdHlsZUlkKTtcbiAgICBpZiAoZXhpc3RpbmcpIGV4aXN0aW5nLnJlbW92ZSgpO1xuICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICBzdHlsZS5pZCA9IHN0eWxlSWQ7XG4gICAgc3R5bGUudGV4dENvbnRlbnQgPSBgXG4gICAgICAubG9nLWNhbGVuZGFyLWNvbnRhaW5lciB7IHBhZGRpbmc6IDEycHg7IGZvbnQtZmFtaWx5OiB2YXIoLS1mb250LWludGVyZmFjZSk7IH1cbiAgICAgIC5sb2ctY2FsLWxvYWRpbmcgeyB0ZXh0LWFsaWduOiBjZW50ZXI7IGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTsgcGFkZGluZzogMjRweCAwOyBmb250LXNpemU6IDAuOWVtOyB9XG4gICAgICAubG9nLWNhbC1oZWFkZXIgeyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDhweDsgbWFyZ2luLWJvdHRvbTogMTJweDsgfVxuICAgICAgLmxvZy1jYWwtdGl0bGUgeyBmb250LXNpemU6IDEuMWVtOyBmb250LXdlaWdodDogNjAwOyBmbGV4OiAxOyB0ZXh0LWFsaWduOiBjZW50ZXI7IH1cbiAgICAgIC5sb2ctY2FsLW5hdiB7IGJhY2tncm91bmQ6IHZhcigtLWludGVyYWN0aXZlLW5vcm1hbCk7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKTsgYm9yZGVyLXJhZGl1czogNHB4OyBjdXJzb3I6IHBvaW50ZXI7IHBhZGRpbmc6IDJweCA4cHg7IGNvbG9yOiB2YXIoLS10ZXh0LW5vcm1hbCk7IGZvbnQtc2l6ZTogMC45ZW07IH1cbiAgICAgIC5sb2ctY2FsLW5hdjpob3ZlciB7IGJhY2tncm91bmQ6IHZhcigtLWludGVyYWN0aXZlLWhvdmVyKTsgfVxuICAgICAgLmxvZy1jYWwtbmF2OmRpc2FibGVkIHsgb3BhY2l0eTogMC40OyBjdXJzb3I6IGRlZmF1bHQ7IH1cbiAgICAgIC5sb2ctY2FsLXJlZnJlc2ggeyBmb250LXNpemU6IDEuMWVtOyBmb250LXdlaWdodDogYm9sZDsgfVxuICAgICAgLmxvZy1jYWwtZ3JpZCB7IGRpc3BsYXk6IGdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KDcsIG1pbm1heCgwLCAxZnIpKTsgZ2FwOiAzcHg7IH1cbiAgICAgIC5sb2ctY2FsLWRheS1sYWJlbCB7IHRleHQtYWxpZ246IGNlbnRlcjsgZm9udC1zaXplOiAwLjcyZW07IGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTsgcGFkZGluZzogNHB4IDA7IGZvbnQtd2VpZ2h0OiA2MDA7IG92ZXJmbG93OiBoaWRkZW47IHdoaXRlLXNwYWNlOiBub3dyYXA7IH1cbiAgICAgIC5sb2ctY2FsLWNlbGwgeyBoZWlnaHQ6IDY0cHg7IGJveC1zaXppbmc6IGJvcmRlci1ib3g7IGJvcmRlci1yYWRpdXM6IDZweDsgcGFkZGluZzogNHB4OyBwb3NpdGlvbjogcmVsYXRpdmU7IGJvcmRlcjogMXB4IHNvbGlkIHRyYW5zcGFyZW50OyB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIDAuMTVzOyBvdmVyZmxvdzogaGlkZGVuOyBtaW4td2lkdGg6IDA7IGN1cnNvcjogcG9pbnRlcjsgfVxuICAgICAgLmxvZy1jYWwtY2VsbC5lbXB0eSB7IGJhY2tncm91bmQ6IG5vbmUgIWltcG9ydGFudDsgYm9yZGVyOiBub25lICFpbXBvcnRhbnQ7IGN1cnNvcjogZGVmYXVsdDsgcG9pbnRlci1ldmVudHM6IG5vbmU7IH1cbiAgICAgIC5sb2ctY2FsLWNlbGw6bm90KC5lbXB0eSkgeyBiYWNrZ3JvdW5kOiB2YXIoLS1iYWNrZ3JvdW5kLXNlY29uZGFyeSk7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyLWhvdmVyKSAhaW1wb3J0YW50OyB9XG4gICAgICAubG9nLWNhbC1jZWxsOm5vdCguZW1wdHkpOmhvdmVyIHsgYmFja2dyb3VuZDogdmFyKC0taW50ZXJhY3RpdmUtaG92ZXIpOyB9XG4gICAgICAubG9nLWNhbC1jZWxsLnRvZGF5IHsgYm9yZGVyLWNvbG9yOiB2YXIoLS1jb2xvci1hY2NlbnQpICFpbXBvcnRhbnQ7IH1cbiAgICAgIC5sb2ctY2FsLWNlbGwuc2VsZWN0ZWQgeyBib3JkZXItY29sb3I6IHZhcigtLWNvbG9yLWFjY2VudCkgIWltcG9ydGFudDsgYmFja2dyb3VuZDogdmFyKC0taW50ZXJhY3RpdmUtaG92ZXIpICFpbXBvcnRhbnQ7IH1cbiAgICAgIC5sb2ctY2FsLWNlbGwuaGFzLWVudHJ5IHsgYmFja2dyb3VuZDogdmFyKC0tYmFja2dyb3VuZC1zZWNvbmRhcnktYWx0KTsgfVxuICAgICAgLmxvZy1jYWwtZGF5LW51bSB7IGZvbnQtc2l6ZTogMC44ZW07IGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTsgfVxuICAgICAgLmxvZy1jYWwtY2VsbC50b2RheSAubG9nLWNhbC1kYXktbnVtLCAubG9nLWNhbC1jZWxsLnNlbGVjdGVkIC5sb2ctY2FsLWRheS1udW0geyBjb2xvcjogdmFyKC0tY29sb3ItYWNjZW50KTsgZm9udC13ZWlnaHQ6IDcwMDsgfVxuICAgICAgLmxvZy1jYWwtZG90IHsgd2lkdGg6IDZweDsgaGVpZ2h0OiA2cHg7IGJvcmRlci1yYWRpdXM6IDUwJTsgYmFja2dyb3VuZDogdmFyKC0tY29sb3ItYWNjZW50KTsgbWFyZ2luOiAycHggYXV0byAycHg7IH1cbiAgICAgIC5sb2ctY2FsLXByZXZpZXcgeyBmb250LXNpemU6IDAuNjhlbTsgY29sb3I6IHZhcigtLXRleHQtbm9ybWFsKTsgbGluZS1oZWlnaHQ6IDEuMzsgb3ZlcmZsb3c6IGhpZGRlbjsgd29yZC1icmVhazogYnJlYWstYWxsOyBkaXNwbGF5OiAtd2Via2l0LWJveDsgLXdlYmtpdC1saW5lLWNsYW1wOiAyOyAtd2Via2l0LWJveC1vcmllbnQ6IHZlcnRpY2FsOyB9XG4gICAgICAubG9nLXRvZG8tcGFuZWwgeyBtYXJnaW4tdG9wOiAxNHB4OyBib3JkZXItdG9wOiAxcHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpOyBwYWRkaW5nLXRvcDogMTJweDsgfVxuICAgICAgLmxvZy10b2RvLWhlYWRlciB7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IG1hcmdpbi1ib3R0b206IDEwcHg7IH1cbiAgICAgIC5sb2ctdG9kby10aXRsZSB7IGZvbnQtc2l6ZTogMC45ZW07IGZvbnQtd2VpZ2h0OiA2MDA7IGZsZXg6IDE7IGNvbG9yOiB2YXIoLS10ZXh0LW5vcm1hbCk7IH1cbiAgICAgIC5sb2ctdG9kby1hZGQtYnRuIHsgZm9udC1zaXplOiAwLjc4ZW07IHBhZGRpbmc6IDJweCA4cHg7IH1cbiAgICAgIC5sb2ctdG9kby1saXN0LXdyYXAgeyBvdmVyZmxvdy15OiBhdXRvOyB9XG4gICAgICAubG9nLXRvZG8tbGlzdCB7IGRpc3BsYXk6IGZsZXg7IGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47IGdhcDogNnB4OyB9XG4gICAgICAubG9nLXRvZG8taXRlbSB7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBmbGV4LXN0YXJ0OyBnYXA6IDhweDsgcGFkZGluZzogNnB4IDhweDsgYm9yZGVyLXJhZGl1czogNnB4OyBiYWNrZ3JvdW5kOiB2YXIoLS1iYWNrZ3JvdW5kLXNlY29uZGFyeSk7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyLWhvdmVyKTsgdHJhbnNpdGlvbjogYmFja2dyb3VuZCAwLjE1czsgfVxuICAgICAgLmxvZy10b2RvLWl0ZW06aG92ZXIgeyBiYWNrZ3JvdW5kOiB2YXIoLS1pbnRlcmFjdGl2ZS1ob3Zlcik7IH1cbiAgICAgIC5sb2ctdG9kby1pdGVtLmNoZWNrZWQgLmxvZy10b2RvLXRleHQgeyB0ZXh0LWRlY29yYXRpb246IGxpbmUtdGhyb3VnaDsgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpOyB9XG4gICAgICAubG9nLXRvZG8taXRlbS5vdmVyZHVlIHsgYm9yZGVyLWNvbG9yOiB2YXIoLS1jb2xvci1yZWQpICFpbXBvcnRhbnQ7IH1cbiAgICAgIC5sb2ctdG9kby1pdGVtLm92ZXJkdWUgLmxvZy10b2RvLXRleHQgeyBjb2xvcjogdmFyKC0tY29sb3ItcmVkKTsgfVxuICAgICAgLmxvZy10b2RvLWNoZWNrYm94IHsgbWFyZ2luLXRvcDogMnB4OyBjdXJzb3I6IHBvaW50ZXI7IGFjY2VudC1jb2xvcjogdmFyKC0tY29sb3ItYWNjZW50KTsgZmxleC1zaHJpbms6IDA7IH1cbiAgICAgIC5sb2ctdG9kby10ZXh0IHsgZm9udC1zaXplOiAwLjg1ZW07IGNvbG9yOiB2YXIoLS10ZXh0LW5vcm1hbCk7IGxpbmUtaGVpZ2h0OiAxLjQ7IHdvcmQtYnJlYWs6IGJyZWFrLXdvcmQ7IH1cbiAgICAgIC5sb2ctdG9kby1lbXB0eSB7IGZvbnQtc2l6ZTogMC44MmVtOyBjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCk7IHRleHQtYWxpZ246IGNlbnRlcjsgcGFkZGluZzogMTZweCAwOyB9XG4gICAgICAubG9nLXRvZG8tYWRkLXJvdyB7IGRpc3BsYXk6IGZsZXg7IGdhcDogNnB4OyBtYXJnaW4tdG9wOiA4cHg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IH1cbiAgICAgIC5sb2ctdG9kby1hZGQtcm93LmxvZy10b2RvLWhpZGRlbiB7IGRpc3BsYXk6IG5vbmU7IH1cbiAgICAgIC5sb2ctdG9kby1pbnB1dCB7IGZsZXg6IDE7IGJhY2tncm91bmQ6IHZhcigtLWJhY2tncm91bmQtcHJpbWFyeSk7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKTsgYm9yZGVyLXJhZGl1czogNHB4OyBwYWRkaW5nOiA0cHggOHB4OyBmb250LXNpemU6IDAuODVlbTsgY29sb3I6IHZhcigtLXRleHQtbm9ybWFsKTsgb3V0bGluZTogbm9uZTsgfVxuICAgICAgLmxvZy10b2RvLWlucHV0OmZvY3VzIHsgYm9yZGVyLWNvbG9yOiB2YXIoLS1jb2xvci1hY2NlbnQpOyB9XG4gICAgYDtcbiAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgUGx1Z2luIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMb2dDYWxlbmRhclBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBMb2dDYWxlbmRhclNldHRpbmdzO1xuICBjYWxlbmRhclZpZXc6IExvZ0NhbGVuZGFyVmlldyB8IG51bGwgPSBudWxsO1xuXG4gIGFzeW5jIG9ubG9hZCgpIHtcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuICAgIHRoaXMuYWRkUmliYm9uSWNvbignY2FsZW5kYXItZGF5cycsICdcdTY1RTVcdTVGRDdcdTY1RTVcdTUzODYnLCAoKSA9PiB7IHRoaXMub3BlbkNhbGVuZGFyUGFuZWwoKTsgfSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdvcGVuLWxvZy1jYWxlbmRhcicsIG5hbWU6ICdcdTYyNTNcdTVGMDBcdTY1RTVcdTVGRDdcdTY1RTVcdTUzODYnLCBjYWxsYmFjazogKCkgPT4gdGhpcy5vcGVuQ2FsZW5kYXJQYW5lbCgpIH0pO1xuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgTG9nQ2FsZW5kYXJTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG4gIH1cblxuICBhc3luYyBvcGVuQ2FsZW5kYXJQYW5lbCgpIHtcbiAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSk7XG4gICAgaWYgKCFsZWFmKSByZXR1cm47XG4gICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiAnZW1wdHknIH0pO1xuICAgIGxlYWYudmlldy5jb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGxlYWYudmlldy5jb250YWluZXJFbC5zdHlsZS5vdmVyZmxvdyA9ICdhdXRvJztcbiAgICB0aGlzLmNhbGVuZGFyVmlldyA9IG5ldyBMb2dDYWxlbmRhclZpZXcodGhpcy5hcHAsIHRoaXMsIGxlYWYudmlldy5jb250YWluZXJFbCk7XG4gICAgYXdhaXQgdGhpcy5jYWxlbmRhclZpZXcubG9hZCgpO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCkgeyB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTsgfVxuICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7IGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7IH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFNldHRpbmdzIFRhYiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY2xhc3MgTG9nQ2FsZW5kYXJTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHBsdWdpbjogTG9nQ2FsZW5kYXJQbHVnaW47XG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IExvZ0NhbGVuZGFyUGx1Z2luKSB7IHN1cGVyKGFwcCwgcGx1Z2luKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH1cblxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICdcdTY1RTVcdTVGRDdcdTY1RTVcdTUzODYgXHUwMEI3IFx1OEJCRVx1N0Y2RScgfSk7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgXHU2NUU1XHU1RkQ3XHU4QkJFXHU3RjZFIFx1MjUwMFx1MjUwMFxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ1x1RDgzRFx1RENEMyBcdTY1RTVcdTVGRDdcdThCQkVcdTdGNkUnIH0pO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU2NUU1XHU1RkQ3XHU2NTg3XHU0RUY2XHU1OTM5JylcbiAgICAgIC5zZXREZXNjKCdcdTVCNThcdTY1M0VcdTY1RTVcdTVGRDdcdTdCMTRcdThCQjBcdTc2ODRcdTY1ODdcdTRFRjZcdTU5MzlcdTU0MERcdTc5RjAnKVxuICAgICAgLmFkZFRleHQodCA9PiB0LnNldFBsYWNlaG9sZGVyKCdMT0dcdTY1RTVcdTVGRDdcdThCQjBcdTVGNTUnKS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb2dGb2xkZXIpXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHsgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9nRm9sZGVyID0gdjsgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7IH0pKTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NjVFNVx1NjcxRlx1NjgwN1x1OTg5OFx1NjgzQ1x1NUYwRicpXG4gICAgICAuc2V0RGVzYygnXHU2NUU1XHU1RkQ3XHU5MUNDXHU2QkNGXHU1OTI5XHU2QkI1XHU4NDNEXHU3Njg0XHU2ODA3XHU5ODk4XHU2ODNDXHU1RjBGJylcbiAgICAgIC5hZGREcm9wZG93bihkID0+IGRcbiAgICAgICAgLmFkZE9wdGlvbignWVlZWU1NREQnLCAnMjAyNjA1MDFcdUZGMDhcdTlFRDhcdThCQTRcdUZGMDknKVxuICAgICAgICAuYWRkT3B0aW9uKCdZWVlZLU1NLUREJywgJzIwMjYtMDUtMDEnKVxuICAgICAgICAuYWRkT3B0aW9uKCdZWVlZL01NL0REJywgJzIwMjYvMDUvMDEnKVxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGF0ZUZvcm1hdClcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4geyB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYXRlRm9ybWF0ID0gdiBhcyBEYXRlRm9ybWF0OyBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTsgfSkpO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU5ODg0XHU4OUM4XHU4QkZCXHU1M0Q2XHU4ODRDXHU2NTcwXHU0RTBBXHU5NjUwJylcbiAgICAgIC5zZXREZXNjKCdcdTZCQ0ZcdTdCQzdcdTY1RTVcdTVGRDdcdTY3MDBcdTU5MUFcdTYyNkJcdTYzQ0ZcdTU5MUFcdTVDMTFcdTg4NENcdUZGMDhcdTY1NzBcdTVCNTdcdThEOEFcdTU5MjdcdThEOEFcdTYxNjJcdUZGMENcdTVFRkFcdThCQUUgMTAwXHUyMDEzNTAwXHVGRjA5JylcbiAgICAgIC5hZGRTbGlkZXIocyA9PiBzLnNldExpbWl0cyg1MCwgMTAwMCwgNTApLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnByZXZpZXdMaW5lcylcbiAgICAgICAgLnNldER5bmFtaWNUb29sdGlwKClcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4geyB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmV2aWV3TGluZXMgPSB2OyBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTsgfSkpO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIFRvZG8gXHU4QkJFXHU3RjZFIFx1MjUwMFx1MjUwMFxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ1x1MjcwNSBUb2RvIFx1OEJCRVx1N0Y2RScgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdUb2RvIFx1NjU4N1x1NEVGNlx1NTkzOScpXG4gICAgICAuc2V0RGVzYygnXHU1QjU4XHU2NTNFXHU0RUZCXHU1MkExXHU2NTg3XHU0RUY2XHU3Njg0XHU2NTg3XHU0RUY2XHU1OTM5XHU1NDBEXHU3OUYwXHVGRjA4XHU2QkNGXHU2NzA4XHU4MUVBXHU1MkE4XHU1MjFCXHU1RUZBXHU0RTAwXHU0RTJBXHU2NTg3XHU0RUY2XHVGRjBDXHU1OTgyIDIwMjYtMDUubWRcdUZGMDknKVxuICAgICAgLmFkZFRleHQodCA9PiB0LnNldFBsYWNlaG9sZGVyKCdUb2RvJykuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudG9kb0ZvbGRlcilcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4geyB0aGlzLnBsdWdpbi5zZXR0aW5ncy50b2RvRm9sZGVyID0gdjsgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7IH0pKTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NUI4Q1x1NjIxMFx1NEVGQlx1NTJBMVx1NTQwRVx1NzY4NFx1NTkwNFx1NzQwNicpXG4gICAgICAuc2V0RGVzYygnXHU0RkREXHU3NTU5XHU1RTc2XHU1MjEyXHU3RUJGIC8gXHU3NkY0XHU2M0E1XHU1MjIwXHU5NjY0IC8gXHU3OUZCXHU1MjMwXHU2NTg3XHU0RUY2XHU1RTk1XHU5MEU4XHU1RjUyXHU2ODYzXHU1MzNBJylcbiAgICAgIC5hZGREcm9wZG93bihkID0+IGRcbiAgICAgICAgLmFkZE9wdGlvbigna2VlcCcsICdcdTRGRERcdTc1NTlcdTVFNzZcdTY2M0VcdTc5M0FcdTUyMjBcdTk2NjRcdTdFQkYnKVxuICAgICAgICAuYWRkT3B0aW9uKCdkZWxldGUnLCAnXHU3NkY0XHU2M0E1XHU1MjIwXHU5NjY0JylcbiAgICAgICAgLmFkZE9wdGlvbignYXJjaGl2ZScsICdcdTVGNTJcdTY4NjNcdTUyMzBcdTY1ODdcdTRFRjZcdTVFOTVcdTkwRTgnKVxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkQWN0aW9uKVxuICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7IHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZEFjdGlvbiA9IHYgYXMgQ29tcGxldGVkQWN0aW9uOyBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTsgfSkpO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU4RkM3XHU2NzFGXHU2NzJBXHU1QjhDXHU2MjEwXHU0RUZCXHU1MkExJylcbiAgICAgIC5zZXREZXNjKCdcdTYyMkFcdTZCNjJcdTY1RTVcdTY3MUZcdTVERjJcdThGQzdcdTRGNDZcdTY3MkFcdTVCOENcdTYyMTBcdTc2ODRcdTRFRkJcdTUyQTFcdTU5ODJcdTRGNTVcdTU5MDRcdTc0MDYnKVxuICAgICAgLmFkZERyb3Bkb3duKGQgPT4gZFxuICAgICAgICAuYWRkT3B0aW9uKCdoaWdobGlnaHQnLCAnXHU3RUEyXHU4MjcyXHU5QUQ4XHU0RUFFXHU2M0QwXHU3OTNBJylcbiAgICAgICAgLmFkZE9wdGlvbigna2VlcCcsICdcdTZCNjNcdTVFMzhcdTY2M0VcdTc5M0FcdUZGMENcdTRFMERcdTYzRDBcdTc5M0EnKVxuICAgICAgICAuYWRkT3B0aW9uKCdyb2xsb3ZlcicsICdcdTgxRUFcdTUyQThcdTk4N0FcdTVFRjZcdTUyMzBcdTRFQ0FcdTU5MjlcdTY2M0VcdTc5M0EnKVxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Mub3ZlcmR1ZUFjdGlvbilcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4geyB0aGlzLnBsdWdpbi5zZXR0aW5ncy5vdmVyZHVlQWN0aW9uID0gdiBhcyBPdmVyZHVlQWN0aW9uOyBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTsgfSkpO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnVG9kbyBcdTk3NjJcdTY3N0ZcdTY3MDBcdTU5MjdcdTlBRDhcdTVFQTZcdUZGMDhweFx1RkYwOScpXG4gICAgICAuc2V0RGVzYygnXHU4RDg1XHU1MUZBXHU1NDBFXHU2NjNFXHU3OTNBXHU2RURBXHU1MkE4XHU2NzYxXHVGRjBDXHU1RUZBXHU4QkFFIDIwMFx1MjAxMzUwMCcpXG4gICAgICAuYWRkU2xpZGVyKHMgPT4gcy5zZXRMaW1pdHMoMTAwLCA2MDAsIDUwKS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy50b2RvUGFuZWxNYXhIZWlnaHQpXG4gICAgICAgIC5zZXREeW5hbWljVG9vbHRpcCgpXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHsgdGhpcy5wbHVnaW4uc2V0dGluZ3MudG9kb1BhbmVsTWF4SGVpZ2h0ID0gdjsgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7IH0pKTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7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
