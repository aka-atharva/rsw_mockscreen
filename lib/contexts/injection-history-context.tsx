"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getInjectionHistory } from "@/lib/api"

// Define the injection history item type
export interface InjectionHistoryItem {
  id: string
  type: "file" | "database"
  name: string
  timestamp: string
  status: "success" | "error" | "processing"
  records?: number
  user?: string
  connection?: string
  error?: string
  schema?: any
}

interface InjectionHistoryContextType {
  history: InjectionHistoryItem[]
  isLoading: boolean
  error: string | null
  refreshHistory: () => Promise<void>
  addHistoryItem: (item: InjectionHistoryItem) => void
  updateHistoryItem: (id: string, updates: Partial<InjectionHistoryItem>) => void
}

const InjectionHistoryContext = createContext<InjectionHistoryContextType | undefined>(undefined)

export function InjectionHistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<InjectionHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Function to fetch injection history from API
  const refreshHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getInjectionHistory()
      setHistory(data)
    } catch (err) {
      console.error("Error fetching injection history:", err)
      setError("Failed to load injection history")
    } finally {
      setIsLoading(false)
    }
  }

  // Function to add a new history item
  const addHistoryItem = (item: InjectionHistoryItem) => {
    setHistory((prev) => [item, ...prev])
    // The actual API update is handled by the upload and database connection components
  }

  // Function to update an existing history item
  const updateHistoryItem = (id: string, updates: Partial<InjectionHistoryItem>) => {
    setHistory((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
    // The actual API update is handled by the upload and database connection components
  }

  // Load initial data
  useEffect(() => {
    refreshHistory()
  }, [])

  return (
    <InjectionHistoryContext.Provider
      value={{
        history,
        isLoading,
        error,
        refreshHistory,
        addHistoryItem,
        updateHistoryItem,
      }}
    >
      {children}
    </InjectionHistoryContext.Provider>
  )
}

export function useInjectionHistory() {
  const context = useContext(InjectionHistoryContext)
  if (context === undefined) {
    throw new Error("useInjectionHistory must be used within an InjectionHistoryProvider")
  }
  return context
}

