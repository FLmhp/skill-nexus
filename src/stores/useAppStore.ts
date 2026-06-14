import { create } from "zustand"

export type ThemeMode = "light" | "dark" | "system"

interface AppState {
  // Theme
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void

  // Hub path
  hubPath: string
  setHubPath: (path: string) => void

  // Skill count
  skillCount: number
  setSkillCount: (count: number) => void

  // Connected tools count
  connectedToolsCount: number
  setConnectedToolsCount: (count: number) => void

  // Is loading
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  theme: (localStorage.getItem("skills-nexus-theme") as ThemeMode) || "system",
  setTheme: (theme) => {
    localStorage.setItem("skills-nexus-theme", theme)
    set({ theme })
  },

  hubPath: "",
  setHubPath: (hubPath) => set({ hubPath }),

  skillCount: 0,
  setSkillCount: (skillCount) => set({ skillCount }),

  connectedToolsCount: 0,
  setConnectedToolsCount: (connectedToolsCount) => set({ connectedToolsCount }),

  isLoading: true,
  setLoading: (isLoading) => set({ isLoading }),
}))
