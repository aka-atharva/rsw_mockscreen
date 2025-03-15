"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export function ProcessingConfig({ chunkSize, setChunkSize, isProcessing }) {
  const handleChunkSizeChange = (e) => {
    const value = Number.parseInt(e.target.value)
    if (!isNaN(value)) {
      setChunkSize(value)
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-foreground">Processing Configuration</h4>
      <div className="space-y-2">
        <Label htmlFor="chunkSize">Chunk Size</Label>
        <Input
          id="chunkSize"
          type="number"
          value={chunkSize}
          onChange={handleChunkSizeChange}
          disabled={isProcessing}
          className="bg-background border-input text-foreground"
        />
      </div>
    </div>
  )
}

