import type { Provider } from "@opencode-ai/sdk/client"
import { OAuthSection } from "./OAuthSection"
import { KeyInput } from "./KeyInput"

interface AuthMethod {
  label: string
  type: "oauth" | "api"
}

interface ProviderCardProps {
  provider: Provider
  isExpanded: boolean
  isConnected: boolean
  isTemporary: boolean
  isLoading: boolean
  methods: AuthMethod[]
  authStatus: string
  authInstructions?: string
  manualCodeState: { providerId: string; id: string; instructions?: string } | null
  manualCodeInput: string
  apiKey: string
  showApiKey: boolean
  onToggleExpand: () => void
  onDelete: (providerId: string, e: React.MouseEvent) => void
  onOAuthLogin: (providerId: string, methodIndex: number) => void
  onCancelOAuth: (providerId: string) => void
  onManualCodeChange: (value: string) => void
  onManualCodeSubmit: () => void
  onManualCodeCancel: () => void
  onApiKeyChange: (value: string) => void
  onToggleApiKeyVisibility: () => void
}

export function ProviderCard({
  provider,
  isExpanded,
  isConnected,
  isTemporary,
  isLoading,
  methods,
  authStatus,
  authInstructions,
  manualCodeState,
  manualCodeInput,
  apiKey,
  showApiKey,
  onToggleExpand,
  onDelete,
  onOAuthLogin,
  onCancelOAuth,
  onManualCodeChange,
  onManualCodeSubmit,
  onManualCodeCancel,
  onApiKeyChange,
  onToggleApiKeyVisibility,
}: ProviderCardProps) {
  const oauthMethodIndex = methods.findIndex((m) => m.type === "oauth")
  const hasOAuth = oauthMethodIndex !== -1
  const hasApiKey = methods.some((m) => m.type === "api")

  return (
    <div
      className={`border transition-all duration-200 rounded-lg overflow-hidden ${
        isExpanded
          ? "border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 ring-1 ring-blue-500/20"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700"
      }`}
    >
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{provider.name}</span>
          {isTemporary && (
            <span className="text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
              New
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isConnected ? "已连接" : "未配置"}
          </span>
          <button
            onClick={(e) => onDelete(provider.id, e)}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="移除 Provider"
            data-tip="移除 Provider"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-blue-100 dark:border-blue-900/30 mt-2">
          <div className="pt-3 space-y-3">
            {isLoading && <div className="text-xs text-gray-400 animate-pulse">加载认证方式...</div>}

            {hasOAuth && (
              <OAuthSection
                providerId={provider.id}
                providerName={provider.name}
                methods={methods}
                oauthMethodIndex={oauthMethodIndex}
                authStatus={authStatus}
                authInstructions={authInstructions}
                manualCodeState={manualCodeState}
                manualCodeInput={manualCodeInput}
                onOAuthLogin={onOAuthLogin}
                onCancel={onCancelOAuth}
                onManualCodeChange={onManualCodeChange}
                onManualCodeSubmit={onManualCodeSubmit}
                onManualCodeCancel={onManualCodeCancel}
              />
            )}

            {/* Show API Key input if no OAuth, or as alternative */}
            {(!hasOAuth || hasApiKey) && !isLoading && (
              <div className="space-y-2">
                {hasOAuth && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                      <span className="bg-white dark:bg-gray-900 px-2 text-gray-400">或使用 API Key</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <KeyInput
                    providerName={provider.name}
                    value={apiKey}
                    showKey={showApiKey}
                    onValueChange={onApiKeyChange}
                    onToggleVisibility={onToggleApiKeyVisibility}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
