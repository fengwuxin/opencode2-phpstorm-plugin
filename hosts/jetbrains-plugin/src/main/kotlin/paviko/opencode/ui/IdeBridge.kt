package paviko.opencode.ui

import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.LogicalPosition
import com.intellij.openapi.editor.ScrollType
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.awt.Toolkit
import java.awt.datatransfer.DataFlavor
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.OutputStreamWriter
import java.net.InetSocketAddress
import java.net.URLDecoder
import java.util.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import javax.imageio.ImageIO

data class Session(
    val id: String,
    val token: String,
    val project: Project,
    val guiOnly: Boolean = false,
    val sseClients: MutableSet<HttpExchange> = Collections.synchronizedSet(mutableSetOf())
)

data class SessionInfo(val baseUrl: String, val token: String, val sessionId: String)

object IdeBridge {
    private val LOG = Logger.getInstance(IdeBridge::class.java)
    private val gson = Gson()
    
    private var server: HttpServer? = null
    private var port: Int = 0
    private val sessions = ConcurrentHashMap<String, Session>()
    private val projectToSession = ConcurrentHashMap<Project, String>()
    @Volatile private var executor = Executors.newCachedThreadPool()
    private var keepaliveTimer: java.util.Timer? = null

    private val minVersion: String by lazy {
        try {
            val props = java.util.Properties()
            IdeBridge::class.java.getResourceAsStream("/opencode-build.properties")?.use { props.load(it) }
            props.getProperty("opencode.min.version", "1.1.1")
        } catch (_: Throwable) { "1.1.1" }
    }

