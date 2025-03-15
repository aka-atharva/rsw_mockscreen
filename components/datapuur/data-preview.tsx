"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, RefreshCw, Download, TableIcon } from "lucide-react"
import { motion } from "framer-motion"

interface DataPreviewProps {
  fileId?: string
  schema?: any
  isLoading?: boolean
  onRefresh?: () => void
}

export function DataPreview({ fileId, schema, isLoading = false, onRefresh }: DataPreviewProps) {
  const [previewData, setPreviewData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 10

  useEffect(() => {
    if (fileId) {
      fetchPreviewData()
    }
  }, [fileId, page])

  const fetchPreviewData = async () => {
    if (!fileId) return

    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "/api"}/datapuur/preview/${fileId}?page=${page}&page_size=${pageSize}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to fetch data preview")
      }

      const data = await response.json()
      setPreviewData(data.data)
      setTotalPages(Math.ceil(data.total_records / pageSize))
    } catch (err) {
      console.error("Error fetching data preview:", err)
      setError("Failed to load data preview")
      setPreviewData([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchPreviewData()
    if (onRefresh) onRefresh()
  }

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1)
    }
  }

  const downloadCSV = () => {
    if (!previewData || previewData.length === 0 || !schema) return

    // Create CSV content
    const headers = schema.fields.map((field) => field.name)
    const csvContent = [
      headers.join(","),
      ...previewData.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            // Handle values with commas by wrapping in quotes
            return typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value !== null && value !== undefined
                ? value
                : ""
          })
          .join(","),
      ),
    ].join("\n")

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `data_preview_${new Date().getTime()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!fileId || !schema) {
    return (
      <div className="text-center py-8 border border-dashed border-border rounded-lg">
        <TableIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Data Preview Available</h3>
        <p className="text-muted-foreground mb-4">Upload a file or connect to a database to preview data.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 border border-dashed border-border rounded-lg">
        <TableIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Preview</h3>
        <p className="text-red-500 mb-4">{error}</p>
        <Button variant="outline" onClick={handleRefresh} className="mx-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  const isLoadingState = loading || isLoading

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
          <TableIcon className="w-5 h-5 mr-2 text-primary" />
          Data Preview
        </h3>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingState}
            className="border-primary text-primary hover:bg-primary/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingState ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCSV}
            disabled={isLoadingState || previewData.length === 0}
            className="border-secondary text-secondary hover:bg-secondary/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {isLoadingState ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : previewData.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <TableIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Data Available</h3>
          <p className="text-muted-foreground mb-4">The preview could not be generated or the data is empty.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {schema.fields.map((field) => (
                      <TableHead key={field.name} className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{field.name}</span>
                          <span className="text-xs text-muted-foreground">({field.type})</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {schema.fields.map((field) => (
                        <TableCell key={`${rowIndex}-${field.name}`} className="whitespace-nowrap">
                          {row[field.name] !== undefined && row[field.name] !== null ? String(row[field.name]) : ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={page === 1 || isLoadingState}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page === totalPages || isLoadingState}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

