import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/teacher/')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">통계 분석</h1>
          <p className="text-muted-foreground">시험 및 문제 통계를 확인합니다</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">문제 통계</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">총 문제 수</span>
                <span className="text-2xl font-bold">
                  {data?.question_statistics?.total || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">객관식</span>
                <span className="font-medium">
                  {data?.question_statistics?.by_type?.xz || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">주관식</span>
                <span className="font-medium">
                  {data?.question_statistics?.by_type?.pd || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">빈칸채우기</span>
                <span className="font-medium">
                  {data?.question_statistics?.by_type?.tk || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">학생 통계</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">총 응시자</span>
                <span className="text-2xl font-bold">
                  {data?.student_statistics?.total_students || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">총 응시 횟수</span>
                <span className="font-medium">
                  {data?.student_statistics?.total_submissions || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">평균 점수</span>
                <span className="font-medium">
                  {data?.student_statistics?.average_score?.toFixed(1) || '0.0'}점
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">최근 문제</h2>
          {data?.recent_questions && data.recent_questions.length > 0 ? (
            <div className="space-y-3">
              {data.recent_questions.map((question: any) => (
                <div
                  key={question.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">{question.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {question.subject?.subject_name || question.subject} • {question.type} • {question.score}점
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(question.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">생성한 문제가 없습니다.</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">진행 중인 시험</h2>
          {data?.ongoing_exams && data.ongoing_exams.length > 0 ? (
            <div className="space-y-3">
              {data.ongoing_exams.map((exam: any) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">{exam.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {exam.subject?.subject_name || exam.subject} • {exam.student_count}명 응시
                    </div>
                  </div>
                  <div className="rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    진행중
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              진행 중인 시험이 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
