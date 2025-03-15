"use client"

import { useState, useEffect } from "react"
import { Clock, FileText, Database, Check, AlertCircle, RefreshCw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { formatDate } from "@/lib/utils/date-formatter"

export function InjectionHistory() {
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchInjectionHistory()
  }, [])

  const fetchInjectionHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In a real app, this would be an API call to fetch the injection history
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
      const token = localStorage.getItem("token")

      // Attempt to fetch from API
      try {
        const response = await fetch(`${apiUrl}/datapuur/injection-history`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          setHistory(data)
          return
        }
      } catch (err) {
        console.log("API not available, using mock data")
      }

      // Fallback to mock data if API fails
      const mockHistory = [
        {
          id: "1",
          type: "file",
          name: "customer_data.csv",
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          status: "success",
          records: 1250,
          user: "researcher",
          schema: {
            name: "customer_data",
            fields: [
              { name: "id", type: "integer" },
              { name: "name", type: "string" },
              { name: "email", type: "string" },
            ],
          },
        },
        {
          id: "2",
          type: "database",
          name: "products_table",
          connection: "MySQL - products_db",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          status: "success",
          records: 532,
          user: "admin",
          schema: {
            name: "products",
            fields: [
              { name: "product_id", type: "integer" },
              { name: "name", type: "string" },
              { name: "price", type: "float" },
            ],
          },
        },
        {
          id: "3",
          type: "file",
          name: "transactions.json",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          status: "error",
          error: "Invalid JSON format",
          user: "researcher",
        },
        {
          id: "4",
          type: "database",
          name: "analytics_data",
          connection: "PostgreSQL - analytics",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
          status: "success",
          records: 10532,
          user: "researcher",
          schema: {
            name: "analytics",
            fields: [
              { name: "date", type: "date" },
              { name: "page_views", type: "integer" },
              { name: "conversions", type: "integer" },
            ],
          },
        },
      ]

      setHistory(mockHistory)
    } catch (err) {
      console.error("Error fetching injection history:", err)
      setError("Failed to load injection history")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <Check className="h-5 w-5 text-green-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "processing":
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case "file":
        return <FileText className="h-5 w-5 text-primary" />
      case "database":
        return <Database className="h-5 w-5 text-secondary" />
      default:
        return <FileText className="h-5 w-5 text-primary" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 text-red-700 dark:text-red-300 p-4 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInjectionHistory}
          className="mt-2 border-red-500 text-red-500 hover:bg-red-500/10"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-border rounded-lg">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Injection History</h3>
        <p className="text-muted-foreground mb-4">You haven't ingested any data yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-primary" />
          Injection History
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInjectionHistory}
          className="border-primary text-primary hover:bg-primary/10"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {history.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`border rounded-lg p-4 ${
              item.status === "success"
                ? "bg-green-500/5 border-green-500/20"
                : item.status === "error"
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-card/80 border-border"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start">
                <div className="mr-3 mt-1">{getTypeIcon(item.type)}</div>
                <div>
                  <div className="flex items-center">
                    <h4 className="font-medium text-foreground">{item.name}</h4>
                    <div className="ml-3 flex items-center">
                      {getStatusIcon(item.status)}
                      <span
                        className={`text-xs ml-1 ${
                          item.status === "success"
                            ? "text-green-500"
                            : item.status === "error"
                              ? "text-red-500"
                              : "text-yellow-500"
                        }`}
                      >
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.type === "database" && (
                      <span className="inline-block mr-3">Connection: {item.connection}</span>
                    )}
                    <span className="inline-block mr-3">Date: {formatDate(item.timestamp)}</span>
                    {item.records && <span className="inline-block">Records: {item.records.toLocaleString()}</span>}
                  </p>
                  {item.error && <p className="text-sm text-red-500 mt-1">Error: {item.error}</p>}
                </div>
              </div>
              <div className="flex space-x-2">
                {item.status === "success" && item.schema && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-primary text-primary hover:bg-primary/10"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Schema
                  </Button>
                )}
                {item.status === "success" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-secondary text-secondary hover:bg-secondary/10"
                  >
                    View Details
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

