import { useEffect } from 'react'
import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet, redirect } from '@tanstack/react-router'
import { Toaster } from 'sonner'
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
import { StudentListPage } from './features/students/StudentListPage'
import { AnalyticsPage } from './features/analytics/AnalyticsPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { ExamListPage } from './features/exams/ExamListPage'
import { ExamTakePage } from './features/exams/ExamTakePage'
import { ExamResultPage } from './features/exams/ExamResultPage'
import { ExamResultsListPage } from './features/exams/ExamResultsListPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { useAuthStore } from './stores/authStore'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

// Layout Route for authenticated pages (with DashboardLayout)
const authenticatedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  ),
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
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const profileRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/profile',
  component: ProfilePage,
})

const changePasswordRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/profile/change-password',
  component: ChangePasswordPage,
})

const questionsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/questions',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'teacher') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: QuestionListPage,
})

const questionNewRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/questions/new',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'teacher') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: QuestionForm,
})

const questionDetailRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/questions/$id',
  component: QuestionDetailPage,
})

const questionEditRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/questions/$id/edit',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'teacher') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: QuestionForm,
})

const testpapersRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/testpapers',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'teacher') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: TestPaperListPage,
})

const testpaperNewRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/testpapers/new',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'teacher') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: TestPaperForm,
})

const testpaperDetailRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/testpapers/$id',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'teacher') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: TestPaperDetailPage,
})

const testpaperEditRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/testpapers/$id/edit',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'teacher') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: TestPaperForm,
})

const examinationsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/examinations',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'teacher') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ExaminationListPage,
})

const examinationNewRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/examinations/new',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'teacher') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ExaminationForm,
})

const examinationDetailRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/examinations/$id',
  component: ExaminationDetailPage,
})

const examinationEditRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/examinations/$id/edit',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'teacher') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ExaminationForm,
})

const studentsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/students',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'teacher') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: StudentListPage,
})

const analyticsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/analytics',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'teacher') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AnalyticsPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/settings',
  component: SettingsPage,
})

const examsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/exams',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'student') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ExamListPage,
})

// examTakeRoute - 전체화면 필요 (DashboardLayout 미적용)
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
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/exams/$id/result',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'student') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ExamResultPage,
})

const examResultsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/exams/results',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.user_type !== 'student') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ExamResultsListPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  examTakeRoute, // 전체화면 (DashboardLayout 없음)
  authenticatedLayoutRoute.addChildren([
    dashboardRoute,
    profileRoute,
    changePasswordRoute,
    settingsRoute,
    // Teacher routes
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
    studentsRoute,
    analyticsRoute,
    // Student routes
    examsRoute,
    examResultRoute,
    examResultsRoute,
  ]),
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

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 3000,
        }}
      />
    </>
  )
}

export default App
