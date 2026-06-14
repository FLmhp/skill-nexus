import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  FlaskConical, Play, Loader2, CheckCircle, XCircle,
  Clock, Zap, ChevronDown
} from "lucide-react"
import { useSkillsList } from "../../hooks/useSkills"
import { cn } from "../../lib/cn"
import type { TestResultDTO as TestResult } from "../../services/ipc"

export function TestingSandboxPage() {
  const { t: _t } = useTranslation()

  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [prompt, setPrompt] = useState("")
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [showSkillPicker, setShowSkillPicker] = useState(false)

  const { data: skillData } = useSkillsList({ limit: 100 })
  const skills = skillData?.items ?? []

  const toggleSkill = (id: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const selectedSkills = skills.filter((s) => selectedSkillIds.includes(s.id))

  const handleRunAll = async () => {
    if (selectedSkillIds.length === 0 || !prompt.trim()) return
    setIsRunning(true)
    setResults([])

    try {
      // Call each skill individually via invoke
      const { invoke } = await import("@tauri-apps/api/core")
      const newResults: TestResult[] = []

      for (const skill of selectedSkills) {
        try {
          const result: TestResult = await invoke("run_skill_test", {
            skillId: skill.id,
            inputPrompt: prompt,
            model: null,
          })
          newResults.push(result)
        } catch (e) {
          newResults.push({
            skill_id: skill.id,
            skill_name: skill.name,
            input_prompt: prompt,
            actual_output: `Error: ${e}`,
            score: 0,
            duration_ms: 0,
            model_used: "error",
            status: "error",
          })
        }
      }
      setResults(newResults)
    } finally {
      setIsRunning(false)
    }
  }

  const selectedNames = selectedSkills.map((s) => s.name).join(", ")

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border-default)] bg-[var(--surface-panel)] px-6 py-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Testing Sandbox</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Test your skills side-by-side with the same input prompt
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Skill selector */}
        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)]">Select Skills to Test</label>
          <div className="relative mt-1">
            <button
              onClick={() => setShowSkillPicker(!showSkillPicker)}
              className="flex w-full items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-2.5 text-sm"
            >
              <span className={selectedSkillIds.length > 0 ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}>
                {selectedSkillIds.length > 0 ? `${selectedSkillIds.length} selected: ${selectedNames.slice(0, 80)}${selectedNames.length > 80 ? "..." : ""}` : "Click to select skills..."}
              </span>
              <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
            </button>
            {showSkillPicker && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-lg max-h-48 overflow-auto">
                {skills.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[var(--text-tertiary)]">No skills available</p>
                ) : (
                  skills.map((skill) => (
                    <label key={skill.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-background)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSkillIds.includes(skill.id)}
                        onChange={() => toggleSkill(skill.id)}
                        className="rounded"
                      />
                      <span className="text-sm text-[var(--text-primary)]">{skill.name}</span>
                      <span className="text-xs text-[var(--text-tertiary)] ml-auto">{skill.type}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Prompt input */}
        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)]">Test Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt to test your skills against..."
            rows={4}
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3 text-sm mt-1 resize-y focus:outline-none focus:border-[var(--brand-primary)]"
          />
        </div>

        {/* Run button */}
        <button
          onClick={handleRunAll}
          disabled={isRunning || selectedSkillIds.length === 0 || !prompt.trim()}
          className="flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
        >
          {isRunning ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Running...</>
          ) : (
            <><Play className="h-4 w-4" /> Run All ({selectedSkillIds.length} skills)</>
          )}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Results
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {results.map((result) => (
                <ResultCard key={result.skill_id} result={result} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ResultCard({ result }: { result: TestResult }) {
  const isError = result.status === "error"
  const scorePct = Math.round(result.score * 100)

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isError ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : result.score >= 0.5 ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-amber-500" />
          )}
          <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">{result.skill_name}</h4>
        </div>
        <span className={cn(
          "px-2 py-0.5 rounded text-xs font-bold",
          scorePct >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
          scorePct >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
          "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
        )}>
          {scorePct}%
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {result.duration_ms > 0 ? `${result.duration_ms}ms` : "N/A"}
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          {result.model_used}
        </span>
      </div>

      {/* Output */}
      <div className="rounded border border-[var(--border-default)] bg-[var(--surface-background)] p-3 max-h-48 overflow-auto">
        <pre className="text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap">
          {result.actual_output || "(empty response)"}
        </pre>
      </div>
    </div>
  )
}
