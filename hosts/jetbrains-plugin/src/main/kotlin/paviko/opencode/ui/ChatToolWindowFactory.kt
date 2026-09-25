package paviko.opencode.ui


import com.intellij.openapi.diagnostic.Logger

import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.util.concurrency.AppExecutorUtil
import com.intellij.util.ui.JBUI
import org.cef.browser.CefBrowser
import org.cef.callback.CefAuthCallback
import org.cef.handler.CefRequestHandlerAdapter
import paviko.opencode.backendprocess.BackendLauncher
import paviko.opencode.backendprocess.BackendLaunch
import java.awt.BorderLayout
import java.awt.Font
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import javax.swing.SwingConstants
import java.time.Duration
import java.util.Base64
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import javax.swing.*

class ChatToolWindowFactory : ToolWindowFactory, DumbAware {
    private var connectionInfo: ConnInfo? = null
    private val logger = Logger.getInstance(ChatToolWindowFactory::class.java)
    private val maxLogChars = 200_000

    private fun showError(mainPanel: JPanel, hideableLogs: JComponent, message: String) {
        mainPanel.removeAll()
        mainPanel.add(JPanel(BorderLayout()).apply {
            add(JLabel("<html><center>$message</center></html>"), BorderLayout.CENTER)
        }, BorderLayout.CENTER)
        mainPanel.add(hideableLogs, BorderLayout.SOUTH)
        mainPanel.revalidate()
        mainPanel.repaint()
    }

    private fun pluginVersion(): String {
        return javaClass.`package`?.implementationVersion ?: java.time.LocalDate.now().toString()
    }

    private fun withCacheBuster(url: String, version: String): String {
        val encodedVersion = URLEncoder.encode(version, StandardCharsets.UTF_8)
        val sep = if (url.contains("?")) "&" else "?"
        return if (url.contains("v=")) url else "${url}${sep}v=${encodedVersion}"
    }

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        // vertical=true => top/bottom split; top takes 100% initially (logs collapsed)
        val mainPanel = JPanel(BorderLayout())
        val content = toolWindow.contentManager.factory.createContent(mainPanel, "", false)
        toolWindow.contentManager.addContent(content)

        if (!JBCefApp.isSupported()) {
            val notSupported = JPanel(BorderLayout()).apply {
                add(JLabel("当前平台不支持 JCEF", SwingConstants.CENTER), BorderLayout.CENTER)
            }
            mainPanel.add(notSupported, BorderLayout.CENTER)
            return
        }

        val logArea = JTextArea().apply {
            font = Font(Font.MONOSPACED, Font.PLAIN, 12)
            isEditable = false
            lineWrap = true
            wrapStyleWord = true
        }
        val logScroll = JScrollPane(logArea)

        // Create collapsible logs panel (collapsed by default)
        val logsPanel = JPanel(BorderLayout()).apply {
            border = JBUI.Borders.empty(4)
            add(logScroll, BorderLayout.CENTER)
        }
        val hideableLogs = com.intellij.ui.HideableTitledPanel("后端日志（合并 stdout/stderr）", false)
        hideableLogs.setContentComponent(logsPanel)

        // Placeholder center until browser loads
        mainPanel.add(JPanel(BorderLayout()).apply {
            add(JLabel("正在启动……", SwingConstants.CENTER), BorderLayout.CENTER)
        }, BorderLayout.CENTER)
        // Add collapsible logs at the bottom
        mainPanel.add(hideableLogs, BorderLayout.SOUTH)

        val procRef = AtomicReference<paviko.opencode.backendprocess.BackendProcess?>(null)
        val connected = AtomicBoolean(false)
        val logLock = Any()
        val logBuffer = StringBuilder()
        val logFlushScheduled = AtomicBoolean(false)

        fun scheduleLogFlush() {
            if (!logFlushScheduled.compareAndSet(false, true)) return
            SwingUtilities.invokeLater {
                val chunk = synchronized(logLock) {
                    val s = logBuffer.toString()
                    logBuffer.setLength(0)
                    s
                }
                logArea.append(chunk)
                try {
                    val doc = logArea.document
                    val overflow = doc.length - maxLogChars
                    if (overflow > 0) doc.remove(0, overflow)
                } catch (_: Throwable) {}

                logFlushScheduled.set(false)

                // If new logs arrived while we were flushing, schedule again.
                val hasMore = synchronized(logLock) { logBuffer.isNotEmpty() }
                if (hasMore) scheduleLogFlush()
            }
        }

