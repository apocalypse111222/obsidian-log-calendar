# 日志日历 Log Calendar

> An Obsidian plugin for people who write logs their own way — multiple days in one note, indexed by a calendar.

---

## The Problem This Solves

Most calendar plugins assume you write **one note per day**. But not everyone works that way.

Maybe you jot down a few days together after a busy stretch. Maybe you write by project cycle rather than by date. Maybe you only record the things worth remembering.

If that sounds like you, existing calendar plugins will either clutter your vault with hundreds of empty daily notes, or simply not work for you at all.

**Log Calendar** is built for this exact habit.

---

## How It Works

Write your logs however you like — one note per week, per trip, per project. Just use date headings inside the note:

```
**20260501**
Went to the museum. Surprisingly good.

**20260502**
Started the new project.

**20260503**
Fixed the sync issue. Finally.
```

Log Calendar scans your log folder, finds every date heading, and maps them onto a calendar. Click any highlighted date to jump directly to that section.

---

## Features

### 📅 Calendar View
- Monthly calendar in the right sidebar
- Dates with log entries show a dot + content preview
- Click a date → opens the note and scrolls to that exact section
- Clicking an already-open note just switches to it (no duplicate tabs)

### ✅ Todo Panel
- Below the calendar, a task panel appears when you select a date
- Tasks are stored in monthly files (`Todo/2026-05.md`)
- Each task is tagged with `@date:YYYYMMDD` for date filtering
- Check off tasks directly in the panel — state syncs to file instantly
- Three options for completed tasks: keep with strikethrough / delete / archive to bottom
- Overdue incomplete tasks can be highlighted in red or rolled over to today's view

### ⚙️ Settings
| Setting | Description |
|---------|-------------|
| Log folder | Folder where your log notes live |
| Date heading format | `20260501`, `2026-05-01`, or `2026/05/01` |
| Preview scan lines | How many lines to scan per file (default: 200) |
| Todo folder | Where monthly todo files are stored |
| Completed task action | Keep / Delete / Archive |
| Overdue task display | Highlight in red / Roll over to today / Normal |
| Todo panel max height | Scroll kicks in above this height (px) |

---

## Installation

### From Community Plugins (recommended)
1. Open Obsidian Settings → Community Plugins
2. Search for **Log Calendar**
3. Install and enable

### Manual
1. Download `main.js` and `manifest.json` from the [latest release](../../releases/latest)
2. Create a folder `.obsidian/plugins/obsidian-log-calendar/` in your vault
3. Copy both files into that folder
4. Enable the plugin in Settings → Community Plugins

---

## Setup

1. Enable the plugin — a calendar icon appears in the left ribbon
2. In Settings → Log Calendar, set your **log folder** name
3. Choose your **date heading format** to match how you already write
4. Click the ribbon icon to open the calendar panel

---

## Date Heading Formats

Your log entries need date headings in one of these formats (choose in settings):

| Format | Example |
|--------|---------|
| `YYYYMMDD` (default) | `20260501` or `**20260501**` |
| `YYYY-MM-DD` | `2026-05-01` |
| `YYYY/MM/DD` | `2026/05/01` |

Bold formatting (`**20260501**`) is also recognized automatically.

---

## Todo Format

Tasks are stored as standard Obsidian checkboxes with a date tag:

```markdown
- [ ] Buy groceries @date:20260509
- [x] Submit report @date:20260508
```

You can edit these files directly — the panel reflects changes on next click.

---

## Notes

- This plugin **does not** require one note per day
- Log notes and todo files can coexist in the same folder
- Todo files are plain Markdown — fully compatible with other plugins (Tasks, Dataview, etc.)

---

## License

MIT
