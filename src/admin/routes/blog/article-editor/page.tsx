import { defineRouteConfig } from "@medusajs/admin-sdk"
import React, { Suspense, useEffect, useState } from "react"
import { MedusaProvider } from "../../../lib/compat-provider"

const ArticleEditorPage = () => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    import("medusa-plugin-blogger/dist/admin/_virtual_entry.js")
      .then((pluginEntry: any) => {
        // The plugin exports an entry object with extensions
        const entry = pluginEntry.default || pluginEntry
        const editorExtension = entry?.extensions?.find(
          (ext: any) => ext.config?.path === "/article-editor"
        )
        if (editorExtension?.Component) {
          setComponent(() => editorExtension.Component)
        } else {
          setError("Could not find ArticleEditorPage component in plugin")
        }
      })
      .catch((err) => {
        console.error("Error loading blog plugin:", err)
        setError("Failed to load blog plugin")
      })
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (!Component) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <MedusaProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <Component />
      </Suspense>
    </MedusaProvider>
  )
}

export const config = defineRouteConfig({
  // This is a nested route, so it won't show in the menu
})

export default ArticleEditorPage

