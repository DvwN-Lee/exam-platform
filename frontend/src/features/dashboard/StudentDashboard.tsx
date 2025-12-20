import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { dashboardApi } from '@/api/dashboard'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export function StudentDashboard() {
  const navigate = useNavigate()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: dashboardApi.getStudentDashboard,
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

  const chartData = dashboard.score_trend.map((item) => ({
    name: new Date(item.date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    }),
    점수: item.percentage,
  }))

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">학생 대시보드</h1>
            <p className="text-muted-foreground">학습 현황을 한눈에 확인하세요</p>
          </div>
          <Button onClick={() => navigate({ to: '/exams' })}>
            시험 보러 가기
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">
              총 응시 시험
            </div>
            <div className="mt-2 text-3xl font-bold">
              {dashboard.statistics.total_exams_taken}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">
              평균 점수
            </div>
            <div className="mt-2 text-3xl font-bold text-primary">
              {dashboard.statistics.average_score.toFixed(1)}점
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">
              합격률
            </div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {dashboard.statistics.pass_rate.toFixed(1)}%
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">
              정답률
            </div>
            <div className="mt-2 text-3xl font-bold">
              {(
                (dashboard.statistics.correct_answers /
                  dashboard.statistics.total_questions_answered) *
                100
              ).toFixed(1)}
              %
            </div>
          </div>
        </div>

        {/* Score Trend Chart */}
        {chartData.length > 0 && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">성적 추이</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="점수"
                  stroke="#8884d8"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Submissions */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">최근 시험 성적</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/exams/results' })}
              >
                전체 보기
              </Button>
            </div>

            <div className="space-y-3">
              {dashboard.recent_submissions.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  응시한 시험이 없습니다.
                </p>
              ) : (
                dashboard.recent_submissions.slice(0, 5).map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent cursor-pointer"
                    onClick={() =>
                      navigate({ to: `/exams/${submission.id}/result` })
                    }
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {submission.examination.exam_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(submission.submitted_at).toLocaleDateString(
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

          {/* Upcoming Exams */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">응시 예정 시험</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/exams' })}
              >
                전체 보기
              </Button>
            </div>

            <div className="space-y-3">
              {dashboard.upcoming_exams.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  예정된 시험이 없습니다.
                </p>
              ) : (
                dashboard.upcoming_exams.slice(0, 5).map((exam) => {
                  const startTime = new Date(exam.start_time)
                  const now = new Date()
                  const isOngoing = now >= startTime && now <= new Date(exam.end_time)

                  return (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent cursor-pointer"
                      onClick={() => navigate({ to: `/examinations/${exam.id}` })}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{exam.exam_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {exam.testpaper.subject.subject_name} •{' '}
                          {exam.testpaper.question_count}문제
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {startTime.toLocaleString('ko-KR')}
                        </div>
                      </div>
                      <div>
                        {isOngoing ? (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate({ to: `/exams/${exam.id}/take` })
                            }}
                          >
                            응시하기
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            대기중
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Wrong Questions */}
        {dashboard.wrong_questions.length > 0 && (
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">오답 문제 복습</h2>
              <span className="text-sm text-muted-foreground">
                {dashboard.wrong_questions.length}개
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {dashboard.wrong_questions.slice(0, 6).map((question) => (
                <div
                  key={question.id}
                  className="rounded-lg border p-3 hover:bg-accent cursor-pointer"
                  onClick={() => navigate({ to: `/questions/${question.id}` })}
                >
                  <div className="font-medium">{question.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {question.subject.subject_name} • {question.score}점
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
