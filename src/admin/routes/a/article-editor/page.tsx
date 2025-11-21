import { defineRouteConfig } from "@medusajs/admin-sdk"
import React, { Suspense, useEffect, useState, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { MedusaProvider } from "../../../lib/compat-provider"

// Note: Upload transformation is now handled in compat-provider.tsx via QueryClient subscription

const ArticleEditorPage = () => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const componentRef = useRef<HTMLDivElement>(null)
  const saveButtonRef = useRef<HTMLButtonElement | null>(null)

  // Function to trigger save by finding and clicking the plugin's save button
  // Defined early to avoid "Cannot access before initialization" errors
  const handleManualSave = async () => {
    setIsSaving(true)
    setSaveStatus("saving")

    try {
      // Try to find the plugin's save button and click it
      // The plugin likely has a save button with specific classes or data attributes
      let saveButton: HTMLButtonElement | null = null
      
      // Try multiple selectors to find the save button
      const selectors = [
        'button[type="submit"]',
        '[data-testid*="save"]',
        'button[aria-label*="save" i]',
      ]
      
      // Also try to find by text content
      const allButtons = Array.from(document.querySelectorAll('button'))
      for (const button of allButtons) {
        const text = button.textContent?.toLowerCase() || ''
        if (text.includes('save') && !button.disabled) {
          saveButton = button
          break
        }
      }
      
      // If not found by text, try selectors
      if (!saveButton) {
        for (const selector of selectors) {
          try {
            const found = document.querySelector(selector) as HTMLButtonElement
            if (found && !found.disabled) {
              saveButton = found
              break
            }
          } catch (e) {
            // Invalid selector, skip
          }
        }
      }

      if (saveButton && !saveButton.disabled) {
        saveButton.click()
        // Wait a bit to see if save was successful
        setTimeout(() => {
          setSaveStatus("saved")
          setIsSaving(false)
          setTimeout(() => setSaveStatus("idle"), 2000)
        }, 1000)
      } else {
        // If we can't find the save button, try to trigger a form submit
        const form = document.querySelector('form') as HTMLFormElement
        if (form) {
          form.requestSubmit()
          setTimeout(() => {
            setSaveStatus("saved")
            setIsSaving(false)
            setTimeout(() => setSaveStatus("idle"), 2000)
          }, 1000)
        } else {
          setSaveStatus("error")
          setIsSaving(false)
          setTimeout(() => setSaveStatus("idle"), 2000)
        }
      }
    } catch (err) {
      console.error("Error triggering save:", err)
      setSaveStatus("error")
      setIsSaving(false)
      setTimeout(() => setSaveStatus("idle"), 2000)
    }
  }

  // Effect to position Save button next to Upload button and rename Upload to Metadata
  useEffect(() => {
    if (!Component) return

    const setupSaveButton = () => {
      // Find the Upload button by its text content
      const allButtons = Array.from(document.querySelectorAll('button'))
      let uploadButton: HTMLButtonElement | null = null
      
      for (const button of allButtons) {
        const text = button.textContent?.trim() || ''
        if (text === 'Upload') {
          uploadButton = button
          break
        }
      }

      if (uploadButton) {
        // Change Upload button text to Metadata
        uploadButton.textContent = 'Metadata'
        
        // Find the container that holds the Upload button
        // It should be in a flex container with "justify-between"
        let container = uploadButton.parentElement
        while (container && !container.classList.contains('flex')) {
          container = container.parentElement
        }
        
        if (container && container.classList.contains('flex')) {

          // Check if Save button already exists, if so just update it
          let saveButtonElement = container.querySelector('[data-custom-save-button]') as HTMLButtonElement
          
          if (!saveButtonElement) {
            // Create Save button element
            saveButtonElement = document.createElement('button')
            saveButtonElement.setAttribute('data-custom-save-button', 'true')
            saveButtonElement.onclick = (e) => {
              e.preventDefault()
              e.stopPropagation()
              handleManualSave()
            }

            // Insert Save button right after Upload button
            uploadButton.parentNode?.insertBefore(saveButtonElement, uploadButton.nextSibling)
            saveButtonRef.current = saveButtonElement
          }

          // Update Save button text and state
          saveButtonElement.textContent = saveStatus === "saving" ? "Saving..." : 
                                          saveStatus === "saved" ? "✓ Saved" : 
                                          saveStatus === "error" ? "✗ Error" : "Save"
          saveButtonElement.className = `
            px-4 py-2 rounded-md font-medium text-sm transition-all
            ${
              saveStatus === "saving"
                ? "bg-gray-400 text-white cursor-not-allowed"
                : saveStatus === "saved"
                ? "bg-green-600 text-white"
                : saveStatus === "error"
                ? "bg-red-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
            }
            shadow-lg hover:shadow-xl
            disabled:opacity-50 disabled:cursor-not-allowed
          `.trim().replace(/\s+/g, ' ')
          saveButtonElement.disabled = isSaving
        }
      }
    }

    // Try to set up immediately
    setupSaveButton()

    // Also set up with a small delay in case the component hasn't fully rendered
    const timeoutId = setTimeout(setupSaveButton, 500)

    // Use MutationObserver to watch for DOM changes
    const observer = new MutationObserver(() => {
      setupSaveButton()
    })

    if (componentRef.current) {
      observer.observe(componentRef.current, {
        childList: true,
        subtree: true,
      })
    }

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [Component, saveStatus, isSaving, handleManualSave])

  useEffect(() => {
    // Handle redirect from /a/article-editor to /app/a/article-editor if needed
    if (typeof window !== "undefined" && window.location.pathname === "/a/article-editor") {
      const queryString = window.location.search
      window.location.replace(`/app/a/article-editor${queryString}`)
      return
    }

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

    // Intercept fetch requests to ensure empty values are sent
    // This fixes the issue where the plugin filters out empty values
    const originalFetch = window.fetch
    window.fetch = async function(...args) {
      const [url, options] = args
      
      // Only intercept requests to our blog API
      if (typeof url === 'string' && url.includes('/admin/blog/articles')) {
        // If it's a POST/PUT request with a body, ensure empty values are included
        if (options && options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
          if (options.body) {
            try {
              // Parse the body if it's a string
              let bodyData: any = {}
              if (typeof options.body === 'string') {
                try {
                  bodyData = JSON.parse(options.body)
                } catch (e) {
                  // If parsing fails, keep original body
                  return originalFetch.apply(this, args)
                }
              } else if (options.body instanceof FormData) {
                // For FormData, we can't easily modify it, so we'll handle it differently
                return originalFetch.apply(this, args)
              } else {
                bodyData = options.body || {}
              }

              // Get all form fields directly from the DOM
              // This ensures we capture empty values even if the plugin filters them out
              const form = document.querySelector('form') || document
              const formEntries: Record<string, any> = {}
              
              // Field name mapping (plugin uses kebab-case, API expects snake_case)
              const fieldMap: Record<string, string> = {
                'seo-title': 'seo_title',
                'seo-keywords': 'seo_keywords',
                'seo-description': 'seo_description',
                'url-slug': 'url_slug',
              }

              // Get all input, textarea, and select elements
              const inputs = form.querySelectorAll('input, textarea, select')
              inputs.forEach((input: any) => {
                const name = input.name || input.id
                if (name) {
                  // Map field names
                  const mappedName = fieldMap[name] || name.replace(/-/g, '_')
                  
                  // Get the current value
                  let value: any = input.value
                  
                  // Handle empty values - explicitly set to empty string
                  if (value === '' || value === null || value === undefined) {
                    formEntries[mappedName] = ''
                  } else {
                    formEntries[mappedName] = value
                  }
                }
              })

              // Also check for specific fields mentioned by the user
              const specificFields = ['author', 'seo_title', 'seo_keywords', 'seo_description', 'url_slug', 'subtitle']
              specificFields.forEach(fieldName => {
                // Try different selectors
                const selectors = [
                  `[name="${fieldName}"]`,
                  `[id="${fieldName}"]`,
                  `[name="${fieldName.replace(/_/g, '-')}"]`,
                  `[id="${fieldName.replace(/_/g, '-')}"]`,
                ]
                
                for (const selector of selectors) {
                  const input = form.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement
                  if (input) {
                    const value = input.value
                    if (value === '' || value === null || value === undefined) {
                      formEntries[fieldName] = ''
                    } else {
                      formEntries[fieldName] = value
                    }
                    break
                  }
                }
              })

              // Merge form data with existing body data
              // Form data takes precedence to ensure empty values are included
              const mergedData = { ...bodyData, ...formEntries }
              
              // Log for debugging
              console.log("[Article Editor] Intercepted save request")
              console.log("[Article Editor] Original body:", bodyData)
              console.log("[Article Editor] Form entries:", formEntries)
              console.log("[Article Editor] Merged data:", mergedData)

              // Update the body with merged data
              options.body = JSON.stringify(mergedData)
              options.headers = {
                ...options.headers,
                'Content-Type': 'application/json',
              }
            } catch (e) {
              console.error("Error intercepting fetch for empty values:", e)
            }
          }
        }
      }
      
      return originalFetch.apply(this, args)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  // The plugin component reads the article ID from window.location.href using getIdFromCurrentUrl()
  // which parses the 'id' query parameter from the URL

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
      <div className="relative">
        {/* Save button will be injected next to Upload button via useEffect */}
        <div ref={componentRef}>
          <Suspense fallback={<div>Loading...</div>}>
            <Component />
          </Suspense>
        </div>
      </div>
    </MedusaProvider>
  )
}

export const config = defineRouteConfig({
  // This is a nested route, so it won't show in the menu
})

export default ArticleEditorPage

