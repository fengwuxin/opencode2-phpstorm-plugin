import { Component, type ReactNode, type ErrorInfo } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error boundary component to catch and handle React errors
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <ErrorBoundary fallback={(error, errorInfo, reset) => (
 *   <div>
 *     <h1>Error: {error.message}</h1>
 *     <button onClick={reset}>重试</button>
 *   </div>
 * )}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo)
    this.setState({
      errorInfo,
    })

    // Call optional error handler for logging/telemetry
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback if provided
      if (this.props.fallback) {
        const errorInfo = this.state.errorInfo ?? ({ componentStack: "" } as ErrorInfo)
        return this.props.fallback(this.state.error, errorInfo, this.reset)
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-950 border border-red-300 dark:border-red-700 rounded-lg shadow-lg p-6">
            <div className="flex items-start gap-4">
              {/* Error icon */}
              <div className="flex-shrink-0">
                <svg
                  className="w-8 h-8 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              {/* Error content */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">出错了</h1>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  应用发生意外错误。
                </p>

                {/* Error details */}
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-3 mb-4">
                  <h2 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                    Error: {this.state.error.message}
                  </h2>
                  {this.state.error.stack && (
                    <pre className="text-xs text-red-700 dark:text-red-300 overflow-x-auto whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>

                {/* Component stack (in development) */}
                {this.state.errorInfo?.componentStack && import.meta.env.DEV && (
                  <details className="mb-4">
                    <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
                      组件堆栈
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={this.reset}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                  >
                    重试
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium rounded transition-colors"
                  >
                    重新加载页面
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
