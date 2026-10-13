# Toastcrumbs

An Obsidian plugin that shows a VS Code–style tree of the notes below (or above) the active note. The tree comes from links in the frontmatter, not from folders.

```yaml
---
up:
  - "[[world model]]"
  - "[[reinforcement learning algorithm]]"
---
```

Links are symmetric: when `A.md` has `up: [[B]]`, **B** shows **A** as a child, just as if **B** had `down: [[A]]`.

## Features

- **Follows the active note.** The tree is rooted at the note you're viewing. Select the pin button to keep the current root while you browse.
- **Branches up or down.** The arrow button in the toolbar at the top of the panel switches between showing a note's children and its parents (ancestors). The choice is remembered with the workspace layout.
- **Handles any link graph.** Cycles are fine. A note that already appears above itself is marked with a cycle icon and isn't expanded again.
- **Shows missing notes.** Links to notes that don't exist are shown greyed out. Selecting one creates the note.
- **Stays fast on large vaults.** The index is built once from Obsidian's metadata cache and then updated one file at a time. Only expanded nodes are rendered.
- **Supports the usual shortcuts.** Hover for a page preview. Mod-click opens a note in a new tab.

## Navigation commands

These come from the former *Navigate to property link* plugin:

- **Open a property link**: pick any frontmatter link in the current note and open it.
- **Open <property>**: one command for each property listed under **Property commands** in settings, for example **Open up**.
- **Follow frontmatter link under cursor**: opens the quoted `"[[link]]"` under the cursor. Quoted frontmatter links are also styled as links in the editor.
- **Open a date note**: type a date in plain language ("next friday", "2025-03") to open its daily, weekly, monthly, quarterly or yearly note. The path formats are set in settings.
- **Open this file in Zotero**: opens `zotero://select/items/@<note name>`, for notes named by citation key.

## Settings

- **Parent properties**: comma-separated frontmatter keys that link to parents. Default: `up`.
- **Child properties**: comma-separated frontmatter keys that link to children. Default: `down`.
- **Property commands**: properties that each get an **Open <property>** command, one per line.
- **Day/Week/Month/Quarter/Year note path**: [Moment format](https://momentjs.com/docs/#/displaying/format/) for each periodic note's path, e.g. `[journal/]YYYY-MM-DD`.

Everything runs locally. The plugin makes no network requests. **Open this file in Zotero** only hands a `zotero://` link to your system.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # production build
npm run lint
```

To test, copy `main.js`, `manifest.json` and `styles.css` to `<Vault>/.obsidian/plugins/toastcrumbs/`.
