import { useEffect } from "react"
import { KEYBOARD_SHORTCUTS } from "../config/shortcuts"

interface UseKeyboardShortcutsProps {
  onNewSession: () => void
  onOpenCommandPalette: () => void
  onOpenSettings: () => void
  onShowHelp: () => void
  onCloseModal: () => void
  onToggleSessionList: () => void
  isModalOpen: boolean
}

type ShortcutHandlers = Omit<UseKeyboardShortcutsProps, "isModalOpen">

/**
 * Custom hook to manage all keyboard shortcuts in the app.
 * Shortcuts are disabled when typing in input fields to prevent conflicts.
 */
export function useKeyboardShortcuts({
  onNewSession,
  onOpenCommandPalette,
  onOpenSettings,
  onShowHelp,
  onCloseModal,
  onToggleSessionList,
  isModalOpen,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handlers: ShortcutHandlers = {
      onNewSession,
      onOpenCommandPalette,
      onOpenSettings,
      onShowHelp,
      onCloseModal,
      onToggleSessionList,
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      const target = e.target as HTMLElement
      const isInputField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      // Escape: Close modal (works everywhere)
      if (e.key === "Escape" && isModalOpen) {
        e.preventDefault()
        onCloseModal()
        return
      }

      // Skip other shortcuts when typing in input fields
      if (isInputField && !isModalOpen) {
        return
      }

      // Process shortcuts from config
      for (const shortcut of KEYBOARD_SHORTCUTS) {
        // Skip Escape as it's handled above with modal context
        if (shortcut.key === "Escape") continue

        const modKeyMatch = shortcut.modKey ? isMod : true
        const shiftKeyMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey
        const keyMatch = e.key === shortcut.key

        if (modKeyMatch && shiftKeyMatch && keyMatch) {
          const handler = handlers[shortcut.handler as keyof ShortcutHandlers]
          if (!handler) continue
          e.preventDefault()
          handler()
          return
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onNewSession, onOpenCommandPalette, onOpenSettings, onShowHelp, onCloseModal, onToggleSessionList, isModalOpen])
}
