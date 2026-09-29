import { useState, useEffect, useRef } from "react"
import type { Session } from "@opencode-ai/sdk/client"
import { sessionActivity } from "../../../state/SessionContext"
import { useClickOutside } from "../../../hooks/useClickOutside"

export function useSessionDropdown(sessions: Session[]) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())

  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const sessionListRef = useRef<HTMLDivElement>(null)
  const selectedSessionRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useClickOutside(
    dropdownRef,
    () => {
      setIsDropdownOpen(false)
      setIsSelectMode(false)
      setSelectedSessions(new Set())
    },
    { enabled: isDropdownOpen },
  )

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus()
      setSelectedSessionIndex(0)
      setIsSelectMode(false)
      setSelectedSessions(new Set())
    }
  }, [isDropdownOpen])

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedSessionIndex(0)
  }, [searchQuery])

  // Scroll selected session into view
  useEffect(() => {
    if (selectedSessionRef.current) {
      selectedSessionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    }
  }, [selectedSessionIndex])

  // Filter sessions by search query and sort by last activity (newest first).
  // Favorites are only a marker and never affect the order.
  const filteredSessions = sessions
    .filter((session) => {
      const title = session.title || "Untitled"
      return title.toLowerCase().includes(searchQuery.toLowerCase())
    })
    .sort((a, b) => sessionActivity(b) - sessionActivity(a))

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev)

  const closeDropdown = () => {
    setIsDropdownOpen(false)
    setSearchQuery("")
  }

  const toggleSelectMode = () => {
    setIsSelectMode((prev) => !prev)
    if (isSelectMode) {
      setSelectedSessions(new Set())
    }
  }

  const handleSessionCheckboxChange = (sessionId: string, checked: boolean) => {
    setSelectedSessions((prev) => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(sessionId)
      } else {
        newSet.delete(sessionId)
      }
      return newSet
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent, onSelect: (sessionId: string) => void) => {
    if (!isDropdownOpen || filteredSessions.length === 0) return

    // Never interfere with an active IME composition (Chinese/Japanese input)
    if (e.nativeEvent.isComposing) return

    // Disable keyboard navigation when in select mode
    if (isSelectMode) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedSessionIndex((prev) => Math.min(prev + 1, filteredSessions.length - 1))
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (selectedSessionIndex === 0) {
        // Move focus to search input
        searchInputRef.current?.focus()
      } else {
        setSelectedSessionIndex((prev) => Math.max(prev - 1, 0))
      }
    }
    if (e.key === "Enter") {
      e.preventDefault()
      if (filteredSessions[selectedSessionIndex]) {
        onSelect(filteredSessions[selectedSessionIndex].id)
      }
    }
    if (e.key === "Escape") {
      e.preventDefault()
      setIsDropdownOpen(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    // Leave arrow keys to the IME while a composition is active
    if (e.nativeEvent.isComposing) return

    if (e.key === "ArrowDown" && filteredSessions.length > 0) {
      e.preventDefault()
      setSelectedSessionIndex(0)
      selectedSessionRef.current?.focus()
    }
  }

  return {
    isDropdownOpen,
    setIsDropdownOpen,
    searchQuery,
    setSearchQuery,
    selectedSessionIndex,
    isSelectMode,
    selectedSessions,
    setSelectedSessions,
    dropdownRef,
    searchInputRef,
    sessionListRef,
    selectedSessionRef,
    filteredSessions,
    toggleDropdown,
    closeDropdown,
    toggleSelectMode,
    handleSessionCheckboxChange,
    handleKeyDown,
    handleSearchKeyDown,
  }
}
