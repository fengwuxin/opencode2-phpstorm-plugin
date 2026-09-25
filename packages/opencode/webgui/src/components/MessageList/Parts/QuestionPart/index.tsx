import { useState, useCallback, useMemo } from "react"
import type { QuestionRequest, QuestionAnswer } from "@opencode-ai/sdk/v2/client"
import { QuestionTabs } from "./QuestionTabs"
import { QuestionOptions } from "./QuestionOptions"
import { ConfirmTab } from "./ConfirmTab"
import { useMessages } from "../../../../state/MessagesContext"

interface QuestionPartProps {
  request: QuestionRequest
}

export function QuestionPart({ request }: QuestionPartProps) {
  const { replyQuestion, rejectQuestion } = useMessages()
  const questions = request.questions
  const [activeTab, setActiveTab] = useState(0)
  const [answers, setAnswers] = useState<QuestionAnswer[]>(() => questions.map(() => []))
  const [customInputs, setCustomInputs] = useState<string[]>(() => questions.map(() => ""))
  const [isLoading, setIsLoading] = useState(false)
  const [editingCustom, setEditingCustom] = useState(false)

  // Single question with single select = auto-submit mode
  const isSingleQuestionSingleSelect = useMemo(
    () => questions.length === 1 && questions[0]?.multiple !== true,
    [questions]
  )

  // Show confirm tab for multiple questions or multi-select
  const showConfirmTab = !isSingleQuestionSingleSelect

  // Check if we're on the confirm tab
  const isConfirmTab = activeTab === questions.length && showConfirmTab

  // Current question (if not on confirm tab)
  const currentQuestion = questions[activeTab]
  const currentAnswers = answers[activeTab] ?? []
  const currentCustomInput = customInputs[activeTab] ?? ""
  const isMultiple = currentQuestion?.multiple === true

  // Check if custom input is selected
  const isCustomSelected = useMemo(() => {
    if (!currentCustomInput) return false
    return currentAnswers.includes(currentCustomInput)
  }, [currentAnswers, currentCustomInput])

  // Handle submitting answers
  const handleSubmit = useCallback(async () => {
    setIsLoading(true)
    try {
      await replyQuestion(request.id, answers)
    } catch (error) {
      console.error("[QuestionPart] Failed to submit answers:", error)
    } finally {
      setIsLoading(false)
    }
  }, [request.id, answers, replyQuestion])

  // Handle rejecting/dismissing
  const handleDismiss = useCallback(async () => {
    setIsLoading(true)
    try {
      await rejectQuestion(request.id)
    } catch (error) {
      console.error("[QuestionPart] Failed to reject question:", error)
    } finally {
      setIsLoading(false)
    }
  }, [request.id, rejectQuestion])

  // Handle option toggle
  const handleToggleOption = useCallback(
    (label: string) => {
      setAnswers((prev) => {
        const newAnswers = [...prev]
        const currentAnswers = [...(newAnswers[activeTab] ?? [])]

        if (isMultiple) {
          // Multi-select: toggle the option
          const index = currentAnswers.indexOf(label)
          if (index === -1) {
            currentAnswers.push(label)
          } else {
            currentAnswers.splice(index, 1)
          }
          newAnswers[activeTab] = currentAnswers
        } else {
          // Single-select: replace the answer
          newAnswers[activeTab] = [label]

          // If single question single select, auto-submit
          if (isSingleQuestionSingleSelect) {
            // Submit immediately
            setIsLoading(true)
            replyQuestion(request.id, [[label]])
              .catch((error: unknown) => {
                console.error("[QuestionPart] Failed to submit answer:", error)
              })
              .finally(() => {
                setIsLoading(false)
              })
          } else {
            // Move to next tab
            setTimeout(() => {
              setActiveTab((prev) => Math.min(prev + 1, questions.length))
            }, 150)
          }
        }

        return newAnswers
      })
    },
    [activeTab, isMultiple, isSingleQuestionSingleSelect, request.id, questions.length, replyQuestion]
  )

  // Handle custom input change
  const handleCustomInputChange = useCallback(
    (value: string) => {
      setCustomInputs((prev) => {
        const newInputs = [...prev]
        newInputs[activeTab] = value
        return newInputs
      })
    },
    [activeTab]
  )

  // Handle selecting custom option
  const handleSelectCustom = useCallback(() => {
    // Start editing when custom option is selected
    setEditingCustom(true)
  }, [])

  // Handle finishing custom input editing
  const handleFinishEditing = useCallback(() => {
    setEditingCustom(false)
    const value = currentCustomInput.trim()

    if (!value) {
      // Clear custom from answers if empty
      setAnswers((prev) => {
        const newAnswers = [...prev]
        const oldCustom = customInputs[activeTab]
        if (oldCustom) {
          newAnswers[activeTab] = (newAnswers[activeTab] ?? []).filter((a) => a !== oldCustom)
        }
        return newAnswers
      })
      return
    }

    setAnswers((prev) => {
      const newAnswers = [...prev]
      const currentAnswers = [...(newAnswers[activeTab] ?? [])]

      // Remove old custom value if exists
      const oldCustom = customInputs[activeTab]
      if (oldCustom && oldCustom !== value) {
        const oldIndex = currentAnswers.indexOf(oldCustom)
        if (oldIndex !== -1) {
          currentAnswers.splice(oldIndex, 1)
        }
      }

      if (isMultiple) {
        // Multi-select: add custom value if not already there
        if (!currentAnswers.includes(value)) {
          currentAnswers.push(value)
        }
        newAnswers[activeTab] = currentAnswers
      } else {
        // Single-select: replace with custom value
        newAnswers[activeTab] = [value]

        // If single question single select, auto-submit
        if (isSingleQuestionSingleSelect) {
          setIsLoading(true)
          replyQuestion(request.id, [[value]])
            .catch((error: unknown) => {
              console.error("[QuestionPart] Failed to submit custom answer:", error)
            })
            .finally(() => {
              setIsLoading(false)
            })
        } else {
          // Move to next tab
          setTimeout(() => {
            setActiveTab((prev) => Math.min(prev + 1, questions.length))
          }, 150)
        }
      }

      return newAnswers
    })
  }, [
    currentCustomInput,
    activeTab,
    customInputs,
    isMultiple,
    isSingleQuestionSingleSelect,
    request.id,
    questions.length,
    replyQuestion,
  ])

  // Build tabs data
  const tabsData = questions.map((q, index) => ({
    header: q.header,
    answered: (answers[index]?.length ?? 0) > 0,
  }))

  // Navigation handlers
  const handlePrevious = () => {
    setActiveTab((prev) => Math.max(prev - 1, 0))
  }

  const handleNext = () => {
    setActiveTab((prev) => Math.min(prev + 1, showConfirmTab ? questions.length : questions.length - 1))
  }

  return (
    <div className="my-0.5 border rounded-lg border-blue-300 dark:border-blue-700 overflow-hidden bg-[#fbfdff] dark:bg-gray-900">
      {/* Header */}
      <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
        <div className="text-xs font-medium text-blue-700 dark:text-blue-300">助手提问</div>
      </div>

      {/* Tabs (only show if multiple questions or multi-select) */}
      {showConfirmTab && (
        <QuestionTabs
          tabs={tabsData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showConfirm={showConfirmTab}
        />
      )}

      {/* Content */}
      {isConfirmTab ? (
        <ConfirmTab
          questions={questions}
          answers={answers}
          onSubmit={handleSubmit}
          onDismiss={handleDismiss}
          isLoading={isLoading}
        />
      ) : (
        currentQuestion && (
          <QuestionOptions
            question={currentQuestion}
            answers={currentAnswers}
            customInput={currentCustomInput}
            onToggleOption={handleToggleOption}
            onCustomInputChange={handleCustomInputChange}
            isCustomSelected={isCustomSelected}
            onSelectCustom={handleSelectCustom}
            isEditing={editingCustom}
            onStartEditing={() => setEditingCustom(true)}
            onFinishEditing={handleFinishEditing}
          />
        )
      )}

      {/* Footer with navigation (only for non-single-select mode) */}
      {!isSingleQuestionSingleSelect && (
        <div className="px-3 py-2 border-t border-[#e4e9f2] dark:border-gray-800 bg-[#f8fafc] dark:bg-gray-900/50 flex items-center justify-between">
          <div className="flex gap-2">
            {activeTab > 0 && (
              <button
                onClick={handlePrevious}
                className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                ← Previous
              </button>
            )}
            {!isConfirmTab && (
              <button
                onClick={handleNext}
                className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                下一步 →
              </button>
            )}
          </div>

          <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {isConfirmTab ? "Review" : `${activeTab + 1}/${questions.length}`}
            </span>
            <span>•</span>
            <button
              onClick={handleDismiss}
              disabled={isLoading}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Simple footer for single-select single-question */}
      {isSingleQuestionSingleSelect && (
        <div className="px-3 py-2 border-t border-[#e4e9f2] dark:border-gray-800 bg-[#f8fafc] dark:bg-gray-900/50 flex items-center justify-end">
          <button
            onClick={handleDismiss}
            disabled={isLoading}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
