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
    description: "Open command palette",
    category: "General",
    handler: "onOpenCommandPalette",
    modKey: true,
    key: "k",
  },
  {
    id: "new-session",
    keys: ["Cmd/Ctrl", "N"],
    description: "New session",
    category: "General",
    handler: "onNewSession",
    modKey: true,
    key: "n",
  },
  {
    id: "settings",
    keys: ["Cmd/Ctrl", ","],
    description: "Open settings",
    category: "General",
    handler: "onOpenSettings",
    modKey: true,
    key: ",",
  },
  {
    id: "help",
    keys: ["?"],
    description: "Show keyboard shortcuts",
    category: "General",
    handler: "onShowHelp",
    shiftKey: true,
    key: "?",
  },
  {
    id: "close-modal",
    keys: ["Escape"],
    description: "Close modal/dialog",
    category: "General",
    handler: "onCloseModal",
    key: "Escape",
  },

  // Messages
  {
    id: "send-message",
    keys: ["Enter"],
    description: "Send message",
    category: "Messages",
    handler: "onSendMessage",
    key: "Enter",
  },
  {
    id: "new-line",
    keys: ["Cmd/Ctrl/Shift", "Enter"],
    description: "Insert a new line",
    category: "Messages",
    handler: "onInsertNewLine",
    modKey: true,
    key: "Enter",
  },

  // Navigation
  {
    id: "toggle-session-list",
    keys: ["Cmd/Ctrl", "B"],
    description: "Toggle session list",
    category: "Navigation",
    handler: "onToggleSessionList",
    modKey: true,
    key: "b",
  },
]