        fun queueLog(line: String) {
            synchronized(logLock) {
                logBuffer.append(line).append('\n')
            }
            scheduleLogFlush()
        }

        val timeoutMs = 180_000L
        val timeoutFuture = AppExecutorUtil.getAppScheduledExecutorService().schedule({
            if (connected.get()) return@schedule
            logger.warn("Backend connection timeout after ${timeoutMs}ms")
            SwingUtilities.invokeLater {
                showError(
                    mainPanel,
                    hideableLogs,
                    "后端连接超时。<br/>请确认已安装 opencode v2，并查看下方日志。<br/>" +
                        "可执行文件路径可在 设置 | 工具 | OpenCode 插件 中配置。"
                )
            }
            try { procRef.get()?.destroy() } catch (_: Throwable) {}
            try { procRef.get()?.inputStream?.close() } catch (_: Throwable) {}
        }, timeoutMs, TimeUnit.MILLISECONDS)

        Disposer.register(toolWindow.disposable) {
            timeoutFuture.cancel(false)
            try { procRef.get()?.destroy() } catch (_: Throwable) {}
            try { procRef.get()?.inputStream?.close() } catch (_: Throwable) {}
        }

        AppExecutorUtil.getAppExecutorService().execute {
            val launch = try {
                BackendLauncher.launchBackend(project)
            } catch (e: Exception) {
                logger.error("Failed to launch backend", e)
                SwingUtilities.invokeLater {
                    showError(mainPanel, hideableLogs, "启动后端失败：<br/>${e.message}<br/><br/>详情请查看日志。")
                }
                timeoutFuture.cancel(false)
                return@execute
            }
            procRef.set(launch.process)

            val reader = BufferedReader(InputStreamReader(launch.process.inputStream, StandardCharsets.UTF_8))
            val logThread = Thread {
                try {
                    var line: String?
                    // opencode v2 prints the listening URL first and the generated password
                    // afterwards (only when no password was supplied through the environment).
                    var serverUrl: String? = null
                    var reportedPassword: String? = null

                    while (reader.readLine().also { line = it } != null) {
                        val l = line!!.trim()
                        queueLog(l)

                        if (connected.get()) continue

                        extractServerUrl(l)?.let { serverUrl = it }
                        extractPassword(l)?.let { reportedPassword = it }

                        val url = serverUrl ?: continue
                        val password = launch.password ?: reportedPassword ?: envPassword() ?: continue

                        try {
                            val version = probeServer(url, password)
                            procRef.get()?.stopCapture()
                            connectionInfo = ConnInfo(URI(url).port, "$url/")
                            connected.set(true)
                            timeoutFuture.cancel(false)
                            logger.info("opencode v$version backend detected at $url")

                            SwingUtilities.invokeLater {
                                showBrowser(project, toolWindow, mainPanel, hideableLogs, url, password)
                            }
                        } catch (e: Exception) {
                            logger.warn("Failed to connect to opencode backend at $url", e)
                            SwingUtilities.invokeLater {
                                showError(
                                    mainPanel,
                                    hideableLogs,
                                    "连接 opencode 后端失败：<br/>${e.message}<br/><br/>详情请查看日志。"
                                )
                            }
                            timeoutFuture.cancel(false)
                        }
                    }
                } catch (e: Exception) {
                    logger.error("Error reading backend output", e)
                    SwingUtilities.invokeLater {
                        showError(mainPanel, hideableLogs, "后端通信错误：<br/>${e.message}")
                    }
                } finally {
                    try { reader.close() } catch (_: Throwable) {}
                }
            }
            logThread.isDaemon = true
            logThread.start()
        }
    }

    /**
     * Creates the JCEF browser and loads the opencode web UI.
     *
     * The bundled UX+ web UI is used when it is part of the plugin resources, otherwise
     * the official opencode v2 web UI is loaded. HTTP basic auth is answered automatically
     * so the UI can reach the protected API.
     */
    private fun showBrowser(
        project: Project,
        toolWindow: ToolWindow,
        mainPanel: JPanel,
        hideableLogs: JComponent,
        serverUrl: String,
        password: String
    ) {
        try {
            val uri = URI(serverUrl)
            val client = JBCefApp.getInstance().createClient()
            val browser = JBCefBrowser.createBuilder()
                .setClient(client)
                .build()

            // opencode v2 protects every /api call with basic auth; answer the challenge
            // instead of letting the embedded browser show a login dialog.
            client.addRequestHandler(
                BasicAuthHandler(uri.host, uri.port, BackendLauncher.PASSWORD_USER, password),
                browser.cefBrowser
            )

            try {
                DragAndDropInstaller.install(project, browser, logger)
            } catch (e: Exception) {
                logger.warn("Failed to set up drag and drop", e)
            }

            mainPanel.removeAll()
            mainPanel.add(browser.component, BorderLayout.CENTER)
            mainPanel.add(hideableLogs, BorderLayout.SOUTH)
            mainPanel.revalidate()
            mainPanel.repaint()

            browser.loadURL(buildUiUrl(project, toolWindow, browser, serverUrl, password))
        } catch (e: Exception) {
            logger.error("Failed to create browser component", e)
            showError(mainPanel, hideableLogs, "创建浏览器组件失败：<br/>${e.message}")
        }
    }

    /**
     * Builds the URL to load: the bundled UX+ web UI when it is available, the official
     * opencode v2 web UI otherwise.
     */
    private fun buildUiUrl(
        project: Project,
        toolWindow: ToolWindow,
        browser: JBCefBrowser,
        serverUrl: String,
        password: String
    ): String {
        if (javaClass.classLoader.getResource("webgui-app/index.html") == null) {
            return withCacheBuster("$serverUrl/", pluginVersion())
        }

        val webguiDir = extractWebguiResources()
        val authToken = Base64.getEncoder()
            .encodeToString("${BackendLauncher.PASSWORD_USER}:$password".toByteArray(StandardCharsets.UTF_8))
        val staticBase = WebguiStaticServer.start(webguiDir, serverUrl, authToken)
        val session = IdeBridge.createSession(project)

        Disposer.register(toolWindow.disposable) {
            IdeBridge.removeSession(session.sessionId)
            try { WebguiStaticServer.stop(staticBase) } catch (_: Throwable) {}
        }

        try {
            val filesUpdater = IdeOpenFilesUpdater(project, browser, session.sessionId)
            filesUpdater.install()
            Disposer.register(browser, filesUpdater)
        } catch (e: Exception) {
            logger.warn("Failed to install IdeOpenFilesUpdater", e)
        }

        val baseUrl = withCacheBuster("$staticBase/app", pluginVersion())
        return buildString {
            append(baseUrl)
            append(if ('?' in baseUrl) '&' else '?')
            append("ideBridge=")
            append(URLEncoder.encode(session.baseUrl, StandardCharsets.UTF_8))
            append("&ideBridgeToken=")
            append(URLEncoder.encode(session.token, StandardCharsets.UTF_8))
        }
    }

    /**
     * Extract bundled webgui-app resources from the JAR/classpath to a temp directory.
     * Uses webgui-app/file-list.txt (generated at build time) to enumerate files.
     */
    private fun extractWebguiResources(): String {
        val dest = File(System.getProperty("java.io.tmpdir"), "opencode-webgui")
        runCatching {
            val deleted = dest.deleteRecursively()
            if (!deleted && dest.exists()) {
                logger.warn("Could not fully delete webgui temp directory ${dest.absolutePath}, continuing")
            }
        }.onFailure {
            logger.warn("Failed to delete webgui temp directory ${dest.absolutePath}, continuing", it)
        }

        runCatching {
            val created = dest.mkdirs()
            if (!created && !dest.exists()) {
                logger.warn("Could not create webgui temp directory ${dest.absolutePath}, continuing")
            }
        }.onFailure {
            logger.warn("Failed to create webgui temp directory ${dest.absolutePath}, continuing", it)
        }

        val listing = javaClass.classLoader.getResourceAsStream("webgui-app/file-list.txt")
            ?.bufferedReader()
            ?.useLines { lines ->
                lines
                    .map { it.trim() }
                    .filter { it.isNotBlank() }
                    .map { it.removePrefix("./").trimStart('/').replace('\\', '/') }
                    .toList()
            }
            ?: throw RuntimeException("webgui-app/file-list.txt not found in classpath")

        var copied = 0
        for (rel in listing) {
            val input = javaClass.classLoader.getResourceAsStream("webgui-app/$rel")
            if (input == null) {
                logger.warn("Missing bundled webgui resource webgui-app/$rel, skipping")
                continue
            }
            val target = File(dest, rel)
            runCatching {
                val parent = target.parentFile
                val parentCreated = parent.mkdirs()
                if (!parentCreated && !parent.exists()) {
                    logger.warn("Could not create parent directory ${parent.absolutePath} for $rel, continuing")
                }
                input.use { src -> target.outputStream().use { out -> src.copyTo(out) } }
                copied++
            }.onFailure {
                logger.warn("Failed to extract webgui resource $rel to ${target.absolutePath}, continuing", it)
            }
        }

        logger.info("Extracted $copied/${listing.size} webgui files to ${dest.absolutePath}")
        return dest.absolutePath
    }

    /**
     * Answers HTTP basic auth challenges for the local opencode server only.
     */
    private class BasicAuthHandler(
        private val host: String?,
        private val port: Int,
        private val user: String,
        private val password: String
    ) : CefRequestHandlerAdapter() {
        override fun getAuthCredentials(
            browser: CefBrowser?,
            originUrl: String?,
            isProxy: Boolean,
            host: String?,
            port: Int,
            realm: String?,
            scheme: String?,
            callback: CefAuthCallback?
        ): Boolean {
            if (isProxy || callback == null) return false
            if (host == null || host != this.host || port != this.port) return false
            callback.Continue(user, password)
            return true
        }
    }

    /**
     * Queries `/api/info` with basic auth and returns the reported opencode version.
     * Fails when the endpoint is missing (older servers) or the password is rejected.
     */
    private fun probeServer(serverUrl: String, password: String): String {
        val credentials = Base64.getEncoder()
            .encodeToString("${BackendLauncher.PASSWORD_USER}:$password".toByteArray(StandardCharsets.UTF_8))
        val request = HttpRequest.newBuilder(URI("$serverUrl/api/info"))
            .header("Authorization", "Basic $credentials")
            .timeout(Duration.ofSeconds(10))
            .GET()
            .build()

        val response = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build()
            .send(request, HttpResponse.BodyHandlers.ofString())

        if (response.statusCode() == 401) {
            throw IllegalStateException("authentication failed (HTTP 401). Unset OPENCODE_PASSWORD or restart the IDE.")
        }
        if (response.statusCode() != 200) {
            throw IllegalStateException("unexpected response HTTP ${response.statusCode()}. opencode v2.0.0 or newer is required.")
        }

        val version = Regex("\"version\"\\s*:\\s*\"([^\"]+)\"").find(response.body())?.groupValues?.get(1)
            ?: throw IllegalStateException("could not read the server version from /api/info")

        val major = version.substringBefore('.').toIntOrNull()
        if (major == null || major < 2) {
            throw IllegalStateException("opencode $version detected, but v2.0.0 or newer is required")
        }
        return version
    }

    /** Reads the password from the IDE environment as a last resort. */
    private fun envPassword(): String? {
        return System.getenv(BackendLauncher.PASSWORD_ENV)?.takeIf { it.isNotBlank() }
            ?: System.getenv("OPENCODE_SERVER_PASSWORD")?.takeIf { it.isNotBlank() }
    }

    private companion object {
        /** opencode v2 prints `server listening on http://host:port` (v1 prefixed it with `opencode `). */
        val SERVER_URL_REGEX = Regex("(?:opencode\\s+)?server listening on (https?://\\S+)", RegexOption.IGNORE_CASE)

        /** Printed by opencode v2 when it generated the HTTP API password itself. */
        val PASSWORD_REGEX = Regex("server password (\\S+)", RegexOption.IGNORE_CASE)

        fun extractServerUrl(line: String): String? =
            SERVER_URL_REGEX.find(line)?.groupValues?.get(1)?.trimEnd('/')

        fun extractPassword(line: String): String? =
            PASSWORD_REGEX.find(line)?.groupValues?.get(1)
    }
}
