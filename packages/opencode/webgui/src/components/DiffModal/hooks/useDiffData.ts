import { useEffect, useState } from "react"
import { sdk } from "../../../lib/api/sdkClient"
import type { FileDiff } from "@opencode-ai/sdk/client"

export function useDiffData(sessionID: string, messageID: string, isOpen: boolean) {
  const [diffs, setDiffs] = useState<FileDiff[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const controller = new AbortController()
    const fetchDiff = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await sdk.session.diff({
          path: { id: sessionID },
          query: { messageID },
        })

        if (controller.signal.aborted) return

        if (response.error) {
          const errorMessage =
            typeof response.error === "object" && "message" in response.error
              ? String(response.error.message)
              : "未知错误"
          setError("加载差异失败：" + errorMessage)
        } else if (response.data) {
          setDiffs(response.data)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError("加载差异失败：" + String(err))
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchDiff()
    return () => controller.abort()
  }, [isOpen, sessionID, messageID])

  return { diffs, isLoading, error }
}
