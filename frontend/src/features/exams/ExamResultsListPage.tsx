import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { examApi } from '@/api/exam'
import { Button } from '@/components/ui/button'

export function ExamResultsListPage() {
  const navigate = useNavigate()

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: examApi.getMySubmissions,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">내 시험 결과</h1>
            <p className="text-muted-foreground">
              제출한 시험 결과를 확인할 수 있습니다
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate({ to: '/exams' })}>
            시험 목록
          </Button>
        </div>

        <div className="space-y-4">
          {!submissions || submissions.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <p className="text-muted-foreground">제출한 시험이 없습니다.</p>
              <Button
                className="mt-4"
                onClick={() => navigate({ to: '/exams' })}
              >
                시험 보러 가기
              </Button>
            </div>
          ) : (
            submissions.map((submission) => {
              const scorePercentage =
                (submission.score / submission.total_score) * 100
              const correctCount = submission.answers.filter(
                (a) => a.is_correct
              ).length

              return (
                <div
                  key={submission.id}
                  className="rounded-lg border bg-card p-6 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate({ to: `/exams/${submission.id}/result` })}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">
                        {submission.examination.exam_name}
                      </h3>

                      <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          시험지: {submission.examination.testpaper.name}
                        </span>
                        <span>
                          과목:{' '}
                          {submission.examination.testpaper.subject.subject_name}
                        </span>
                        <span>문제 수: {submission.answers.length}개</span>
                      </div>

                      <div className="flex items-center gap-6">
                        <div>
                          <span className="text-sm text-muted-foreground">
                            득점:{' '}
                          </span>
                          <span className="text-lg font-bold">
                            {submission.score} / {submission.total_score}점
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">
                            정답:{' '}
                          </span>
                          <span className="text-lg font-bold text-green-600">
                            {correctCount} / {submission.answers.length}개
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">
                            정답률:{' '}
                          </span>
                          <span className="text-lg font-bold">
                            {((correctCount / submission.answers.length) * 100).toFixed(
                              1
                            )}
                            %
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-muted-foreground">
                        제출 시간:{' '}
                        {new Date(submission.submitted_at).toLocaleString('ko-KR')}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">
                          {scorePercentage.toFixed(1)}%
                        </div>
                        <div
                          className={`mt-1 text-sm font-medium ${
                            scorePercentage >= 60
                              ? 'text-green-600'
                              : 'text-destructive'
                          }`}
                        >
                          {scorePercentage >= 60 ? '합격' : '불합격'}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        상세 보기
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full transition-all ${
                          scorePercentage >= 60 ? 'bg-green-500' : 'bg-destructive'
                        }`}
                        style={{ width: `${scorePercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
