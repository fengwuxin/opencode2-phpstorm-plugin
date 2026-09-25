export interface ShortcutDefinition {
  id: string
  keys: string[]
  description: string
  category: "General" | "Messages" | "Navigation"
  handler: string
  modKey?: boolean
  shiftKey?: boolean
  key: string
}

export const KEYBOARD_SHORTCUTS: ShortcutDefinition[] = [
  // General
  {
    id: "command-palette",
    keys: ["Cmd/Ctrl", "K"],
    description: "打开命令面板",
    category: "General",
    handler: "onOpenCommandPalette",
    modKey: true,
    key: "k",
  },
  {
    id: "new-session",
    keys: ["Cmd/Ctrl", "N"],
    description: "新建会话",
    category: "General",
    handler: "onNewSession",
    modKey: true,
    key: "n",
  },
  {
    id: "settings",
    keys: ["Cmd/Ctrl", ","],
    description: "打开设置",
    category: "General",
    handler: "onOpenSettings",
    modKey: true,
    key: ",",
  },
  {
    id: "help",
    keys: ["?"],
    description: "显示快捷键",
    category: "General",
    handler: "onShowHelp",
    shiftKey: true,
    key: "?",
  },
  {
    id: "close-modal",
    keys: ["Escape"],
    description: "关闭弹窗/对话框",
    category: "General",
    handler: "onCloseModal",
    key: "Escape",
  },

  // Messages
  {
    id: "send-message",
    keys: ["Enter"],
    description: "发送消息",
    category: "Messages",
    handler: "onSendMessage",
    key: "Enter",
  },
  {
    id: "new-line",
    keys: ["Cmd/Ctrl/Shift", "Enter"],
    description: "插入换行",
    category: "Messages",
    handler: "onInsertNewLine",
    modKey: true,
    key: "Enter",
  },

  // Navigation
  {
    id: "toggle-session-list",
    keys: ["Cmd/Ctrl", "B"],
    description: "切换会话列表",
    category: "Navigation",
    handler: "onToggleSessionList",
    modKey: true,
    key: "b",
  },
]
