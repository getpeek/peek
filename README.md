<div align="center">
    <picture>
    <source media="(prefers-color-scheme: dark)" srcset="/public/logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="/public/logo.png">
    <img alt="Peek" height="128" src="/public/logo-dark.png">
    </picture>
</div>

# Peek

Peek is an Infinite Canvas Database GUI. Users can add query nodes, which when executed will spawn Result nodes. Foreign keys and references are clickable, which when clicked on spawn new result nodes. You can also interact with AI agent nodes, freehand draw on the canvas, place variable nodes connected to queries and a lot more.

![Peek Screenshot](/public/peek.png)

## Demo

There is an interactive demo on the [Peek website](https://getpeek.dev), as well as [demo videos](https://getpeek.dev/#features) on various features.

## Installation

Either grab a prebuilt .dmg from the releases page or run

```sh
git clone git@github.com/getpeek/peek.git
cd peek
yarn tauri build
```

## Configuration

Most of Peek can be configured in the UI, but a `~/peek/settings.json` will be generated on launch with a companion `~/peek/settings.schema.json` for IDE autocomplete support.

For a full configuration reference see [the configuration page](http://getpeek.dev/docs/configuration).
