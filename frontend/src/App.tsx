import { useEffect } from 'react'
import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet, redirect } from '@tanstack/react-router'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { ChangePasswordPage } from './features/profile/ChangePasswordPage'
import { QuestionListPage } from './features/questions/QuestionListPage'
import { QuestionForm } from './features/questions/QuestionForm'
import { QuestionDetailPage } from './features/questions/QuestionDetailPage'
import { TestPaperListPage } from './features/testpapers/TestPaperListPage'
import { TestPaperForm } from './features/testpapers/TestPaperForm'
import { TestPaperDetailPage } from './features/testpapers/TestPaperDetailPage'
import { ExaminationListPage } from './features/examinations/ExaminationListPage'
import { ExaminationForm} from './features/examinations/ExaminationForm'
import { ExaminationDetailPage } from './features/examinations/ExaminationDetailPage'
import { ExamListPage } from './features/exams/ExamListPage'
import { ExamTakePage } from './features/exams/ExamTakePage'
import { ExamResultPage } from './features/exams/ExamResultPage'
import { ExamResultsListPage } from './features/exams/ExamResultsListPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { useAuthStore } from './stores/authStore'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: () => (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  ),
})

const changePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/change-password',
  component: () => (
    <ProtectedRoute>
      <ChangePasswordPage />
    </ProtectedRoute>
  ),
})

const questionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/questions',
  component: () => (
    <ProtectedRoute requireRole="teacher">
      <QuestionListPage />
    </ProtectedRoute>
  ),
})

const questionNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/questions/new',
  component: () => (
    <ProtectedRoute requireRole="teacher">
      <QuestionForm />
    </ProtectedRoute>
  ),
})

const questionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/questions/$id',
  component: () => (
    <ProtectedRoute>
      <QuestionDetailPage />
    </ProtectedRoute>
  ),
})

const questionEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/questions/$id/edit',
  component: () => (
    <ProtectedRoute requireRole="teacher">
      <QuestionForm />
    </ProtectedRoute>
  ),
})

const testpapersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/testpapers',
  component: () => (
    <ProtectedRoute requireRole="teacher">
      <TestPaperListPage />
    </ProtectedRoute>
  ),
})

const testpaperNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/testpapers/new',
  component: () => (
    <ProtectedRoute requireRole="teacher">
      <TestPaperForm />
    </ProtectedRoute>
  ),
})

const testpaperDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/testpapers/$id',
  component: () => (
    <ProtectedRoute requireRole="teacher">
      <TestPaperDetailPage />
    </ProtectedRoute>
  ),
})

const testpaperEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/testpapers/$id/edit',
  component: () => (
    <ProtectedRoute requireRole="teacher">
      <TestPaperForm />
    </ProtectedRoute>
  ),
})

const examinationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/examinations',
  component: () => (
    <ProtectedRoute requireRole="teacher">
      <ExaminationListPage />
    </ProtectedRoute>
  ),
})

const examinationNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/examinations/new',
  component: () => (
    <ProtectedRoute requireRole="teacher">
      <ExaminationForm />
    </ProtectedRoute>
  ),
})

const examinationDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/examinations/$id',
  component: () => (
    <ProtectedRoute>
      <ExaminationDetailPage />
    </ProtectedRoute>
  ),
})

const examinationEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/examinations/$id/edit',
  component: () => (
    <ProtectedRoute requireRole="teacher">
      <ExaminationForm />
    </ProtectedRoute>
  ),
})

const examsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/exams',
  component: () => (
    <ProtectedRoute requireRole="student">
      <ExamListPage />
    </ProtectedRoute>
  ),
})

const examTakeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/exams/$id/take',
  component: () => (
    <ProtectedRoute requireRole="student">
      <ExamTakePage />
    </ProtectedRoute>
  ),
})

const examResultRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/exams/$id/result',
  component: () => (
    <ProtectedRoute requireRole="student">
      <ExamResultPage />
    </ProtectedRoute>
  ),
})

const examResultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/exams/results',
  component: () => (
    <ProtectedRoute requireRole="student">
      <ExamResultsListPage />
    </ProtectedRoute>
  ),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  dashboardRoute,
  profileRoute,
  changePasswordRoute,
  questionsRoute,
  questionNewRoute,
  questionDetailRoute,
  questionEditRoute,
  testpapersRoute,
  testpaperNewRoute,
  testpaperDetailRoute,
  testpaperEditRoute,
  examinationsRoute,
  examinationNewRoute,
  examinationDetailRoute,
  examinationEditRoute,
  examsRoute,
  examTakeRoute,
  examResultRoute,
  examResultsRoute,
])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return <RouterProvider router={router} />
}

export default App
