import { create } from "zustand"

interface UIState {
  // Sidebar
  sidebarExpanded: boolean
  setSidebarExpanded: (expanded: boolean) => void
  toggleSidebar: () => void

  // Active route
  activeRoute: string
  setActiveRoute: (route: string) => void

  // Command palette
  isCommandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void

  // Modals
  activeModal: string | null
  openModal: (modal: string) => void
  closeModal: () => void

  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
}

export interface Toast {
  id: string
  type: "success" | "error" | "warning" | "info"
  title: string
  message?: string
  duration?: number
}

let toastId = 0

export const useUIStore = create<UIState>((set) => ({
  sidebarExpanded: false,
  setSidebarExpanded: (sidebarExpanded) => set({ sidebarExpanded }),
  toggleSidebar: () =>
    set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),

  activeRoute: "/",
  setActiveRoute: (activeRoute) => set({ activeRoute }),

  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
  toggleCommandPalette: () =>
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  activeModal: null,
  openModal: (activeModal) => set({ activeModal }),
  closeModal: () => set({ activeModal: null }),

  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastId}`
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))
    // Auto-remove
    const duration = toast.duration ?? 4000
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, duration)
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))
