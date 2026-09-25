# OpenCode GUI Only — JetBrains / PhpStorm plugin

Unofficial [opencode](https://opencode.ai) plugin for JetBrains IDEs (PhpStorm, IntelliJ IDEA, WebStorm, ...),
built for **opencode v2**.

It runs the `opencode serve` process for the project you have open and embeds the chat UI in a tool window,
with a few IDE integrations on top.

[English](README.md) | [简体中文](README.zh.md)

## Features

- Runs the locally installed `opencode` (v2) for the current project — no backend is bundled
- Chat UI in a tool window, scoped to the current project
- Drag and drop files from the Project view into the prompt
- Add the current file / selected line ranges to the prompt via action or shortcut
  (`Ctrl/Cmd + \`, `Ctrl/Cmd + Shift + \`)
- Clicking a file path in a message opens it in the editor
- HTTP basic auth of the opencode server is handled automatically

## Requirements

- **opencode v2.0.0 or newer**, installed and available on `PATH` (or configured in the settings)
- IntelliJ based IDE **2024.3 (build 243) or newer**, with JCEF enabled

## Installation

1. Download `opencode-plugin-gui-only-<version>.zip` from the releases page (or build it, see below)
2. In the IDE: `Settings → Plugins → ⚙ → Install Plugin from Disk…`
3. Select the zip and restart the IDE
4. Open the **OpenCode** tool window (right side)

If you previously installed the upstream `paviko` build, uninstall it first — it registers the same tool window.

## Settings

`Settings → Tools → OpenCode Plug`

| Setting | Description |
| --- | --- |
| opencode executable | Absolute path to the `opencode` binary. Empty = auto detect (homebrew, nvm, bun, `~/.local/bin`, `PATH`) |
| Additional serve args | Extra arguments appended to `opencode serve` |

## How it works

1. The plugin starts `opencode serve` in the IDE terminal with the project directory as working directory
   and a generated `OPENCODE_PASSWORD`, so the HTTP API is protected and reachable
2. It waits for the `server listening on http://…` line and verifies the server through `GET /api/info`
3. The bundled web UI is served from a local static server which injects the server URL and credentials
4. The UI talks to the opencode v2 REST API (`/api/*`) and consumes the `/api/event` stream, which is
   projected back onto the message/part model the UI renders

## Building from source

Prerequisites: JDK 21 and [bun](https://bun.sh) (or pnpm/npm).

```bash
JAVA_HOME=/path/to/jdk-21 ./hosts/scripts/build_jetbrains.sh
```

Options:

```bash
# reuse an already built web UI
JAVA_HOME=/path/to/jdk-21 ./hosts/scripts/build_jetbrains.sh --skip-webgui

# compile against a locally installed IDE instead of downloading one
JAVA_HOME=/path/to/jdk-21 ./hosts/scripts/build_jetbrains.sh --local-ide /Applications/PhpStorm.app
```

The plugin zip is written to `hosts/jetbrains-plugin/build/distributions/`.

## Notes

- This is a v2-only fork: the bundled v1 backend binaries and the v1 REST compatibility layer were removed
- Editing the opencode configuration from the settings panel and session sharing are not supported by the
  v2 API and are currently no-ops
- Not affiliated with the opencode team or with the upstream `opencode-ide-plugin` project

## Credits

- [opencode](https://github.com/anomalyco/opencode) — the agent and its web UI
- [paviko/opencode-ide-plugin](https://github.com/paviko/opencode-ide-plugin) — the original IDE plugin this fork is based on

## License

MIT — see [LICENSE](LICENSE).
