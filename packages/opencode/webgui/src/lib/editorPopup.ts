/**
 * Tracks open editor popovers (@ mentions, / commands) so the send-on-Enter
 * handler can defer to the popover while it is open.
 */
const openPopups = new Set<string>()

export function setEditorPopupOpen(id: string, open: boolean) {
  if (open) openPopups.add(id)
  else openPopups.delete(id)
}

export function isEditorPopupOpen() {
  return openPopups.size > 0
}
