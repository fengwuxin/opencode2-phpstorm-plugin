/**
 * Minimal opencode v2 REST client.
 *
 * The IDE plugin injects two globals when it serves this UI:
 *  - `window.__OPENCODE_SERVER_URL__`: absolute base URL of the opencode v2 server
 *  - `window.__OPENCODE_AUTH__`: base64 encoded `opencode:<password>` for HTTP basic auth
 *
 * When the globals are absent (plain `vite dev`), relative URLs are used and no
 * authorization header is attached.
 */

export const apiBase: string =
  ((globalThis as unknown as { __OPENCODE_SERVER_URL__?: string }).__OPENCODE_SERVER_URL__ ?? "").replace(/\/$/, "")

const authToken: string | undefined = (globalThis as unknown as { __OPENCODE_AUTH__?: string }).__OPENCODE_AUTH__

let requestDirectory: string | undefined

/** Sets the project directory sent with every request (opencode resolves it per request). */
export function setRequestDirectory(directory: string | null | undefined) {
  requestDirectory = directory || undefined
}

/** The project directory currently used for API requests. */
export function getRequestDirectory(): string | undefined {
  return requestDirectory
}

export function buildHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init)
  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Basic ${authToken}`)
  }
  if (requestDirectory && !headers.has("x-opencode-directory")) {
    headers.set("x-opencode-directory", requestDirectory)
  }
  return headers
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${apiBase}${path}`, { ...init, headers: buildHeaders(init?.headers) })
}

/** Performs a JSON request and unwraps the `{ data }` envelope used by opencode v2. */
export async function apiData<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init)
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`${init?.method ?? "GET"} ${path} failed: HTTP ${response.status}${body ? ` ${body.slice(0, 200)}` : ""}`)
  }
  if (response.status === 204) return undefined as T
  const payload = (await response.json()) as { data?: T } | T
  return (payload as { data?: T }).data ?? (payload as T)
}

export function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }
}
