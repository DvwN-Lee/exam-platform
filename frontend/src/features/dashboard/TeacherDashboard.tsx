import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { dashboardApi } from '@/api/dashboard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  getScoreColor,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  FileText,
  Files,
  Users,
  TrendingUp,
  CheckCircle,
  FilePlus,
  UserPlus,
  Clock,
} from 'lucide-react'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

// Mock data for new sections (이 부분은 실제 API 연동 시 제거)
const mockExamResults = [
  {
    id: 1,
    name: '자료구조 중간고사',
    subject: '자료구조 및 알고리즘',
    students: 87,
    avgScore: 85.2,
    passRate: 92,
    status: 'ongoing',
  },
  {
    id: 2,
    name: '데이터베이스 기말고사',
    subject: '데이터베이스 설계',
    students: 124,
    avgScore: 78.5,
    passRate: 88,
    status: 'completed',
  },
  {
    id: 3,
    name: '알고리즘 실습 평가',
    subject: '고급 알고리즘',
    students: 65,
    avgScore: 88.7,
    passRate: 95,
    status: 'completed',
  },
  {
    id: 4,
    name: '운영체제 중간고사',
    subject: '운영체제',
    students: 92,
    avgScore: 72.3,
    passRate: 75,
    status: 'upcoming',
  },
  {
    id: 5,
    name: '네트워크 과제 평가',
    subject: '컴퓨터 네트워크',
    students: 78,
    avgScore: 90.1,
    passRate: 97,
    status: 'completed',
  },
]

const mockActivities = [
  {
    id: 1,
    type: 'success',
    icon: CheckCircle,
    title: '자동 채점 완료',
    description: '자료구조 중간고사 87명 채점 완료',
    time: '5분 전',
  },
  {
    id: 2,
    type: 'primary',
    icon: FilePlus,
    title: '새 문제 추가',
    description: '데이터베이스 실습 문제 12개 추가',
    time: '1시간 전',
  },
  {
    id: 3,
    type: 'warning',
    icon: UserPlus,
    title: '학생 등록',
    description: '알고리즘 실습 시험 등록 완료',
    time: '3시간 전',
  },
  {
    id: 4,
    type: 'success',
    icon: CheckCircle,
    title: '시험 종료',
    description: '알고리즘 실습 시험 종료됨',
    time: '5시간 전',
  },
  {
    id: 5,
    type: 'primary',
    icon: FilePlus,
    title: '시험지 생성',
    description: '운영체제 기말고사 시험지 생성',
    time: '1일 전',
  },
]

