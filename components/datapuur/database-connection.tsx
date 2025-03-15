"use client"

import { useState } from "react"
import { Database, Play, Save, Trash, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function DatabaseConnection({ onSchemaDetected, isProcessing, setIsProcessing, chunkSize, onStatusChange }) {
  const [connectionType, setConnectionType] = useState("mysql")
  const [connectionConfig, setConnectionConfig] = useState({
    host: "",
    port: "",
    database: "",
    username: "",
    password: "",
    table: "",
  })
  const [savedConnections, setSavedConnections] = useState([])
  const [error, setError] = useState("")
  const [connectionName, setConnectionName] = useState("")

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setConnectionConfig({
      ...connectionConfig,
      [name]: value,
    })
  }

  const handleTypeChange = (value) => {
    setConnectionType(value)

    // Set default port based on database type
    let defaultPort = ""
    switch (value) {
      case "mysql":
        defaultPort = "3306"
        break
      case "postgresql":
        defaultPort = "5432"
        break
      case "mssql":
        defaultPort = "1433"
        break
    }

    setConnectionConfig({
      ...connectionConfig,
      port: defaultPort,
    })
  }

  const validateConnection = () => {
    if (!connectionConfig.host) return "Host is required"
    if (!connectionConfig.port) return "Port is required"
    if (!connectionConfig.database) return "Database name is required"
    if (!connectionConfig.username) return "Username is required"
    if (!connectionConfig.table) return "Table name is required"
    return ""
  }

  const testConnection = async () => {
    const validationError = validateConnection()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsProcessing(true)
    setError("")
    onStatusChange("Testing database connection...")

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/datapuur/test-connection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          type: connectionType,
          config: connectionConfig,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to connect to database")
      }

      onStatusChange("Connection successful! Database is accessible.")
    } catch (error) {
      console.error("Error testing connection:", error)
      setError(error.message || "Failed to connect to database")
      onStatusChange("")
    } finally {
      setIsProcessing(false)
    }
  }

  const fetchSchema = async () => {
    const validationError = validateConnection()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsProcessing(true)
    setError("")
    onStatusChange("Connecting to database and fetching schema...")

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/datapuur/db-schema`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          type: connectionType,
          config: connectionConfig,
          chunkSize,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to fetch schema")
      }

      const data = await response.json()
      onSchemaDetected(data.schema)
      onStatusChange("Schema fetched successfully!")
    } catch (error) {
      console.error("Error fetching schema:", error)
      setError(error.message || "Failed to fetch schema")
      onStatusChange("")
    } finally {
      setIsProcessing(false)
    }
  }

  const saveConnection = () => {
    if (!connectionName) {
      setError("Please provide a name for this connection")
      return
    }

    const validationError = validateConnection()
    if (validationError) {
      setError(validationError)
      return
    }

    const newConnection = {
      id: Date.now().toString(),
      name: connectionName,
      type: connectionType,
      config: { ...connectionConfig, password: "********" }, // Mask password for UI
    }

    setSavedConnections([...savedConnections, newConnection])
    setConnectionName("")
    onStatusChange(`Connection "${connectionName}" saved successfully!`)

    // Clear status after 3 seconds
    setTimeout(() => onStatusChange(""), 3000)
  }

  const loadConnection = (connection) => {
    setConnectionType(connection.type)
    setConnectionConfig({
      ...connection.config,
      password: "", // Clear password for security
    })
  }

  const deleteConnection = (id) => {
    setSavedConnections(savedConnections.filter((conn) => conn.id !== id))
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
        <Database className="w-5 h-5 mr-2 text-primary" />
        Database Connection
      </h3>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="connectionType">Database Type</Label>
            <Select value={connectionType} onValueChange={handleTypeChange}>
              <SelectTrigger id="connectionType">
                <SelectValue placeholder="Select database type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mysql">MySQL</SelectItem>
                <SelectItem value="postgresql">PostgreSQL</SelectItem>
                <SelectItem value="mssql">SQL Server</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              name="host"
              value={connectionConfig.host}
              onChange={handleInputChange}
              placeholder="e.g., localhost or 192.168.1.1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              name="port"
              value={connectionConfig.port}
              onChange={handleInputChange}
              placeholder="e.g., 3306 for MySQL"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="database">Database Name</Label>
            <Input
              id="database"
              name="database"
              value={connectionConfig.database}
              onChange={handleInputChange}
              placeholder="e.g., my_database"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              value={connectionConfig.username}
              onChange={handleInputChange}
              placeholder="e.g., root"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={connectionConfig.password}
              onChange={handleInputChange}
              placeholder="Enter password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="table">Table Name</Label>
            <Input
              id="table"
              name="table"
              value={connectionConfig.table}
              onChange={handleInputChange}
              placeholder="e.g., customers"
            />
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              className="flex-1 border-primary text-primary hover:bg-primary/10"
              onClick={testConnection}
              disabled={isProcessing}
            >
              Test Connection
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={fetchSchema}
              disabled={isProcessing}
            >
              <Play className="mr-2 h-4 w-4" />
              Fetch Schema
            </Button>
          </div>
        </div>
      </div>

      {/* Save Connection Section */}
      <div className="border-t border-border pt-4 mt-4">
        <h4 className="font-medium text-foreground mb-4">Save Connection</h4>
        <div className="flex space-x-2">
          <Input
            placeholder="Connection name"
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
          />
          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
            onClick={saveConnection}
            disabled={isProcessing}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Saved Connections */}
      {savedConnections.length > 0 && (
        <div className="border-t border-border pt-4">
          <h4 className="font-medium text-foreground mb-4">Saved Connections</h4>
          <div className="space-y-2">
            {savedConnections.map((conn) => (
              <div
                key={conn.id}
                className="flex justify-between items-center p-3 border border-border rounded-md bg-card/50 hover:bg-card"
              >
                <div>
                  <p className="font-medium text-foreground">{conn.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {conn.type} • {conn.config.host}:{conn.config.port} • {conn.config.database}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadConnection(conn)}
                    className="h-8 px-2 text-primary"
                  >
                    Load
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteConnection(conn.id)}
                    className="h-8 px-2 text-destructive"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

