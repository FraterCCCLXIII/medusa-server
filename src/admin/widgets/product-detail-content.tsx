"use client"

import { defineWidgetConfig, DetailWidgetProps } from "@medusajs/admin-sdk"
import { Container, Heading, Textarea, Button, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { sdk } from "../lib/compat-provider"

const ProductDetailContentWidget = ({
  data,
}: DetailWidgetProps<any>) => {
  const [description, setDescription] = useState("")
  const [coa, setCoa] = useState("")
  const [research, setResearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load existing metadata
  useEffect(() => {
    if (data?.metadata) {
      const metadata =
        typeof data.metadata === "string"
          ? JSON.parse(data.metadata)
          : data.metadata

      setDescription(metadata.description || "")
      setCoa(metadata.coa || "")
      setResearch(metadata.research || "")
    }
  }, [data])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const currentMetadata =
        typeof data.metadata === "string"
          ? JSON.parse(data.metadata || "{}")
          : data.metadata || {}

      const updatedMetadata = {
        ...currentMetadata,
        description: description.trim(),
        coa: coa.trim(),
        research: research.trim(),
      }

      await sdk.admin.product.update(data.id, {
        metadata: updatedMetadata,
      })

      toast.success("Product detail content saved successfully")
      // Reload the page to show updated data
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error: any) {
      toast.error(error.message || "Failed to save product detail content")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Product Detail Content</Heading>
        </div>
        <div className="px-6 py-4">Loading...</div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Product Detail Content</Heading>
          <p className="text-ui-fg-subtle txt-small mt-1">
            Manage Description, COA, and Research tabs content (supports HTML)
          </p>
        </div>
      </div>

      <div className="px-6 py-4 space-y-6">
        <div>
          <label className="txt-compact-small-plus text-ui-fg-base mb-2 block">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter HTML content for the Description tab..."
            rows={6}
            className="font-mono text-sm"
          />
          <p className="txt-compact-small text-ui-fg-subtle mt-1">
            HTML is supported. Use &lt;p&gt;, &lt;strong&gt;, &lt;img&gt;, etc.
          </p>
        </div>

        <div>
          <label className="txt-compact-small-plus text-ui-fg-base mb-2 block">
            COA (Certificate of Analysis)
          </label>
          <Textarea
            value={coa}
            onChange={(e) => setCoa(e.target.value)}
            placeholder="Enter HTML content for the COA tab..."
            rows={6}
            className="font-mono text-sm"
          />
          <p className="txt-compact-small text-ui-fg-subtle mt-1">
            HTML is supported. Use &lt;p&gt;, &lt;strong&gt;, &lt;img&gt;, etc.
          </p>
        </div>

        <div>
          <label className="txt-compact-small-plus text-ui-fg-base mb-2 block">
            Research
          </label>
          <Textarea
            value={research}
            onChange={(e) => setResearch(e.target.value)}
            placeholder="Enter HTML content for the Research tab..."
            rows={6}
            className="font-mono text-sm"
          />
          <p className="txt-compact-small text-ui-fg-subtle mt-1">
            HTML is supported. Use &lt;p&gt;, &lt;strong&gt;, &lt;img&gt;, etc.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            variant="primary"
            size="small"
          >
            {isSaving ? "Saving..." : "Save Content"}
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductDetailContentWidget

