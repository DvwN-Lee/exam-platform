import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { examApi } from '@/api/exam'
import { Button } from '@/components/ui/button'

export function ExamResultPage() {
  const navigate = useNavigate()
  const { id } = useParams({ strict: false })

  const { data: result, isLoading } = useQuery({
    queryKey: ['exam-result', id],
    queryFn: () => examApi.getExamResult(Number(id)),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div>결과를 불러오는 중...</div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div>결과를 찾을 수 없습니다.</div>
      </div>
    )
  }

  const { submission } = result
  const scorePercentage = (submission.score / submission.total_score) * 100

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">시험 결과</h1>
          <p className="text-muted-foreground">
            {submission.examination.exam_name}
          </p>
        </div>

        {/* Score Summary */}
        <div className="rounded-lg border bg-card p-8">
          <div className="text-center">
            <div className="mb-4">
              <div className="text-6xl font-bold text-primary">
                {submission.score}
              </div>
              <div className="text-2xl text-muted-foreground">
                / {submission.total_score}점
              </div>
            </div>

            <div className="mb-6">
              <div className="text-4xl font-semibold">
                {scorePercentage.toFixed(1)}%
              </div>
              <div
                className={`mt-2 text-lg font-medium ${
                  result.pass ? 'text-green-600' : 'text-destructive'
                }`}
              >
                {result.pass ? '합격' : '불합격'}
              </div>
            </div>

            <div className="mx-auto max-w-md">
              <div className="h-4 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full transition-all ${
                    result.pass ? 'bg-green-500' : 'bg-destructive'
                  }`}
                  style={{ width: `${scorePercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">총 문제 수</div>
            <div className="text-2xl font-bold">{submission.answers.length}개</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">정답 수</div>
            <div className="text-2xl font-bold text-green-600">
              {submission.answers.filter((a) => a.is_correct).length}개
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">정답률</div>
            <div className="text-2xl font-bold">
              {result.accuracy.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Exam Info */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">시험 정보</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">시험지</div>
              <div className="font-medium">
                {submission.examination.testpaper?.name ?? '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">과목</div>
              <div className="font-medium">
                {submission.examination.testpaper?.subject?.subject_name ?? '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">제출 시간</div>
              <div className="font-medium">
                {new Date(submission.submitted_at).toLocaleString('ko-KR')}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">응시자</div>
              <div className="font-medium">{submission.student.nick_name}</div>
            </div>
          </div>
        </div>

        {/* Answers Detail */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">답안 상세</h2>
          <div className="space-y-4">
            {submission.answers.map((answer, index) => (
              <div
                key={answer.id}
                className={`rounded-lg border p-4 ${
                  answer.is_correct
                    ? 'border-green-500 bg-green-50'
                    : 'border-destructive bg-red-50'
                }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full font-medium ${
                        answer.is_correct
                          ? 'bg-green-500 text-white'
                          : 'bg-destructive text-white'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{answer.question.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {answer.question.subject?.subject_name ?? '-'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {answer.score} / {answer.max_score}점
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        answer.is_correct ? 'text-green-600' : 'text-destructive'
                      }`}
                    >
                      {answer.is_correct ? '정답' : '오답'}
                    </div>
                  </div>
                </div>

                {answer.question.tq_type === 'xz' && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm font-medium">선택한 답:</div>
                    {answer.question.options.map((option) => {
                      const isSelected = answer.selected_options.includes(option.id!)
                      const isCorrect = option.is_right

                      return (
                        <div
                          key={option.id}
                          className={`rounded border p-2 text-sm ${
                            isSelected && isCorrect
                              ? 'border-green-500 bg-green-100'
                              : isSelected
                              ? 'border-destructive bg-red-100'
                              : isCorrect
                              ? 'border-green-500 bg-green-50'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && <span>✓</span>}
                            {isCorrect && <span className="text-green-600">정답</span>}
                            <span>{option.option}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {(answer.question.tq_type === 'pd' ||
                  answer.question.tq_type === 'tk') && (
                  <div className="mt-3">
                    <div className="text-sm font-medium">제출한 답:</div>
                    <div className="mt-1 rounded border border-border bg-background p-2">
                      {answer.answer || '(답안 없음)'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate({ to: '/exams' })}>
            시험 목록
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/exams/results' })}
          >
            내 시험 결과
          </Button>
        </div>
      </div>
    </div>
  )
}
