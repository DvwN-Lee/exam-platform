import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { examApi } from '@/api/exam'
import { Button } from '@/components/ui/button'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animation'
import { cardHoverVariants } from '@/lib/animations'
import {
  STATUS_LABELS,
  getExamStatus,
  getStatusBadgeClass,
} from '@/constants/examination'
import { getTimeRemaining, formatKoreanDateTime, formatKoreanDate } from '@/utils/time'
import type { Examination } from '@/types/testpaper'

export function ExamListPage() {
  const navigate = useNavigate()

  const { data: exams, isLoading } = useQuery({
    queryKey: ['available-exams'],
    queryFn: examApi.getAvailableExams,
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
      <div className="mx-auto max-w-6xl space-y-6">
        <FadeIn>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">응시 가능한 시험</h1>
            <p className="text-muted-foreground">
              등록된 시험 목록을 확인하고 응시하세요
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="space-y-4">
          {exams?.results.length === 0 ? (
            <FadeIn>
              <div className="rounded-lg border bg-card p-12 text-center">
                <p className="text-muted-foreground">응시 가능한 시험이 없습니다.</p>
              </div>
            </FadeIn>
          ) : (
            exams?.results.map((exam: Examination) => {
              const status = getExamStatus(exam.start_time, exam.end_time)
              const canTakeExam = status === 'ongoing'
              const timeInfo = getTimeRemaining(exam.end_time)

              return (
                <StaggerItem key={exam.id}>
                  <motion.div
                    className="rounded-lg border bg-card p-6 transition-colors"
                    initial="rest"
                    whileHover="hover"
                    variants={cardHoverVariants}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">{exam.exam_name}</h3>
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${getStatusBadgeClass(status)}`}
                          >
                            {STATUS_LABELS[status]}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <span>시험지: {exam.testpaper.name}</span>
                            <span>과목: {exam.testpaper.subject.subject_name}</span>
                            <span>문제 수: {exam.testpaper.question_count}개</span>
                          </div>

                          <div className="flex items-center gap-6 text-sm">
                            <span className="text-muted-foreground">
                              시작: {formatKoreanDateTime(exam.start_time)}
                            </span>
                            <span className="text-muted-foreground">
                              종료: {formatKoreanDateTime(exam.end_time)}
                            </span>
                          </div>

                          {status === 'ongoing' && (
                            <div className={`text-sm font-medium ${timeInfo.isUrgent ? 'text-red-600' : 'text-green-600'}`}>
                              {timeInfo.text}
                            </div>
                          )}

                          {status === 'upcoming' && (
                            <div className="text-sm font-medium text-blue-600">
                              {formatKoreanDate(exam.start_time)} 시작 예정
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
                  </motion.div>
                </StaggerItem>
              )
            })
          )}
        </StaggerContainer>

        <FadeIn delay={0.3}>
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-2">내 시험 결과</h3>
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/exams/results' })}
            >
              제출한 시험 보기
            </Button>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}
