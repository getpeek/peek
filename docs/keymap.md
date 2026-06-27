# Keymap

Peek's keyboard shortcuts are configurable. Every shortcut has a built-in default; you override
only the ones you want to change in `~/peek/settings.json`.

## How it works

The keymap maps a **key combo** to an **action**:

```json
{
  "keymap": {
    "q": "Tool::Query",
    "meta-p": "CommandPalette::Open"
  }
}
```

Your `keymap` is a **partial** — Peek unions it over the built-in defaults, and your entries win.
Anything you leave out keeps its default binding, so you never have to redeclare the whole set.

`~/peek/settings.json` validates against `settings.schema.json` (written next to it on startup),
so editors autocomplete action names and flag typos.

### Merge rules

- Merging is **by key**: setting `"meta-1": "Tool::Query"` makes `meta-1` run Query. Whatever
  `meta-1` did before is replaced.
- An action can have **more than one key** — list it under each (the command palette opens on both
  `meta-p` and `meta-shift-p` by default).
- Binding a key to an action does **not** unbind that action's _other_ keys. To truly relocate a
  shortcut, reassign its old key too — otherwise the action stays reachable from its default key.
  Example — move Query from `q` to `meta-1` and free up `q`:
  ```json
  { "keymap": { "meta-1": "Tool::Query", "q": "Tool::Agent" } }
  ```
- An entry whose action isn't recognized is **ignored** (and logged); the rest of your settings are
  unaffected.

## Key syntax

A combo is a lowercase **trigger** key, optionally prefixed with modifiers joined by `-`:

- Modifiers: `meta` (⌘), `shift`, `alt`, `ctrl`.
- Trigger: a letter/number (`q`, `0`), punctuation (`.`, `[`, `]`), an arrow (`arrowup`,
  `arrowdown`, `arrowleft`, `arrowright`), or `escape` / `enter` / `space` / `tab` / `backspace`.

Modifier order doesn't matter (`meta-shift-0` == `shift-meta-0`). Examples: `q`, `meta-z`,
`shift-meta-z`, `meta-shift-0`, `meta-arrowleft`, `escape`.

Shortcuts (except `escape`) don't fire while a text input, `<textarea>`, or the SQL editor is
focused.

## Actions

Action names are `Group::Variant`. The full set, with default bindings:

### Tool — switch the active canvas tool

| Action              | Default  | Description                                    |
| ------------------- | -------- | ---------------------------------------------- |
| `Tool::Select`      | `escape` | Deselect everything and leave the current tool |
| `Tool::LassoSelect` | `l`      | Lasso selection tool                           |
| `Tool::Query`       | `q`      | Place a query node                             |
| `Tool::Agent`       | `a`      | Place an agent node                            |
| `Tool::Text`        | `t`      | Place a text node                              |
| `Tool::Variable`    | `v`      | Place a variable node                          |
| `Tool::Draw`        | `d`      | Draw / pen tool                                |

### Edit — clipboard and selection

| Action                  | Default     | Description                   |
| ----------------------- | ----------- | ----------------------------- |
| `Edit::Cut`             | `meta-x`    | Cut selected nodes            |
| `Edit::Copy`            | `meta-c`    | Copy selected nodes           |
| `Edit::Paste`           | `meta-v`    | Paste nodes                   |
| `Edit::SelectAll`       | `meta-a`    | Select every node on the page |
| `Edit::DeleteSelection` | `backspace` | Delete selected nodes         |

### History

| Action          | Default        | Description |
| --------------- | -------------- | ----------- |
| `History::Undo` | `meta-z`       | Undo        |
| `History::Redo` | `shift-meta-z` | Redo        |

### Zoom

| Action          | Default        | Description           |
| --------------- | -------------- | --------------------- |
| `Zoom::Reset`   | `meta-0`       | Reset zoom to 100%    |
| `Zoom::FitView` | `meta-shift-0` | Fit all nodes in view |

### Page — pages and node navigation

| Action                      | Default           | Description                    |
| --------------------------- | ----------------- | ------------------------------ |
| `Page::New`                 | `meta-t`          | New page                       |
| `Page::Close`               | `meta-w`          | Close the active page          |
| `Page::Previous`            | `meta-shift-[`    | Previous page                  |
| `Page::Next`                | `meta-shift-]`    | Next page                      |
| `Page::SelectPreviousQuery` | `meta-[`          | Select the previous query node |
| `Page::SelectNextQuery`     | `meta-]`          | Select the next query node     |
| `Page::SelectNodeLeft`      | `meta-arrowleft`  | Select the node to the left    |
| `Page::SelectNodeRight`     | `meta-arrowright` | Select the node to the right   |
| `Page::SelectNodeUp`        | `meta-arrowup`    | Select the node above          |
| `Page::SelectNodeDown`      | `meta-arrowdown`  | Select the node below          |

### View

| Action           | Default  | Description             |
| ---------------- | -------- | ----------------------- |
| `View::ToggleUi` | `meta-.` | Show/hide the UI chrome |

### Result

| Action           | Default   | Description                           |
| ---------------- | --------- | ------------------------------------- |
| `Result::Pivot`  | `shift-p` | Pivot/transpose selected result nodes |
| `Result::Search` | `meta-f`  | Search within the selected result     |

### Other

| Action                   | Default                  | Description                |
| ------------------------ | ------------------------ | -------------------------- |
| `CommandPalette::Open`   | `meta-p`, `meta-shift-p` | Open the command palette   |
| `ConnectionPicker::Open` | `p`                      | Open the connection picker |
| `App::Quit`              | `meta-q`                 | Quit Peek                  |

## Not configurable

Context-local keys aren't part of the keymap: pressing `escape` to dismiss a popover, `enter` to
submit a form, the SQL editor's `meta-enter` (run) / `meta-s` (format), and holding `space` to pan
during a selection.
