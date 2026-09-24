package paviko.opencode.ui

import com.intellij.openapi.diagnostic.Logger
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.util.concurrency.AppExecutorUtil
import java.awt.datatransfer.DataFlavor
import java.awt.dnd.DnDConstants
import java.awt.dnd.DropTarget
import java.awt.dnd.DropTargetAdapter
import java.awt.dnd.DropTargetDropEvent

object DragAndDropInstaller {
    fun install(project: com.intellij.openapi.project.Project, browser: JBCefBrowser, logger: Logger) {
        val comp = browser.component
        val dt = DropTarget(comp, object : DropTargetAdapter() {
            override fun drop(dtde: DropTargetDropEvent) {
                try {
                    dtde.acceptDrop(DnDConstants.ACTION_COPY)
                    val t = dtde.transferable
                    val flavor = DataFlavor.javaFileListFlavor
                    if (t.isDataFlavorSupported(flavor)) {
                        val files = try {
                            @Suppress("UNCHECKED_CAST")
                            t.getTransferData(flavor) as List<java.io.File>
                        } catch (e: Exception) {
                            logger.warn("Failed to read dropped files", e)
                            emptyList()
                        }

                        if (files.isEmpty()) return

                        AppExecutorUtil.getAppExecutorService().execute {
                            val filePaths = files.asSequence().filter { it.isFile }.map { it.absolutePath }.toList()
                            if (filePaths.isNotEmpty()) {
                                PathInserter.insertPaths(project, filePaths)
                            }

                            val dirPaths = files.asSequence().filter { it.isDirectory }.map { it.absolutePath }.toList()
                            for (dp in dirPaths) {
                                PathInserter.pastePath(project, dp)
                            }

                            try {
                                javax.swing.SwingUtilities.invokeLater {
                                    try { browser.cefBrowser.setFocus(true) } catch (_: Throwable) {}
                                    try { browser.component.requestFocusInWindow() } catch (_: Throwable) {}
                                    try { browser.component.requestFocus() } catch (_: Throwable) {}
                                }
                            } catch (_: Throwable) {}
                        }
                    }
                } catch (e: Exception) {
                    logger.warn("Error handling file drop", e)
                } finally {
                    dtde.dropComplete(true)
                    // Ensure focus is restored even if JavaScript focus didn't take effect yet
                    try {
                        javax.swing.SwingUtilities.invokeLater {
                            try { browser.cefBrowser.setFocus(true) } catch (_: Throwable) {}
                            try { browser.component.requestFocusInWindow() } catch (_: Throwable) {}
                            try { browser.component.requestFocus() } catch (_: Throwable) {}
                        }
                    } catch (_: Throwable) { }
                }
            }
        })
        comp.dropTarget = dt
    }
}
