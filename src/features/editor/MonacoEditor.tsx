import { useRef, useEffect } from "react"
import Editor, { type OnMount } from "@monaco-editor/react"

interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
}

export default function MonacoEditor({ value, onChange, language = "markdown" }: MonacoEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Configure editor
    editor.updateOptions({
      fontSize: 14,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'SF Mono', Consolas, monospace",
      lineNumbers: "on",
      minimap: { enabled: false },
      wordWrap: "on",
      tabSize: 2,
      scrollBeyondLastLine: false,
      renderWhitespace: "selection",
      bracketPairColorization: { enabled: true },
      padding: { top: 16, bottom: 16 },
      automaticLayout: true,
    })

    // Custom theme
    monaco.editor.defineTheme("skills-nexus-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "569CD6" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
        { token: "type", foreground: "4EC9B0" },
      ],
      colors: {
        "editor.background": "#1a1b2e",
        "editor.foreground": "#d4d4d4",
        "editor.lineHighlightBackground": "#2a2b3e",
      },
    })

    // Apply dark theme
    if (document.documentElement.classList.contains("dark")) {
      monaco.editor.setTheme("skills-nexus-dark")
    }
  }

  // Reapply theme when dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (editorRef.current) {
        const isDark = document.documentElement.classList.contains("dark")
        editorRef.current.updateOptions({
          theme: isDark ? "skills-nexus-dark" : "vs",
        })
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      loading={
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-[var(--text-tertiary)]">Loading editor...</p>
        </div>
      }
      options={{
        readOnly: false,
        theme: document.documentElement.classList.contains("dark") ? "skills-nexus-dark" : "vs",
      }}
    />
  )
}
