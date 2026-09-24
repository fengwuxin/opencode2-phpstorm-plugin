package paviko.opencode.ui

import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.openapi.project.Project
import java.awt.datatransfer.StringSelection

/**
 * Utility to send file paths (and optional :start-end ranges) to the embedded web UI.
 *
 * The bundled UX+ web UI understands the ideBridge protocol. The official opencode v2
 * web UI does not, so in that case the path is copied to the clipboard instead of being
 * silently dropped.
 */
object PathInserter {
    private val logger = Logger.getInstance(PathInserter::class.java)
    private const val NOTIFICATION_GROUP = "paviko.opencode.notifications"

    fun insertPaths(project: Project, paths: List<String>): Boolean {
        if (paths.isEmpty()) return false
        if (!IdeBridge.isAttached(project)) {
            fallbackToClipboard(project, paths.joinToString(" "))
            return false
        }

        try {
            IdeBridge.send(project, "insertPaths", mapOf("paths" to paths))
            return true
        } catch (e: Exception) {
            logger.error("Unexpected error inserting paths", e)
            return false
        }
    }

    fun pastePath(project: Project, path: String): Boolean {
        if (path.isEmpty()) return false
        if (!IdeBridge.isAttached(project)) {
            fallbackToClipboard(project, path)
            return false
        }

        try {
            IdeBridge.send(project, "pastePath", mapOf("path" to path))
            return true
        } catch (e: Exception) {
            logger.error("Unexpected error pasting path", e)
            return false
        }
    }

    private fun fallbackToClipboard(project: Project, text: String) {
        try {
            CopyPasteManager.getInstance().setContents(StringSelection(text))
        } catch (e: Exception) {
            logger.warn("Failed to copy path to clipboard", e)
            return
        }

        NotificationGroupManager.getInstance()
            .getNotificationGroup(NOTIFICATION_GROUP)
            .createNotification(
                "Path copied to clipboard. The opencode v2 web UI cannot receive paths directly yet - paste it with Ctrl/Cmd+V.",
                NotificationType.INFORMATION
            )
            .notify(project)
    }
}
