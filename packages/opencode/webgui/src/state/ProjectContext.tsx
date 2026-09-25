import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { sdk, setServerDirectory } from "../lib/api/sdkClient"
import { eventEmitter } from "../lib/api/events"

interface ProjectInfo {
  id: string
  worktree: string
  vcs?: "git"
  time: {
    created: number
    initialized?: number
  }
}

interface ProjectContextState {
  project: ProjectInfo | null
  worktree: string | null
  isLoading: boolean
  error: Error | null
}

const ProjectContext = createContext<ProjectContextState | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider")
  }
  return context
}

interface ProjectProviderProps {
  children: ReactNode
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [directory, setDirectory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProject = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await sdk.project.current()
      if (response.error) {
        throw new Error(
          typeof response.error === "object" && response.error && "message" in response.error
            ? String(response.error.message)
            : "获取项目失败",
        )
      }

      if (response.data) {
        setProject(response.data as ProjectInfo)
        setServerDirectory((response.data as ProjectInfo).worktree)
        setError(null)
      }

      const pathResult = await sdk.path.get()
      if (!pathResult.error && pathResult.data) {
        setDirectory(pathResult.data.directory)
        setServerDirectory(pathResult.data.directory)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("获取项目失败"))
      console.error("Failed to fetch project:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchProject()
  }, [fetchProject])

  useEffect(() => {
    const unsubscribe = eventEmitter.on("server.connected", () => {
      void fetchProject()
    })

    return unsubscribe
  }, [fetchProject])

  const value: ProjectContextState = {
    project,
    worktree: directory ?? project?.worktree ?? null,
    isLoading,
    error,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}
