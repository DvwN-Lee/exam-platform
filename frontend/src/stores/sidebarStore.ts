import { create } from 'zustand'

interface SidebarStore {
  isOpen: boolean
  isCollapsed: boolean
  toggle: () => void
  open: () => void
  close: () => void
  setCollapsed: (collapsed: boolean) => void
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isOpen: false,
  isCollapsed: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
}))