    @Synchronized
    fun start() {
        if (server != null) return

        // If stop() was called previously, executor may be shutdown.
        if (executor.isShutdown) executor = Executors.newCachedThreadPool()
        
        server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0).apply {
            executor = this@IdeBridge.executor
            createContext("/idebridge") { exchange -> handleRequest(exchange) }
            start()
        }
        port = server!!.address.port
        LOG.info("IdeBridge server started on port $port")
    }

    @Synchronized
    fun stop() {
        keepaliveTimer?.cancel()
        keepaliveTimer = null
        server?.stop(0)
        server = null
        sessions.clear()
        projectToSession.clear()
        try { executor.shutdownNow() } catch (_: Throwable) {}
    }

    fun createSession(project: Project, guiOnly: Boolean = false): SessionInfo {
        start() // ensure server is running
        
        // Remove any existing session for this project
        projectToSession[project]?.let { oldId ->
            removeSession(oldId)
        }
        
        val sessionId = UUID.randomUUID().toString()
        val token = UUID.randomUUID().toString()
        sessions[sessionId] = Session(sessionId, token, project, guiOnly)
        projectToSession[project] = sessionId
        
        // Start keepalive timer if not running
        if (keepaliveTimer == null) {
            keepaliveTimer = java.util.Timer("IdeBridge-Keepalive", true).apply {
                scheduleAtFixedRate(object : java.util.TimerTask() {
                    override fun run() {
                        sendKeepaliveToAll()
                    }
                }, 15000, 15000) // Every 15 seconds
            }
        }
        
        val baseUrl = "http://127.0.0.1:$port/idebridge/$sessionId"
        return SessionInfo(baseUrl, token, sessionId)
    }

    fun removeSession(sessionId: String) {
        sessions.remove(sessionId)?.let { session ->
            projectToSession.remove(session.project)
            synchronized(session.sseClients) {
                session.sseClients.forEach { 
                    try { it.close() } catch (_: Throwable) {}
                }
            }
        }
    }

    fun send(sessionId: String, type: String, payload: Map<String, Any?> = emptyMap()) {
        val session = sessions[sessionId] ?: return
        val msg = JsonObject().apply {
            addProperty("type", type)
            add("payload", gson.toJsonTree(payload))
            addProperty("timestamp", System.currentTimeMillis())
        }
        broadcastSSE(session, gson.toJson(msg))
    }

    /**
     * Whether a web UI session is attached for this project. The bundled UX+ web UI
     * registers one, the official opencode web UI does not.
     */
    fun isAttached(project: Project): Boolean = projectToSession.containsKey(project)
    
    /**
     * Send a message to UI using project reference (looks up session automatically).
     * Used by PathInserter, DragAndDropInstaller, and other utilities.
     */
    fun send(project: Project, type: String, payload: Map<String, Any?> = emptyMap()) {
        val sessionId = projectToSession[project]
        if (sessionId == null) {
            LOG.warn("No session found for project: ${project.name}")
            return
        }
        send(sessionId, type, payload)
    }
    
    private fun sendKeepaliveToAll() {
        sessions.values.forEach { session ->
            synchronized(session.sseClients) {
                val toRemove = mutableListOf<HttpExchange>()
                session.sseClients.forEach { client ->
                    try {
                        val writer = OutputStreamWriter(client.responseBody)
                        writer.write(": ping\n\n")
                        writer.flush()
                    } catch (e: Exception) {
                        toRemove.add(client)
                    }
                }
                toRemove.forEach {
                    session.sseClients.remove(it)
                    try { it.close() } catch (_: Throwable) {}
                }
            }
        }
    }

    private fun handleRequest(exchange: HttpExchange) {
        if (exchange.requestURI.path.contains("/events")) {
            val raw = exchange.requestURI.rawQuery ?: ""
            try {
                val params = parseQuery(raw)
                val sessionId = exchange.requestURI.path.split("/").filter { it.isNotEmpty() }.getOrNull(1)
                LOG.debug("IdeBridge events request session=$sessionId tokenPresent=${params["token"] != null}")
            } catch (_: Throwable) {}
        }
        // Add CORS headers
        exchange.responseHeaders.apply {
            add("Access-Control-Allow-Origin", "*")
            add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            add("Access-Control-Allow-Headers", "Content-Type")
        }

        if (exchange.requestMethod == "OPTIONS") {
            exchange.sendResponseHeaders(204, -1)
            exchange.close()
            return
        }

        // Parse path: /idebridge/{sessionId}/{action}
        val pathParts = exchange.requestURI.path.split("/").filter { it.isNotEmpty() }
        if (pathParts.size < 3 || pathParts[0] != "idebridge") {
            exchange.sendResponseHeaders(404, -1)
            exchange.close()
            return
        }

        val sessionId = pathParts[1]
        val action = pathParts[2]
        val session = sessions[sessionId]

        // Parse token from query
        val queryParams = parseQuery(exchange.requestURI.rawQuery ?: "")
        val token = queryParams["token"]

        if (session == null || session.token != token) {
            LOG.warn("IdeBridge unauthorized: sessionId=$sessionId action=$action")
            exchange.sendResponseHeaders(401, -1)
            exchange.close()
            return
        }

        when (action) {
            "events" -> handleSSE(exchange, session)
            "send" -> handleSend(exchange, session)
            else -> {
                exchange.sendResponseHeaders(404, -1)
                exchange.close()
            }
        }
    }

    private fun handleSSE(exchange: HttpExchange, session: Session) {
        exchange.responseHeaders.apply {
            add("Content-Type", "text/event-stream")
            add("Cache-Control", "no-cache, no-transform")
            add("Connection", "keep-alive")
            add("X-Accel-Buffering", "no") // Disable nginx buffering
        }
        exchange.sendResponseHeaders(200, 0)
        
        synchronized(session.sseClients) {
            session.sseClients.add(exchange)
        }
        
        // Send initial connection event
        try {
            val data = JsonObject().apply {
                addProperty("minVersion", minVersion)
                if (session.guiOnly) addProperty("customApi", false)
            }
            val writer = OutputStreamWriter(exchange.responseBody)
            writer.write("event: connected\ndata: ${gson.toJson(data)}\n\n")
            writer.flush()
        } catch (e: Exception) {
            synchronized(session.sseClients) {
                session.sseClients.remove(exchange)
            }
            try { exchange.close() } catch (_: Throwable) {}
        }
        
        // Keep connection open - will be cleaned up when client disconnects or session removed
    }

    private fun handleSend(exchange: HttpExchange, session: Session) {
        if (exchange.requestMethod != "POST") {
            exchange.sendResponseHeaders(405, -1)
            exchange.close()
            return
        }

        try {
            val body = exchange.requestBody.bufferedReader().readText()
            val msg = gson.fromJson(body, JsonObject::class.java)
            
            val type = msg.get("type")?.asString
            val id = msg.get("id")?.asString
            val payload = msg.getAsJsonObject("payload")

            when (type) {
                "openFile" -> {
                    val rawPath = payload?.get("path")?.asString
                    if (rawPath != null) {
                        val lineFromPayload1Based = payload.get("line")?.asInt ?: -1
                        val rangeRegex = Regex(":(\\d+)(?:-(\\d+))?$")
                        val match = rangeRegex.find(rawPath)
                        val startFromPath1Based = try {
                            match?.groupValues?.getOrNull(1)?.toInt()
                        } catch (_: Throwable) { null }
                        val endFromPath1Based = try {
                            match?.groupValues?.getOrNull(2)?.toInt()
                        } catch (_: Throwable) { null }
                        val cleanedPath = rawPath.replace(rangeRegex, "")

                        val startLine1Based = if (lineFromPayload1Based > 0) lineFromPayload1Based else startFromPath1Based ?: -1
                        val endLine1Based = endFromPath1Based ?: -1

                        val startLine0Based = if (startLine1Based > 0) startLine1Based - 1 else -1
                        val endLine0Based = if (endLine1Based > 0) endLine1Based - 1 else -1

                        openFile(session.project, cleanedPath, startLine0Based, endLine0Based)
                        replyOk(session, id)
                    } else {
                        replyError(session, id, "Missing path")
                    }
                }
                "openUrl" -> {
                    val url = payload?.get("url")?.asString
                    if (url != null) {
                        BrowserUtil.browse(url)
                        replyOk(session, id)
                    } else {
                        replyError(session, id, "Missing url")
                    }
                }
                "reloadPath" -> {
                    val path = payload?.get("path")?.asString
                    if (path != null) {
                        reloadPath(path)
                        replyOk(session, id)
                    } else {
                        replyError(session, id, "Missing path")
                    }
                }
                "kv.get" -> {
                    val file = File(statePath, "kv.json")
                    val data = try {
                        if (file.exists()) gson.fromJson(file.readText(), JsonObject::class.java) ?: JsonObject()
                        else JsonObject()
                    } catch (_: Throwable) { JsonObject() }
                    replyWithPayload(session, id, data)
                }

                "kv.update" -> {
                    val file = File(statePath, "kv.json")
                    val existing = try {
                        if (file.exists()) gson.fromJson(file.readText(), JsonObject::class.java) ?: JsonObject()
                        else JsonObject()
                    } catch (_: Throwable) { JsonObject() }
                    payload?.entrySet()?.forEach { (k, v) -> existing.add(k, v) }
                    statePath.mkdirs()
                    file.writeText(gson.toJson(existing))
                    replyWithPayload(session, id, existing)
                }

                "model.get" -> {
                    fun blank() = JsonObject().apply {
                        add("recent", JsonArray())
                        add("favorite", JsonArray())
                        add("variant", JsonObject())
                        add("user", JsonArray())
                    }
                    val file = File(statePath, "model.json")
                    val data = try {
                        if (!file.exists()) blank()
                        else {
                            val raw = gson.fromJson(file.readText(), JsonObject::class.java) ?: JsonObject()
                            JsonObject().apply {
                                add("recent", if (raw.has("recent") && raw.get("recent").isJsonArray) raw.getAsJsonArray("recent") else JsonArray())
                                add("favorite", if (raw.has("favorite") && raw.get("favorite").isJsonArray) raw.getAsJsonArray("favorite") else JsonArray())
                                add("variant", if (raw.has("variant") && raw.get("variant").isJsonObject) raw.getAsJsonObject("variant") else JsonObject())
                                add("user", if (raw.has("user") && raw.get("user").isJsonArray) raw.getAsJsonArray("user") else JsonArray())
                            }
                        }
                    } catch (_: Throwable) {
                        blank()
                    }
                    replyWithPayload(session, id, data)
                }

                "model.update" -> {
                    val file = File(statePath, "model.json")
                    val existing = try {
                        if (file.exists()) gson.fromJson(file.readText(), JsonObject::class.java) ?: JsonObject()
                        else JsonObject()
                    } catch (_: Throwable) { JsonObject() }
                    if (!existing.has("recent") || !existing.get("recent").isJsonArray) existing.add("recent", JsonArray())
                    if (!existing.has("favorite") || !existing.get("favorite").isJsonArray) existing.add("favorite", JsonArray())
                    if (!existing.has("variant") || !existing.get("variant").isJsonObject) existing.add("variant", JsonObject())
                    if (!existing.has("user") || !existing.get("user").isJsonArray) existing.add("user", JsonArray())
                    if (payload?.has("recent") == true) existing.add("recent", payload.get("recent"))
                    if (payload?.has("favorite") == true) existing.add("favorite", payload.get("favorite"))
                    if (payload?.has("user") == true) existing.add("user", payload.get("user"))
                    if (payload?.has("variant") == true) {
                        val current = existing.getAsJsonObject("variant")
                        payload.getAsJsonObject("variant").entrySet().forEach { (k, v) -> current.add(k, v) }
                    }
                    statePath.mkdirs()
                    file.writeText(gson.toJson(existing))
                    replyWithPayload(session, id, existing)
                }

                "settings.get" -> {
                    replyWithPayload(session, id, readSettings())
                }

                "settings.update" -> {
                    val current = readSettings()
                    val merged = JsonObject().apply {
                        current.entrySet().forEach { (k, v) -> add(k, v) }
                        payload?.entrySet()?.forEach { (k, v) -> add(k, v) }
                    }
                    val normalized = normalizeSettings(merged)
                    statePath.mkdirs()
                    File(statePath, "settings.json").writeText(gson.toJson(normalized))
                    replyWithPayload(session, id, normalized)
                }

                // opencode v2 has no config write API (the CLI only reads opencode.json(c)),
                // so the settings panel edits the global config file through the IDE.
                "config.read" -> {
                    val file = globalConfigFile()
                    val exists = file.exists()
                    replyWithPayload(session, id, JsonObject().apply {
                        addProperty("path", file.absolutePath)
                        addProperty("exists", exists)
                        addProperty("text", if (exists) file.readText() else "")
                    })
                }

                "config.write" -> {
                    val text = payload?.get("text")?.asString
                    if (text == null) {
                        replyError(session, id, "Missing text")
                    } else {
                        val file = globalConfigFile()
                        writeTextAtomically(file, text)
                        replyWithPayload(session, id, JsonObject().apply {
                            addProperty("path", file.absolutePath)
                        })
                    }
                }

                // Embedded browsers do not always expose clipboard images to the page, so the
                // web UI asks the IDE for the clipboard content when the user pastes.
                "clipboardRead" -> {
                    replyWithPayload(session, id, readClipboard())
                }

                else -> replyError(session, id, "Unknown type: $type")
            }

            exchange.sendResponseHeaders(204, -1)
        } catch (e: Exception) {
            LOG.warn("Error handling send", e)
            exchange.sendResponseHeaders(400, -1)
        }
        exchange.close()
    }

    private val statePath: File
        get() = File(
            System.getenv("XDG_STATE_HOME") ?: "${System.getProperty("user.home")}/.local/state",
            "opencode"
        )

    private fun readSettings(): JsonObject {
        val file = File(statePath, "settings.json")
        val data = try {
            if (file.exists()) gson.fromJson(file.readText(), JsonObject::class.java) ?: JsonObject()
            else JsonObject()
        } catch (_: Throwable) { JsonObject() }
        return normalizeSettings(data)
    }

    private fun normalizeSettings(raw: JsonObject): JsonObject {
        val normalized = JsonObject()
        raw.entrySet().forEach { (k, v) -> normalized.add(k, v) }

        if (normalized.has("theme")) {
            val theme = normalized.get("theme")
            val valid = theme != null && theme.isJsonPrimitive && theme.asJsonPrimitive.isString &&
                (theme.asString == "light" || theme.asString == "dark")
            if (!valid) {
                normalized.remove("theme")
            }
        }

        return normalized
    }

    /**
     * Global opencode config file, resolved the same way the CLI does it: prefer an
     * existing opencode.json, then opencode.jsonc, otherwise create opencode.json.
     */
    private fun globalConfigFile(): File {
        val dir = File(System.getenv("XDG_CONFIG_HOME") ?: "${System.getProperty("user.home")}/.config", "opencode")
        val json = File(dir, "opencode.json")
        val jsonc = File(dir, "opencode.jsonc")
        return when {
            json.exists() -> json
            jsonc.exists() -> jsonc
            else -> json
        }
    }

    /**
     * Reads the system clipboard for the web UI: an image is returned as a PNG data URL,
     * otherwise the plain text. Copying a screenshot often puts a text flavour (the file
     * path) on the clipboard too, so the image wins when both are present.
     */
    private fun readClipboard(): JsonObject {
        val clipboard = try {
            Toolkit.getDefaultToolkit().systemClipboard
        } catch (_: Throwable) {
            null
        }

        if (clipboard != null) {
            try {
                if (clipboard.isDataFlavorAvailable(DataFlavor.imageFlavor)) {
                    val image = clipboard.getData(DataFlavor.imageFlavor) as? java.awt.Image
                    if (image != null) {
                        val png = encodePng(image)
                        return JsonObject().apply {
                            addProperty("kind", "image")
                            addProperty("mime", "image/png")
                            addProperty("size", png.size)
                            addProperty("dataUrl", "data:image/png;base64," + Base64.getEncoder().encodeToString(png))
                        }
                    }
                }
            } catch (_: Throwable) {
            }
        }

        val text = try {
            clipboard?.getData(DataFlavor.stringFlavor) as? String
        } catch (_: Throwable) {
            null
        }

        return JsonObject().apply {
            if (text.isNullOrEmpty()) {
                addProperty("kind", "empty")
            } else {
                addProperty("kind", "text")
                addProperty("text", text)
            }
        }
    }

    /** Converts a clipboard image into PNG bytes. */
    private fun encodePng(image: java.awt.Image): ByteArray {
        val width = image.getWidth(null).coerceAtLeast(1)
        val height = image.getHeight(null).coerceAtLeast(1)
        val buffered = BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB)
        val graphics = buffered.createGraphics()
        try {
            graphics.drawImage(image, 0, 0, null)
        } finally {
            graphics.dispose()
        }
        val out = ByteArrayOutputStream()
        ImageIO.write(buffered, "png", out)
        return out.toByteArray()
    }

    /** Writes through a temp file so a crash cannot leave a truncated config behind. */
    private fun writeTextAtomically(file: File, text: String) {
        file.parentFile?.mkdirs()
        val temp = File(file.parentFile, "${file.name}.tmp")
        temp.writeText(text)
        java.nio.file.Files.move(
            temp.toPath(),
            file.toPath(),
            java.nio.file.StandardCopyOption.REPLACE_EXISTING,
            java.nio.file.StandardCopyOption.ATOMIC_MOVE
        )
    }

    private fun replyWithPayload(session: Session, id: String?, payload: Any) {
        if (id == null) return
        val msg = JsonObject().apply {
            addProperty("replyTo", id)
            addProperty("ok", true)
            add("payload", gson.toJsonTree(payload))
            addProperty("timestamp", System.currentTimeMillis())
        }
        broadcastSSE(session, gson.toJson(msg))
    }

    private fun replyOk(session: Session, id: String?) {
        if (id == null) return
        val msg = JsonObject().apply {
            addProperty("replyTo", id)
            addProperty("ok", true)
            addProperty("timestamp", System.currentTimeMillis())
        }
        broadcastSSE(session, gson.toJson(msg))
    }

    private fun replyError(session: Session, id: String?, error: String) {
        if (id == null) return
        val msg = JsonObject().apply {
            addProperty("replyTo", id)
            addProperty("ok", false)
            addProperty("error", error)
            addProperty("timestamp", System.currentTimeMillis())
        }
        broadcastSSE(session, gson.toJson(msg))
    }

    private fun broadcastSSE(session: Session, json: String) {
        synchronized(session.sseClients) {
            val toRemove = mutableListOf<HttpExchange>()
            session.sseClients.forEach { client ->
                try {
                    val writer = OutputStreamWriter(client.responseBody)
                    writer.write("event: message\ndata: $json\n\n")
                    writer.flush()
                } catch (e: Exception) {
                    toRemove.add(client)
                }
            }
            toRemove.forEach { 
                session.sseClients.remove(it)
                try { it.close() } catch (_: Throwable) {}
            }
        }
    }

    private fun openFile(project: Project, rawPath: String, startLine: Int, endLine: Int) {
        try {
            val lfs = LocalFileSystem.getInstance()
            val vf = lfs.findFileByPath(rawPath) ?: lfs.refreshAndFindFileByPath(rawPath)
            if (vf != null) {
                ApplicationManager.getApplication().invokeLater {
                    val fm = FileEditorManager.getInstance(project)
                    if (startLine >= 0) {
                        try {
                            val desc = OpenFileDescriptor(project, vf, startLine, 0)
                            try { desc.isUseCurrentWindow = true } catch (_: Throwable) {}
                            val ed = try { fm.openTextEditor(desc, true) } catch (_: Throwable) { null }
                            if (ed == null) fm.openFile(vf, true) else try {
                                val doc = ed.document
                                val lineCount = doc.lineCount
                                val clampedStart = startLine.coerceIn(0, (lineCount - 1).coerceAtLeast(0))
                                val targetEnd = if (endLine >= 0) endLine else startLine
                                val clampedEnd = targetEnd.coerceIn(clampedStart, (lineCount - 1).coerceAtLeast(0))

                                val pos = LogicalPosition(clampedStart.coerceAtLeast(0), 0)
                                ed.caretModel.moveToLogicalPosition(pos)

                                if (clampedEnd > clampedStart) {
                                    val startOffset = doc.getLineStartOffset(clampedStart)
                                    val endOffset = doc.getLineEndOffset(clampedEnd)
                                    ed.selectionModel.setSelection(startOffset, endOffset)
                                } else {
                                    ed.selectionModel.removeSelection()
                                }

                                ed.scrollingModel.scrollToCaret(ScrollType.CENTER)
                            } catch (_: Throwable) {}
                        } catch (_: Throwable) {
                            fm.openFile(vf, true)
                        }
                    } else {
                        fm.openFile(vf, true)
                    }
                }
            }
        } catch (t: Throwable) {
            LOG.warn("openFile failed", t)
        }
    }

    private fun reloadPath(path: String) {
        try {
            val lfs = LocalFileSystem.getInstance()
            val vf = lfs.findFileByPath(path) ?: lfs.refreshAndFindFileByPath(path)
            if (vf != null) {
                // Use async=true to avoid blocking EDT during VFS refresh
                vf.refresh(true, false)
            } else {
                // File doesn't exist yet (new file), refresh parent directory asynchronously
                val parentPath = path.substringBeforeLast("/")
                val parentVf = lfs.findFileByPath(parentPath) ?: lfs.refreshAndFindFileByPath(parentPath)
                parentVf?.refresh(true, true)
            }
        } catch (t: Throwable) {
            LOG.warn("reloadPath failed", t)
        }
    }

    private fun parseQuery(query: String): Map<String, String> {
        return query.split("&")
            .filter { it.isNotEmpty() }
            .associate { param ->
                val parts = param.split("=", limit = 2)
                val key = URLDecoder.decode(parts[0], "UTF-8")
                val value = if (parts.size > 1) URLDecoder.decode(parts[1], "UTF-8") else ""
                key to value
            }
    }
}
