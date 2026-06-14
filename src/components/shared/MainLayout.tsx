import { Outlet } from "react-router-dom"
import { AppSidebar } from "./AppSidebar"
import { StatusBar } from "./StatusBar"

export function MainLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--surface-background)]">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <StatusBar />
      </div>
    </div>
  )
}
