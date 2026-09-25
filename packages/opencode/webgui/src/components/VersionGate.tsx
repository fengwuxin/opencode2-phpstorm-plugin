import { t } from "../lib/i18n"
import { useEffect, useState, type ReactNode } from "react"
import { ideBridge } from "../lib/ideBridge"
import { apiFetch } from "../lib/api/v2/client"

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number)
  const pb = b.split(".").map(Number)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb) return na - nb
  }
  return 0
}

type State =
  | { status: "loading" }
  | { status: "ok" }
  | { status: "outdated"; installed: string; required: string }

export function VersionGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    // If no ideBridge installed, skip the gate entirely
    if (!ideBridge.isInstalled()) {
      setState({ status: "ok" })
      return
    }

    let cancelled = false

    const check = async () => {
      const min = ideBridge.minVersion
      if (!min) {
        if (!cancelled) setState({ status: "ok" })
        return
      }

      try {
        const res = await apiFetch("/api/info")
        if (!res.ok) {
          if (!cancelled) setState({ status: "ok" })
          return
        }
        const json = (await res.json()) as { version?: string }
        if (!json.version) {
          if (!cancelled) setState({ status: "ok" })
          return
        }
        if (compareVersions(json.version, min) < 0) {
          if (!cancelled) setState({ status: "outdated", installed: json.version, required: min })
        } else {
          if (!cancelled) setState({ status: "ok" })
        }
      } catch {
        if (!cancelled) setState({ status: "ok" })
      }
    }

    // If minVersion is already available (reconnect scenario), check immediately
    if (ideBridge.minVersion) {
      check()
      return () => { cancelled = true }
    }

    // Wait for the SSE "connected" event which populates minVersion
    const listener = () => { check() }
    window.addEventListener("opencode:idebridge-connected", listener, { once: true })

    // Safety net: never block the whole UI on the IDE bridge handshake.
    const fallback = window.setTimeout(() => {
      if (!ideBridge.minVersion && !cancelled) setState({ status: "ok" })
    }, 5000)

    return () => {
      cancelled = true
      window.clearTimeout(fallback)
      window.removeEventListener("opencode:idebridge-connected", listener)
    }
  }, [])

  if (state.status === "loading") return null

  if (state.status === "outdated") {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-950 p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("OpenCode 版本不兼容")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t("已安装的 OpenCode 服务版本与此插件不兼容。")}
          </p>
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">{t("最低要求")}</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{state.required}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">{t("当前已安装")}</span>
              <span className="font-mono font-semibold text-red-600 dark:text-red-400">{state.installed}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("请将 OpenCode 更新到版本")} <span className="font-mono font-semibold">{state.required}</span> {t("或更高版本以继续。")}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
