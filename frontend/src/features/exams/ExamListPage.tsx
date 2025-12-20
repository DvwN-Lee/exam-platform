import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { examApi } from '@/api/exam'
import { Button } from '@/components/ui/button'
import type { ExaminationStatus } from '@/types/testpaper'

const statusLabels: Record<ExaminationStatus, string> = {
  upcoming: '예정',
  ongoing: '진행중',
  completed: '완료',
}

export function ExamListPage() {
  const navigate = useNavigate()

  const { data: exams, isLoading } = useQuery({
    queryKey: ['available-exams'],
    queryFn: examApi.getAvailableExams,
  })

  const getExamStatus = (exam: any): ExaminationStatus => {
    const now = new Date()
    const startTime = new Date(exam.start_time)
    const endTime = new Date(exam.end_time)

    if (now < startTime) return 'upcoming'
    if (now > endTime) return 'completed'
    return 'ongoing'
  }

  const getStatusBadgeClass = (status: ExaminationStatus) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-700'
      case 'ongoing':
        return 'bg-green-100 text-green-700'
      case 'completed':
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getTimeRemaining = (endTime: string) => {
    const now = new Date()
    const end = new Date(endTime)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return '종료'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}일 ${hours % 24}시간 남음`
    }

    return `${hours}시간 ${minutes}분 남음`
  }

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">응시 가능한 시험</h1>
          <p className="text-muted-foreground">
            등록된 시험 목록을 확인하고 응시하세요
          </p>
        </div>

        <div className="space-y-4">
          {exams?.results.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <p className="text-muted-foreground">응시 가능한 시험이 없습니다.</p>
            </div>
          ) : (
            exams?.results.map((exam) => {
              const status = getExamStatus(exam)
              const canTakeExam = status === 'ongoing'

              return (
                <div
                  key={exam.id}
                  className="rounded-lg border bg-card p-6 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold">{exam.exam_name}</h3>
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${getStatusBadgeClass(
                            status
                          )}`}
                        >
                          {statusLabels[status]}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span>
                            시험지: {exam.testpaper.name}
                          </span>
                          <span>
                            과목: {exam.testpaper.subject.subject_name}
                          </span>
                          <span>
                            문제 수: {exam.testpaper.question_count}개
                          </span>
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-muted-foreground">
                            시작: {new Date(exam.start_time).toLocaleString('ko-KR')}
                          </span>
                          <span className="text-muted-foreground">
                            종료: {new Date(exam.end_time).toLocaleString('ko-KR')}
                          </span>
                        </div>

                        {status === 'ongoing' && (
                          <div className="text-sm font-medium text-green-600">
                            {getTimeRemaining(exam.end_time)}
                          </div>
                        )}

                        {status === 'upcoming' && (
                          <div className="text-sm font-medium text-blue-600">
                            {new Date(exam.start_time).toLocaleDateString('ko-KR')}{' '}
                            시작 예정
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate({ to: `/examinations/${exam.id}` })}
                      >
                        상세 보기
                      </Button>
                      {canTakeExam && (
                        <Button
                          size="sm"
                          onClick={() => navigate({ to: `/exams/${exam.id}/take` })}
                        >
                          시험 응시
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-2">내 시험 결과</h3>
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/exams/results' })}
          >
            제출한 시험 보기
          </Button>
        </div>
      </div>
    </div>
  )
}
