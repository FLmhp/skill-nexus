import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as ipc from "../services/ipc"
import { useUIStore } from "../stores/useUIStore"
import { useAppStore } from "../stores/useAppStore"
import { skillKeys } from "./useSkills"

export const toolKeys = {
  all: ["tools"] as const,
  lists: () => [...toolKeys.all, "list"] as const,
}

export const deploymentKeys = {
  all: ["deployments"] as const,
  status: () => [...deploymentKeys.all, "status"] as const,
  bySkill: (skillId: string) => [...deploymentKeys.all, "skill", skillId] as const,
  byTool: (toolId: string) => [...deploymentKeys.all, "tool", toolId] as const,
}

// ── Tools ──
export function useToolsList() {
  return useQuery({
    queryKey: toolKeys.lists(),
    queryFn: ipc.listTools,
    staleTime: 30_000,
  })
}

export function useDetectTools() {
  const queryClient = useQueryClient()
  const setConnectedTools = useAppStore((s) => s.setConnectedToolsCount)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: ipc.detectTools,
    onSuccess: (tools) => {
      queryClient.invalidateQueries({ queryKey: toolKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ["system"] })
      setConnectedTools(tools.filter((t) => t.is_active).length)
      addToast({ type: "success", title: `Detected ${tools.length} tool${tools.length !== 1 ? "s" : ""}` })
    },
    onError: (error: Error) => {
      addToast({ type: "error", title: "Tool scan failed", message: error.message })
    },
  })
}

export function useAddTool() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)
  return useMutation({
    mutationFn: ipc.addTool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: toolKeys.lists() })
      addToast({ type: "success", title: "Tool added" })
    },
  })
}

export function useUpdateTool() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ipc.UpdateToolInput }) => ipc.updateTool(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: toolKeys.lists() }),
  })
}

export function useRemoveTool() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ipc.removeTool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: toolKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ["system"] })
    },
  })
}

// ── Deployments ──
export function useDeployments(skillId?: string, toolId?: string) {
  return useQuery({
    queryKey: skillId ? deploymentKeys.bySkill(skillId) : deploymentKeys.byTool(toolId ?? ""),
    queryFn: () => ipc.getDeployments(skillId, toolId),
    enabled: !!(skillId || toolId),
  })
}

export function useDeploymentStatus() {
  return useQuery({
    queryKey: deploymentKeys.status(),
    queryFn: ipc.getDeploymentStatus,
    refetchInterval: 30_000,
  })
}

export function useDeploySkill() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)
  return useMutation({
    mutationFn: ({ skillId, toolId, method }: { skillId: string; toolId: string; method?: string }) =>
      ipc.deploySkill(skillId, toolId, method),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: deploymentKeys.bySkill(data.skill_id) })
      queryClient.invalidateQueries({ queryKey: deploymentKeys.status() })
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() })
      addToast({ type: "success", title: "Skill deployed" })
    },
    onError: (error: Error) => {
      addToast({ type: "error", title: "Deploy failed", message: error.message })
    },
  })
}

export function useUndeploySkill() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)
  return useMutation({
    mutationFn: ({ skillId, toolId }: { skillId: string; toolId: string }) =>
      ipc.undeploySkill(skillId, toolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deploymentKeys.all })
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() })
      addToast({ type: "success", title: "Skill undeployed" })
    },
  })
}

export function useBulkDeploy() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)
  return useMutation({
    mutationFn: ({ skillIds, toolId }: { skillIds: string[]; toolId: string }) =>
      ipc.bulkDeploy(skillIds, toolId),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: deploymentKeys.all })
      addToast({ type: "success", title: `Deployed ${results.length} skills` })
    },
  })
}
