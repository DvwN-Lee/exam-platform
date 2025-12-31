import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { FileText, BookOpen, Clock, AlertCircle } from 'lucide-react'
import { examApi } from '@/api/exam'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
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

  const { data: exams, isLoading, isError, refetch } = useQuery({
    queryKey: ['available-exams'],
    queryFn: examApi.getAvailableExams,
  })

  if (isLoading) {
    return <LoadingPage message="시험 목록을 불러오는 중..." fullScreen={false} />
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="시험 목록을 불러오지 못했습니다"
        description="잠시 후 다시 시도해 주세요."
        action={{ label: '재시도', onClick: () => refetch() }}
      />
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

        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <motion.div
              variants={cardHoverVariants}
              initial="initial"
              whileHover="hover"
              className="relative overflow-hidden rounded-xl border bg-card p-6"
            >
              <div className="absolute right-4 top-4 text-primary/10">
                <FileText className="h-16 w-16" />
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                응시 가능 시험
              </div>
              <div className="mt-2 text-3xl font-bold">
                {exams?.count || 0}
              </div>
              <div className="text-xs text-muted-foreground">개</div>
            </motion.div>
          </StaggerItem>
        </StaggerContainer>

        <StaggerContainer className="space-y-4">
          {exams?.results.length === 0 ? (
            <FadeIn>
              <EmptyState
                icon={FileText}
                title="응시 가능한 시험이 없습니다"
                description="현재 응시 가능한 시험이 없습니다. 나중에 다시 확인해 주세요."
                action={{
                  label: '내 시험 결과 보기',
                  onClick: () => navigate({ to: '/exams/results' }),
                }}
              />
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
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">{exam.exam_name}</h3>
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${getStatusBadgeClass(status)}`}
                          >
                            {STATUS_LABELS[status]}
                          </span>
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span>{exam.testpaper.subject.subject_name}</span>
                            <span className="text-muted-foreground/50">|</span>
                            <span>{exam.testpaper.name}</span>
                            <span className="text-muted-foreground/50">|</span>
                            <span>{exam.testpaper.question_count}문제</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {formatKoreanDateTime(exam.start_time)} ~{' '}
                              {formatKoreanDateTime(exam.end_time)}
                            </span>
                          </div>

                          {status === 'ongoing' && (
                            <div
                              className={`font-medium ${timeInfo.isUrgent ? 'text-red-600' : 'text-green-600'}`}
                            >
                              {timeInfo.text}
                            </div>
                          )}

                          {status === 'upcoming' && (
                            <div className="font-medium text-blue-600">
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
