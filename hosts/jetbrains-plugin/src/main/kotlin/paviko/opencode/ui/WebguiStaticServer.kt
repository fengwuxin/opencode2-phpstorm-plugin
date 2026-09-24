package paviko.opencode.ui

import com.intellij.openapi.diagnostic.Logger
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.io.File
import java.net.InetSocketAddress
import java.net.URLDecoder
import java.util.concurrent.Executors

/**
 * Lightweight HTTP server that serves the embedded webgui-dist files
 * under the `/app/` prefix and injects the opencode server location into
 * index.html so the webgui can reach the opencode v2 REST API.
 *
 * Injected globals:
 *  - `window.__OPENCODE_SERVER_URL__`: absolute base URL of the opencode server
 *  - `window.__OPENCODE_AUTH__`: base64 encoded `opencode:<password>` credentials
 *
 * Mirrors hosts/vscode-plugin/src/ui/WebguiStaticServer.ts
 */
object WebguiStaticServer {
    private val LOG = Logger.getInstance(WebguiStaticServer::class.java)

    private data class Instance(val server: HttpServer, val base: String)
    private val instances = mutableMapOf<String, Instance>()

    private val MIME = mapOf(
        ".html" to "text/html; charset=utf-8",
        ".js" to "application/javascript; charset=utf-8",
        ".mjs" to "application/javascript; charset=utf-8",
        ".css" to "text/css; charset=utf-8",
        ".json" to "application/json; charset=utf-8",
        ".svg" to "image/svg+xml",
        ".png" to "image/png",
        ".jpg" to "image/jpeg",
        ".jpeg" to "image/jpeg",
        ".gif" to "image/gif",
        ".ico" to "image/x-icon",
        ".woff" to "font/woff",
        ".woff2" to "font/woff2",
        ".ttf" to "font/ttf",
        ".wasm" to "application/wasm",
        ".map" to "application/json",
    )

    @Synchronized
    fun start(root: String, opencodeServerUrl: String, authToken: String?): String {
        val canonicalRoot = File(root).canonicalPath
        val normalizedServerUrl = opencodeServerUrl.trimEnd('/')
        val key = "$canonicalRoot|$normalizedServerUrl|${authToken ?: ""}"

        val existing = instances[key]
        if (existing != null) return existing.base

        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0).apply {
            executor = Executors.newCachedThreadPool()
            createContext("/") { exchange -> handle(exchange, canonicalRoot, normalizedServerUrl, authToken) }
            start()
        }
        val base = "http://127.0.0.1:${server.address.port}"
        instances[key] = Instance(server, base)
        LOG.info("WebguiStaticServer started on $base serving $canonicalRoot")
        return base
    }

    @Synchronized
    fun stop() {
        val current = instances.values.toList()
        instances.clear()
        current.forEach { it.server.stop(0) }
    }

    @Synchronized
    fun stop(baseUrl: String) {
        val normalizedBase = baseUrl.trimEnd('/')
        val target = instances.entries.firstOrNull { it.value.base == normalizedBase } ?: return
        target.value.server.stop(0)
        instances.remove(target.key)
    }

    private fun handle(exchange: HttpExchange, rootDir: String, serverUrl: String, authToken: String?) {
        exchange.responseHeaders.apply {
            add("Access-Control-Allow-Origin", "*")
            add("Access-Control-Allow-Methods", "GET, OPTIONS")
            add("Access-Control-Allow-Headers", "Content-Type")
        }

        if (exchange.requestMethod == "OPTIONS") {
            exchange.sendResponseHeaders(204, -1)
            exchange.close()
            return
        }

        val pathname = try {
            URLDecoder.decode(exchange.requestURI.path ?: "/", "UTF-8")
        } catch (_: Throwable) {
            exchange.requestURI.path ?: "/"
        }

        // Must start with /app
        if (!pathname.startsWith("/app")) {
            if (pathname == "/") {
                exchange.responseHeaders.add("Location", "/app/")
                exchange.sendResponseHeaders(302, -1)
                exchange.close()
                return
            }
            exchange.sendResponseHeaders(404, -1)
            exchange.close()
            return
        }

        // Redirect /app (without trailing characters) to /app/ so the client-side
        // router doesn't misinterpret it as a base64-encoded directory path.
        if (pathname == "/app") {
            val query = exchange.requestURI.rawQuery
            val target = if (query != null) "/app/?$query" else "/app/"
            exchange.responseHeaders.add("Location", target)
            exchange.sendResponseHeaders(302, -1)
            exchange.close()
            return
        }

        // Strip /app prefix to get relative file path within webgui-dist
        var relative = pathname.removePrefix("/app")
        if (relative.isEmpty() || relative == "/") relative = "/index.html"

        val file = File(rootDir, relative).canonicalFile
        val rootPath = rootDir

        // Prevent directory traversal
        if (file.path != rootPath && !file.path.startsWith("$rootPath${File.separator}")) {
            exchange.sendResponseHeaders(403, -1)
            exchange.close()
            return
        }

        // Check if file exists
        if (!file.exists() || file.isDirectory) {
            val leaf = relative.substringAfterLast('/')
            val isSpaRoute = !leaf.contains('.')
            if (isSpaRoute) {
                val index = File(rootDir, "index.html")
                if (index.exists()) {
                    serveFile(exchange, index, true, serverUrl, authToken)
                    return
                }
            }
            exchange.sendResponseHeaders(404, -1)
            exchange.close()
            return
        }

        serveFile(exchange, file, file.name == "index.html", serverUrl, authToken)
    }

    private fun serveFile(exchange: HttpExchange, file: File, inject: Boolean, serverUrl: String, authToken: String?) {
        val ext = file.extension.let { if (it.isNotEmpty()) ".$it" else "" }.lowercase()
        val mime = MIME[ext] ?: "application/octet-stream"

        if (inject && ext == ".html") {
            var html = file.readText(Charsets.UTF_8)
            val script = buildString {
                append("<script>window.__OPENCODE_SERVER_URL__=\"")
                append(serverUrl.replace("\"", "\\\""))
                append("\";")
                if (!authToken.isNullOrEmpty()) {
                    append("window.__OPENCODE_AUTH__=\"")
                    append(authToken.replace("\"", "\\\""))
                    append("\";")
                }
                append("</script>")
            }
            val idx = html.indexOf("<script")
            html = if (idx != -1) {
                html.substring(0, idx) + script + "\n    " + html.substring(idx)
            } else {
                html.replace("</head>", "$script\n</head>")
            }
            val bytes = html.toByteArray(Charsets.UTF_8)
            exchange.responseHeaders.apply {
                add("Content-Type", mime)
                add("Cache-Control", "no-cache")
            }
            exchange.sendResponseHeaders(200, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
            return
        }

        val bytes = file.readBytes()
        exchange.responseHeaders.apply {
            add("Content-Type", mime)
            add("Cache-Control", if (ext == ".html") "no-cache" else "public, max-age=31536000, immutable")
        }
        exchange.sendResponseHeaders(200, bytes.size.toLong())
        exchange.responseBody.use { it.write(bytes) }
    }
}