export function TeacherDashboard() {
  const navigate = useNavigate()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: dashboardApi.getTeacherDashboard,
  })

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <div>로딩 중...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!dashboard) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <div>대시보드 데이터를 불러올 수 없습니다.</div>
        </div>
      </DashboardLayout>
    )
  }

  const questionTypeData = [
    { name: '객관식', value: dashboard.question_statistics.questions_by_type.xz },
    { name: '주관식', value: dashboard.question_statistics.questions_by_type.pd },
    {
      name: '빈칸채우기',
      value: dashboard.question_statistics.questions_by_type.tk,
    },
  ]

  const questionDifficultyData = [
    { name: '쉬움', value: dashboard.question_statistics.questions_by_difficulty.jd },
    { name: '보통', value: dashboard.question_statistics.questions_by_difficulty.zd },
    { name: '어려움', value: dashboard.question_statistics.questions_by_difficulty.kn },
  ]

  // 점수 분포 데이터 (Mock - 실제로는 API에서 가져와야 함)
  const scoreDistributionData = [
    { range: '90-100점 (우수)', count: 245, percentage: 35, color: 'excellent' },
    { range: '80-89점 (양호)', count: 312, percentage: 45, color: 'good' },
    { range: '70-79점 (보통)', count: 98, percentage: 14, color: 'average' },
    { range: '60점 미만 (미흡)', count: 42, percentage: 6, color: 'poor' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">환영합니다, 박교수님</h1>
            <p className="text-muted-foreground">
              현재 3개의 시험이 진행 중이며, 새로운 알림이 5개 있습니다.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/questions/new' })}
            >
              + 문제 추가
            </Button>
            <Button onClick={() => navigate({ to: '/examinations/new' })}>
              시험 생성
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-lg border bg-card p-6">
            <div className="absolute right-4 top-4 text-primary/10">
              <FileText className="h-16 w-16" />
            </div>
            <div className="relative">
              <div className="text-sm font-medium text-muted-foreground">
                생성한 문제
              </div>
              <div className="mt-2 text-3xl font-bold">
                {dashboard.question_statistics.total_questions}
              </div>
              <div className="mt-1 text-sm text-green-600 font-medium">
                ↑ 12개 증가
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border bg-card p-6">
            <div className="absolute right-4 top-4 text-primary/10">
              <Files className="h-16 w-16" />
            </div>
            <div className="relative">
              <div className="text-sm font-medium text-muted-foreground">
                시험지 수
              </div>
              <div className="mt-2 text-3xl font-bold text-primary">18</div>
              <div className="mt-1 text-sm text-green-600 font-medium">
                ↑ 3개 추가
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border bg-card p-6">
            <div className="absolute right-4 top-4 text-primary/10">
              <Users className="h-16 w-16" />
            </div>
            <div className="relative">
              <div className="text-sm font-medium text-muted-foreground">
                총 응시자
              </div>
              <div className="mt-2 text-3xl font-bold">
                {dashboard.student_statistics.total_students}
              </div>
              <div className="mt-1 text-sm text-green-600 font-medium">
                ↑ 156명 증가
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border bg-card p-6">
            <div className="absolute right-4 top-4 text-primary/10">
              <TrendingUp className="h-16 w-16" />
            </div>
            <div className="relative">
              <div className="text-sm font-medium text-muted-foreground">
                평균 점수
              </div>
              <div className="mt-2 text-3xl font-bold text-green-600">
                {dashboard.student_statistics.average_score.toFixed(1)}
              </div>
              <div className="mt-1 text-sm text-red-600 font-medium">
                ↓ 1.2점 감소
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Charts Section */}
          <div className="space-y-6">
            {/* Pie Chart - Question Types */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">문제 유형 분포</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={questionTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {questionTypeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart - Question Difficulty */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">문제 난이도 분포</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={questionDifficultyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column - Activity & Score Distribution */}
          <div className="space-y-6">
            {/* Activity Timeline */}
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">최근 활동</h2>
                <Button variant="ghost" size="sm">
                  전체 보기 →
                </Button>
              </div>

              <div className="space-y-3">
                {mockActivities.map((activity) => {
                  const Icon = activity.icon
                  const bgColor =
                    activity.type === 'success'
                      ? 'bg-green-50'
                      : activity.type === 'warning'
                        ? 'bg-orange-50'
                        : 'bg-primary/5'
                  const iconColor =
                    activity.type === 'success'
                      ? 'text-green-600'
                      : activity.type === 'warning'
                        ? 'text-orange-600'
                        : 'text-primary'

                  return (
                    <div
                      key={activity.id}
                      className="flex gap-3 rounded-xl bg-green-50 p-4 transition-all hover:bg-green-100"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}
                      >
                        <Icon className={`h-5 w-5 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">
                          {activity.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          {activity.description}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Score Distribution */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">점수 분포</h2>

              <div className="space-y-4">
                {scoreDistributionData.map((item, index) => {
                  const gradientClass =
                    item.color === 'excellent'
                      ? 'bg-gradient-to-r from-green-600 to-green-500'
                      : item.color === 'good'
                        ? 'bg-gradient-to-r from-primary to-primary/70'
                        : item.color === 'average'
                          ? 'bg-gradient-to-r from-orange-500 to-yellow-400'
                          : 'bg-gradient-to-r from-red-600 to-red-500'

                  return (
                    <div key={index}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">
                          {item.range}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {item.count}명
                        </span>
                      </div>
                      <div className="h-8 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`flex h-full items-center justify-center text-xs font-semibold text-white ${gradientClass}`}
                          style={{ width: `${item.percentage}%` }}
                        >
                          {item.percentage}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Exam Results Table */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">최근 시험 결과</h2>
            <Button variant="ghost" size="sm">
              전체 보기 →
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시험명</TableHead>
                <TableHead>응시자</TableHead>
                <TableHead>평균 점수</TableHead>
                <TableHead>합격률</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockExamResults.map((exam) => (
                <TableRow
                  key={exam.id}
                  className="cursor-pointer"
                  onClick={() => navigate({ to: `/examinations/${exam.id}` })}
                >
                  <TableCell>
                    <div className="font-medium">{exam.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {exam.subject}
                    </div>
                  </TableCell>
                  <TableCell>{exam.students}명</TableCell>
                  <TableCell className={getScoreColor(exam.avgScore)}>
                    {exam.avgScore.toFixed(1)}점
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={exam.passRate >= 90 ? 'success' : 'default'}
                    >
                      {exam.passRate}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        exam.status === 'ongoing'
                          ? 'primary'
                          : exam.status === 'completed'
                            ? 'success'
                            : 'secondary'
                      }
                    >
                      {exam.status === 'ongoing'
                        ? '진행 중'
                        : exam.status === 'completed'
                          ? '완료'
                          : '예정'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Recent Questions & Ongoing Exams */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Questions */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">최근 생성한 문제</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/questions' })}
              >
                전체 보기
              </Button>
            </div>

            <div className="space-y-3">
              {dashboard.recent_questions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  생성한 문제가 없습니다.
                </p>
              ) : (
                dashboard.recent_questions.slice(0, 5).map((question) => (
                  <div
                    key={question.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent cursor-pointer"
                    onClick={() => navigate({ to: `/questions/${question.id}` })}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{question.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {question.subject.subject_name} • {question.score}점
                      </div>
                    </div>
                    {question.is_share && (
                      <Badge variant="success">공유됨</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ongoing Exams */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">진행 중인 시험</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/examinations' })}
              >
                전체 보기
              </Button>
            </div>

            <div className="space-y-3">
              {dashboard.ongoing_exams.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  진행 중인 시험이 없습니다.
                </p>
              ) : (
                dashboard.ongoing_exams.slice(0, 5).map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent cursor-pointer"
                    onClick={() => navigate({ to: `/examinations/${exam.id}` })}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{exam.exam_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {exam.testpaper.name} • {exam.testpaper.question_count}문제
                      </div>
                      <div className="text-sm text-muted-foreground">
                        종료: {new Date(exam.end_time).toLocaleString('ko-KR')}
                      </div>
                    </div>
                    <Badge variant="primary">진행중</Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">최근 제출된 시험</h2>

          {dashboard.student_statistics.recent_submissions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              제출된 시험이 없습니다.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {dashboard.student_statistics.recent_submissions
                .slice(0, 6)
                .map((submission) => (
                  <div
                    key={submission.id}
                    className="rounded-lg border p-3 hover:bg-accent cursor-pointer"
                  >
                    <div className="font-medium">
                      {submission.student.nick_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {submission.examination.exam_name}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {new Date(submission.submitted_at).toLocaleDateString(
                          'ko-KR'
                        )}
                      </div>
                      <div className="text-lg font-bold">
                        {submission.score}/{submission.total_score}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
