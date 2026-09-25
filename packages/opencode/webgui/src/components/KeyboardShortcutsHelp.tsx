import { KEYBOARD_SHORTCUTS } from "../config/shortcuts"
import { Modal, ModalHeader, ModalBody } from "./common"

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const categories = Array.from(new Set(KEYBOARD_SHORTCUTS.map((s) => s.category)))
  const categoryLabels: Record<string, string> = {
    General: "通用",
    Messages: "消息",
    Navigation: "导航",
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader onClose={onClose}>
        <h2 id="shortcuts-help-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          快捷键
        </h2>
      </ModalHeader>

      <ModalBody className="max-h-[60vh] overflow-y-auto">
        {/* Shortcuts by category */}
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === category)
            return (
              <div key={category}>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {categoryLabels[category] ?? category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-800 dark:bg-gray-800/50"
                    >
                      <span className="text-sm text-gray-900 dark:text-gray-100">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <kbd
                            key={keyIdx}
                            className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-2 dark:border-blue-900 dark:bg-blue-950/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>提示：</strong>随时按{" "}
            <kbd className="rounded border border-blue-300 bg-white px-1.5 py-0.5 text-xs font-semibold dark:border-blue-700 dark:bg-blue-900">
              ?
            </kbd>{" "}
            可以打开这个帮助对话框。
          </p>
        </div>
      </ModalBody>
    </Modal>
  )
}
