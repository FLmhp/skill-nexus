import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function clampRiskScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function riskLevel(score: number): "low" | "medium" | "high" {
  const normalized = clampRiskScore(score);
  if (normalized < 30) return "low";
  if (normalized < 70) return "medium";
  return "high";
}

export function riskTextClass(score: number): string {
  const level = riskLevel(score);
  if (level === "low") return "text-green-400";
  if (level === "medium") return "text-yellow-400";
  return "text-red-400";
}

export function riskBarClass(score: number): string {
  const level = riskLevel(score);
  if (level === "low") return "bg-green-500";
  if (level === "medium") return "bg-yellow-500";
  return "bg-red-500";
}

export function riskBadgeClass(score: number): string {
  const level = riskLevel(score);
  if (level === "low") return "bg-green-500/10 text-green-400";
  if (level === "medium") return "bg-yellow-500/10 text-yellow-400";
  return "bg-red-500/10 text-red-400";
}
