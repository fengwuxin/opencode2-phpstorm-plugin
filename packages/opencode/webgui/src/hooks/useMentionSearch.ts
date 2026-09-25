import { useState, useEffect, useCallback, useRef } from "react"
import { sdk } from "../lib/api/sdkClient"
import fuzzysort from "fuzzysort"
import type { MentionMetadata } from "../components/mention/MentionNode"
import { useIdeBridgeState } from "../state/IdeBridgeContext"
import { useDebouncedCallback } from "./useDebounce"

export interface MentionResult {
  id: string
  metadata: MentionMetadata
  score: number
  current?: boolean
  special?: "all-opened"
}

export interface UseMentionSearchResult {
  results: MentionResult[]
  isLoading: boolean
  error: Error | null
}

const DEBOUNCE_MS = 300
const MAX_RESULTS = 50

export function useMentionSearch(query: string): UseMentionSearchResult {
  const [results, setResults] = useState<MentionResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { openedFiles, currentFile } = useIdeBridgeState()

  const search = useCallback(
    async (searchQuery: string) => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      setIsLoading(true)
      setError(null)

      try {
        const [filesResponse, agentsResponse, symbolsResponse] = await Promise.allSettled([
          sdk.find.files({ query: { query: searchQuery } }),
          sdk.app.agents(),
          sdk.find.symbols({ query: { query: searchQuery } }),
        ])
        if (signal.aborted) return

        const fileResults: MentionResult[] = []
        if (filesResponse.status === "fulfilled" && filesResponse.value.data) {
          const files = filesResponse.value.data
          for (const filePath of files) {
            const isDirectory = filePath.endsWith("/")
            fileResults.push({
              id: `file:${filePath}`,
              metadata: { type: isDirectory ? "directory" : "file", display: filePath, path: filePath },
              score: 0,
            })
          }
        }

        const agentResults: MentionResult[] = []
        if (agentsResponse.status === "fulfilled" && agentsResponse.value.data) {
          const agents = agentsResponse.value.data
          for (const agent of agents) {
            // Filter agents: hide hidden agents and exclude 'primary' mode agents from mentions
            if (!(agent as any).hidden && agent.mode !== "primary") {
              agentResults.push({
                id: `agent:${agent.name}`,
                metadata: { type: "agent", display: agent.name, name: agent.name },
                score: 0,
              })
            }
          }
        }

        const symbolResults: MentionResult[] = []
        if (symbolsResponse.status === "fulfilled" && symbolsResponse.value.data) {
          const symbols = symbolsResponse.value.data
          for (const symbol of symbols) {
            symbolResults.push({
              id: `symbol:${(symbol as any).path}:${(symbol as any).name}`,
              metadata: {
                type: "symbol",
                display: `${(symbol as any).name} (${(symbol as any).path})`,
                path: (symbol as any).path,
                name: (symbol as any).name,
                range: (symbol as any).range,
                kind: (symbol as any).kind,
              },
              score: 0,
            })
          }
        }

        const serverResults = [...fileResults, ...agentResults, ...symbolResults]

        // Build opened files results
        const openedSet = new Set(openedFiles)
        const current = currentFile ?? null

        let openedResults: MentionResult[] = []
        if (searchQuery.trim()) {
          // fuzzy: max 2 from opened files, excluding current
          const base = Array.from(openedSet).filter((p) => p && p !== current)
          const fuzzy = fuzzysort.go(searchQuery, base, { limit: 2, threshold: -10000 })
          openedResults = fuzzy.map((r) => ({
            id: `opened:${r.target}`,
            metadata: { type: r.target.endsWith("/") ? "directory" : "file", display: r.target, path: r.target },
            score: r.score,
          }))
        } else {
          // no query: order = current (bold), "所有打开的文件", then others
          const items: MentionResult[] = []
          if (current) {
            items.push({
              id: `opened:current:${current}`,
              metadata: { type: current.endsWith("/") ? "directory" : "file", display: current, path: current },
              score: 0,
              current: true,
            })
          }
          if (openedSet.size > 0) {
            items.push({
              id: "opened:all",
              metadata: { type: "file", display: "所有打开的文件" },
              score: 0,
              special: "all-opened",
            })
          }
          for (const p of openedSet) {
            if (p && p !== current) {
              items.push({
                id: `opened:${p}`,
                metadata: { type: p.endsWith("/") ? "directory" : "file", display: p, path: p },
                score: 0,
              })
            }
          }
          openedResults = items
        }

        // Dedup between openedResults and server file results (prefer opened ordering)
        const seen = new Set(openedResults.map((r) => r.metadata.path ?? r.metadata.display))
        const dedupServer = serverResults.filter((r) => {
          const key = r.metadata.path ?? r.metadata.display
          if (r.metadata.type === "file" || r.metadata.type === "directory") {
            return !seen.has(key)
          }
          return true
        })

        // Combine: opened first, then server
        const combined = [...openedResults, ...dedupServer].slice(0, MAX_RESULTS)

        // If fuzzy, sort by score ascending (fuzzysort lower is better), but keep openedResults already scored
        let finalResults = combined
        if (searchQuery.trim()) {
          finalResults = combined.sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
        }

        setResults(finalResults)
      } catch (err) {
        if (signal.aborted) return
        const errorObj = err instanceof Error ? err : new Error("搜索提及失败")
        setError(errorObj)
        console.error("[useMentionSearch] Search failed:", errorObj)
      } finally {
        if (!signal.aborted) setIsLoading(false)
      }
    },
    [openedFiles, currentFile],
  )

  // Debounced search function
  const debouncedSearch = useDebouncedCallback((searchQuery: string) => {
    search(searchQuery)
  }, DEBOUNCE_MS)

  // Trigger search when query changes
  useEffect(() => {
    debouncedSearch(query)
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [query, debouncedSearch])

  return { results, isLoading, error }
}
