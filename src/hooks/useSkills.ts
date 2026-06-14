import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as ipc from "../services/ipc"
import type { SkillFilters, CreateSkillInput, UpdateSkillInput } from "../services/ipc"
import { useAppStore } from "../stores/useAppStore"
import { useUIStore } from "../stores/useUIStore"

// ── Query Keys ──
export const skillKeys = {
  all: ["skills"] as const,
  lists: () => [...skillKeys.all, "list"] as const,
  list: (filters: SkillFilters) => [...skillKeys.lists(), filters] as const,
  details: () => [...skillKeys.all, "detail"] as const,
  detail: (id: string) => [...skillKeys.details(), id] as const,
  versions: (id: string) => [...skillKeys.all, "versions", id] as const,
}

// ── List Skills (with filters) ──
export function useSkillsList(filters: SkillFilters = {}) {
  return useQuery({
    queryKey: skillKeys.list(filters),
    queryFn: () => ipc.listSkills(filters),
    staleTime: 10_000,
  })
}

// ── Get Single Skill ──
export function useSkill(id: string | undefined) {
  return useQuery({
    queryKey: skillKeys.detail(id ?? ""),
    queryFn: () => ipc.getSkill(id!),
    enabled: !!id,
  })
}

// ── Get Skill Versions ──
export function useSkillVersions(skillId: string | undefined) {
  return useQuery({
    queryKey: skillKeys.versions(skillId ?? ""),
    queryFn: () => ipc.getSkillVersions(skillId!),
    enabled: !!skillId,
  })
}

// ── Create Skill ──
export function useCreateSkill() {
  const queryClient = useQueryClient()
  const setSkillCount = useAppStore((s) => s.setSkillCount)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: (input: CreateSkillInput) => ipc.createSkill(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ["system"] })
      ipc.getOverviewStats().then((stats) => setSkillCount(stats.total_skills))
      addToast({ type: "success", title: "Skill created successfully" })
    },
    onError: (error: Error) => {
      addToast({ type: "error", title: "Failed to create skill", message: error.message })
    },
  })
}

// ── Update Skill ──
export function useUpdateSkill() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSkillInput }) =>
      ipc.updateSkill(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() })
      queryClient.invalidateQueries({ queryKey: skillKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: skillKeys.versions(data.id) })
      addToast({ type: "success", title: "Skill updated" })
    },
    onError: (error: Error) => {
      addToast({ type: "error", title: "Failed to update skill", message: error.message })
    },
  })
}

// ── Delete Skill ──
export function useDeleteSkill() {
  const queryClient = useQueryClient()
  const setSkillCount = useAppStore((s) => s.setSkillCount)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: (id: string) => ipc.deleteSkill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ["system"] })
      ipc.getOverviewStats().then((stats) => setSkillCount(stats.total_skills))
      addToast({ type: "success", title: "Skill deleted" })
    },
    onError: (error: Error) => {
      addToast({ type: "error", title: "Failed to delete skill", message: error.message })
    },
  })
}

// ── Duplicate Skill ──
export function useDuplicateSkill() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName?: string }) =>
      ipc.duplicateSkill(id, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() })
      addToast({ type: "success", title: "Skill duplicated" })
    },
    onError: (error: Error) => {
      addToast({ type: "error", title: "Failed to duplicate skill", message: error.message })
    },
  })
}

// ── Export Skill ──
export function useExportSkill() {
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: "Markdown" | "Json" | "Yaml" }) =>
      ipc.exportSkill(id, format),
    onSuccess: (path) => {
      addToast({ type: "success", title: "Skill exported", message: path })
    },
    onError: (error: Error) => {
      addToast({ type: "error", title: "Export failed", message: error.message })
    },
  })
}

// ── Import Skill ──
export function useImportSkill() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: (filePath: string) => ipc.importSkill(filePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() })
      addToast({ type: "success", title: "Skill imported successfully" })
    },
    onError: (error: Error) => {
      addToast({ type: "error", title: "Import failed", message: error.message })
    },
  })
}

// ── Restore Version ──
export function useRestoreSkillVersion() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: ({ skillId, version }: { skillId: string; version: number }) =>
      ipc.restoreSkillVersion(skillId, version),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: skillKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: skillKeys.versions(data.id) })
      addToast({ type: "success", title: "Version restored" })
    },
    onError: (error: Error) => {
      addToast({ type: "error", title: "Restore failed", message: error.message })
    },
  })
}
