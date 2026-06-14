import { create } from "zustand";

type Theme = "dark" | "light";

interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
  activeRoute: string;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setActiveRoute: (route: string) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: "dark",
  sidebarCollapsed: false,
  activeRoute: "/",

  toggleTheme: () => {
    const newTheme = get().theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("light", newTheme === "light");
    set({ theme: newTheme });
  },

  toggleSidebar: () => {
    set({ sidebarCollapsed: !get().sidebarCollapsed });
  },

  setActiveRoute: (route) => set({ activeRoute: route }),
}));
