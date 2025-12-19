import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">온라인 시험 시스템</h1>
        <p className="mt-4 text-muted-foreground">React 19 + TypeScript + Vite</p>
      </div>
    </div>
  )
}
