import { useState, useRef } from "react"
import { sdk } from "../../../../lib/api/sdkClient"
import { ideBridge } from "../../../../lib/ideBridge"

interface ManualCodeState {
  providerId: string
  id: string
  instructions?: string
}

interface UseOAuthFlowProps {
  configuredProviders: string[]
  setConfiguredProviders: (providers: string[]) => void
  selectedProviderToAdd: string
  setSelectedProviderToAdd: (provider: string) => void
  markProvidersDirty: () => void
}

export function useOAuthFlow({
  configuredProviders,
  setConfiguredProviders,
  selectedProviderToAdd,
  setSelectedProviderToAdd,
  markProvidersDirty,
}: UseOAuthFlowProps) {
  const [authStatus, setAuthStatus] = useState<Record<string, string>>({})
  const [manualCodeState, setManualCodeState] = useState<ManualCodeState | null>(null)
  const [authInstructions, setAuthInstructions] = useState<Record<string, string>>({})
  const [manualCodeInput, setManualCodeInput] = useState("")
  const pollIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  const handleOAuthLogin = async (providerId: string, methodIndex: number) => {
    try {
      setAuthStatus((prev) => ({ ...prev, [providerId]: "初始化..." }))
      const { id, url, method, instructions } = await sdk.auth.start(providerId, methodIndex, {})

      if (instructions) {
        setAuthInstructions((prev) => ({ ...prev, [providerId]: instructions }))
      }

      if (url) {
        if (ideBridge.isInstalled()) {
          ideBridge.send({ type: "openUrl", payload: { url } })
        } else {
          window.open(url, "_blank")
        }
      }

      if (method === "code") {
        setAuthStatus((prev) => ({ ...prev, [providerId]: "等待授权码..." }))
        setManualCodeState({ providerId, id, instructions })
        setManualCodeInput("")
        return
      }

      setAuthStatus((prev) => ({ ...prev, [providerId]: "等待浏览器授权..." }))

      // Poll
      const poll = setInterval(async () => {
        try {
          const status = await sdk.auth.status(id)
          if (status.status === "success") {
            clearInterval(poll)
            delete pollIntervals.current[providerId]
            setAuthStatus((prev) => ({ ...prev, [providerId]: "Connected!" }))
            // Add to configured providers list if not already there
            if (!configuredProviders.includes(providerId)) {
              setConfiguredProviders([...configuredProviders, providerId])
            }
            // Clear temporary selection if it was this provider
            if (selectedProviderToAdd === providerId) {
              setSelectedProviderToAdd("")
            }
            setTimeout(() => setAuthStatus((prev) => ({ ...prev, [providerId]: "" })), 3000)
            markProvidersDirty()
          } else if (status.status === "failed") {
            clearInterval(poll)
            delete pollIntervals.current[providerId]
            setAuthStatus((prev) => ({
              ...prev,
              [providerId]: "Failed: " + (status.result?.message || "未知错误"),
            }))
          }
        } catch (e) {
          clearInterval(poll)
          delete pollIntervals.current[providerId]
          console.error("Error polling OAuth status:", e)
          setAuthStatus((prev) => ({ ...prev, [providerId]: "轮询授权状态出错" }))
        }
      }, 1000)
      pollIntervals.current[providerId] = poll

      // Timeout after 2 mins
      setTimeout(() => {
        if (pollIntervals.current[providerId] === poll) {
          clearInterval(poll)
          delete pollIntervals.current[providerId]
          setAuthStatus((prev) => {
            if (prev[providerId]?.startsWith("Waiting")) return { ...prev, [providerId]: "已超时" }
            return prev
          })
        }
      }, 120000)
    } catch (e) {
      setAuthStatus((prev) => ({ ...prev, [providerId]: "启动登录失败" }))
      console.error(e)
    }
  }

  const handleCancel = (providerId: string) => {
    if (pollIntervals.current[providerId]) {
      clearInterval(pollIntervals.current[providerId])
      delete pollIntervals.current[providerId]
    }
    setAuthStatus((prev) => ({ ...prev, [providerId]: "" }))
    setAuthInstructions((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [providerId]: _removed, ...rest } = prev
      return rest
    })
    if (manualCodeState?.providerId === providerId) {
      setManualCodeState(null)
      setManualCodeInput("")
    }
  }

  const handleManualCodeSubmit = async () => {
    if (!manualCodeState || !manualCodeInput) return

    const { providerId, id } = manualCodeState
    try {
      setAuthStatus((prev) => ({ ...prev, [providerId]: "验证授权码..." }))
      await sdk.auth.submit(id, manualCodeInput)

      // Check status immediately
      const status = await sdk.auth.status(id)
      if (status.status === "success") {
        setAuthStatus((prev) => ({ ...prev, [providerId]: "Connected!" }))
        if (!configuredProviders.includes(providerId)) {
          setConfiguredProviders([...configuredProviders, providerId])
        }
        if (selectedProviderToAdd === providerId) {
          setSelectedProviderToAdd("")
        }
        setManualCodeState(null)
        setManualCodeInput("")
        setTimeout(() => setAuthStatus((prev) => ({ ...prev, [providerId]: "" })), 3000)
        markProvidersDirty()
      } else {
        setAuthStatus((prev) => ({
          ...prev,
          [providerId]: "Failed: " + (status.result?.message || "授权码无效"),
        }))
      }
    } catch (e) {
      console.error("Error submitting code:", e)
      setAuthStatus((prev) => ({ ...prev, [providerId]: "提交授权码失败" }))
    }
  }

  return {
    authStatus,
    authInstructions,
    manualCodeState,
    manualCodeInput,
    setManualCodeInput,
    handleOAuthLogin,
    handleCancel,
    handleManualCodeSubmit,
  }
}
