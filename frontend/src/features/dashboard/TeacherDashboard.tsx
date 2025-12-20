import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { dashboardApi } from '@/api/dashboard'
import { Button } from '@/components/ui/button'
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export function TeacherDashboard() {
  const navigate = useNavigate()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: dashboardApi.getTeacherDashboard,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>대시보드 데이터를 불러올 수 없습니다.</div>
      </div>
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

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">교사 대시보드</h1>
            <p className="text-muted-foreground">문제 및 시험 관리 현황</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/questions/new' })}
            >
              문제 생성
            </Button>
            <Button onClick={() => navigate({ to: '/examinations/new' })}>
              시험 생성
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">
              총 문제 수
            </div>
            <div className="mt-2 text-3xl font-bold">
              {dashboard.question_statistics.total_questions}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              공유: {dashboard.question_statistics.shared_questions}개
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">
              총 제출 수
            </div>
            <div className="mt-2 text-3xl font-bold text-primary">
              {dashboard.student_statistics.total_submissions}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              학생: {dashboard.student_statistics.total_students}명
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">
              평균 점수
            </div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {dashboard.student_statistics.average_score.toFixed(1)}점
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">
              합격률
            </div>
            <div className="mt-2 text-3xl font-bold">
              {dashboard.student_statistics.pass_rate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Question Type Distribution */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">문제 유형 분포</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={questionTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {questionTypeData.map((_, index) => (
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

          {/* Question Difficulty Distribution */}
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
                <p className="text-center text-sm text-muted-foreground py-8">
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
                    <div className="flex gap-2">
                      {question.is_share && (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          공유됨
                        </span>
                      )}
                    </div>
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
                <p className="text-center text-sm text-muted-foreground py-8">
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
                        {exam.testpaper.name} •{' '}
                        {exam.testpaper.question_count}문제
                      </div>
                      <div className="text-sm text-muted-foreground">
                        종료: {new Date(exam.end_time).toLocaleString('ko-KR')}
                      </div>
                    </div>
                    <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                      진행중
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">최근 제출된 시험</h2>
          </div>

          <div className="space-y-3">
            {dashboard.student_statistics.recent_submissions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                제출된 시험이 없습니다.
              </p>
            ) : (
              dashboard.student_statistics.recent_submissions
                .slice(0, 10)
                .map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {submission.student.nick_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {submission.examination.exam_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(submission.submitted_at).toLocaleString(
                          'ko-KR'
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {submission.score} / {submission.total_score}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(
                          (submission.score / submission.total_score) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
