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

## Settings

- **Parent properties**: comma-separated frontmatter keys that link to parents. Default: `up`.
- **Child properties**: comma-separated frontmatter keys that link to children. Default: `down`.

Everything runs locally. The plugin makes no network requests.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # production build
npm run lint
```

To test, copy `main.js`, `manifest.json` and `styles.css` to `<Vault>/.obsidian/plugins/toastcrumbs/`.
