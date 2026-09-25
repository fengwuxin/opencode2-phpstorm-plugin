# OpenCode UX —— JetBrains / PhpStorm 插件

面向 **opencode v2** 的非官方 [opencode](https://opencode.ai) 插件，支持 JetBrains 全家桶
（PhpStorm、IntelliJ IDEA、WebStorm 等）。

它为你当前打开的项目启动 `opencode serve`，并把聊天界面嵌进工具窗口，另外提供了一些 IDE 集成能力。

[简体中文](README.md) | [English](README.en.md)

## 功能

- 使用系统已安装的 `opencode`（v2）为当前项目启动后端，插件不内置后端二进制
- 工具窗口内的聊天界面，会话列表按当前项目过滤
- 从 Project 视图拖拽文件到输入框，直接加入上下文
- 通过菜单或快捷键把当前文件 / 选中行加入上下文（`Ctrl/Cmd + \`、`Ctrl/Cmd + Shift + \`）
- 点击消息里的文件路径直接在编辑器中打开
- 自动处理 opencode 服务端的 HTTP Basic 鉴权

## 环境要求

- **opencode v2.0.0 或更高版本**，已安装且在 `PATH` 中（或在设置里指定路径）
- IntelliJ 系 IDE **2024.3（build 243）或更高版本**，且启用了 JCEF

## 安装

1. 从 Releases 下载 `opencode-plugin-gui-only-<版本>.zip`（也可以自行构建，见下文）
2. IDE 中打开 `Settings → Plugins → ⚙ → Install Plugin from Disk…`
3. 选择该 zip 并重启 IDE
4. 打开右侧的 **OpenCode** 工具窗口

如果之前装过上游 `paviko` 的版本，请先卸载 —— 两者注册的是同一个工具窗口。

## 设置

`Settings → Tools → OpenCode Plug`

| 设置项 | 说明 |
| --- | --- |
| opencode executable | `opencode` 可执行文件的绝对路径；留空则自动查找（homebrew、nvm、bun、`~/.local/bin`、`PATH`） |
| Additional serve args | 追加到 `opencode serve` 之后的额外参数 |

## 工作原理

1. 插件在 IDE 终端里以项目目录为工作目录启动 `opencode serve`，并注入随机生成的 `OPENCODE_PASSWORD`，
   让 HTTP API 既可访问又受保护
2. 等待输出 `server listening on http://…`，并通过 `GET /api/info` 校验服务端
3. 内置的本地静态服务器托管 web UI，并把服务端地址与鉴权信息注入页面
4. UI 通过 opencode v2 的 REST API（`/api/*`）和 `/api/event` 事件流通信，事件会被投影回
   UI 使用的消息/片段模型

## 从源码构建

前置条件：JDK 21 与 [bun](https://bun.sh)（也可以用 pnpm/npm）。

```bash
JAVA_HOME=/path/to/jdk-21 ./hosts/scripts/build_jetbrains.sh
```

可选参数：

```bash
# 复用已经构建好的 web UI
JAVA_HOME=/path/to/jdk-21 ./hosts/scripts/build_jetbrains.sh --skip-webgui

# 使用本地已安装的 IDE 编译，避免下载完整 IDEA 发行版
JAVA_HOME=/path/to/jdk-21 ./hosts/scripts/build_jetbrains.sh --local-ide /Applications/PhpStorm.app
```

插件 zip 会生成到 `hosts/jetbrains-plugin/build/distributions/`。

## 说明

- 这是只支持 v2 的分支：已移除内置的 v1 后端二进制和 v1 REST 兼容层
- 在设置面板中修改 opencode 配置、以及会话分享，v2 API 暂不支持，目前是空实现
- 与 opencode 官方团队、以及上游 `opencode-ide-plugin` 项目均无隶属关系

## 致谢

- [opencode](https://github.com/anomalyco/opencode) —— 智能体本体与其 web UI
- [paviko/opencode-ide-plugin](https://github.com/paviko/opencode-ide-plugin) —— 本分支基于的原始 IDE 插件

## 许可

MIT，详见 [LICENSE](LICENSE)。
