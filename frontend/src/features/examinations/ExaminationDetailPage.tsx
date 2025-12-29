import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { examinationApi } from '@/api/testpaper'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { EnrolledStudentsSection } from './EnrolledStudentsSection'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animation'
import { cardHoverVariants } from '@/lib/animations'
import type { ExaminationStatus } from '@/types/testpaper'

const statusLabels: Record<ExaminationStatus, string> = {
  upcoming: '예정',
  ongoing: '진행중',
  completed: '완료',
}

export function ExaminationDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams({ strict: false })
  const user = useAuthStore((state) => state.user)

  const { data: examination, isLoading } = useQuery({
    queryKey: ['examination', id],
    queryFn: () => examinationApi.getExamination(Number(id)),
    enabled: !!id,
  })

  const publishMutation = useMutation({
    mutationFn: () => examinationApi.publishExamination(Number(id)),
    onSuccess: () => {
      toast.success('시험이 게시되었습니다.')
      window.location.reload()
    },
    onError: () => {
      toast.error('시험 게시에 실패했습니다.')
    },
  })

  const getExamStatus = (): ExaminationStatus => {
    if (!examination) return 'upcoming'
    const now = new Date()
    const startTime = new Date(examination.start_time)
    const endTime = new Date(examination.end_time)

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

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  if (!examination) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div>시험을 찾을 수 없습니다.</div>
      </div>
    )
  }

  const isOwner = user?.id === examination.creat_user.id
  const status = getExamStatus()

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <FadeIn>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {examination.exam_name}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded px-2 py-1 text-sm font-medium ${getStatusBadgeClass(
                    status
                  )}`}
                >
                  {statusLabels[status]}
                </span>
                {examination.is_public && (
                  <span className="rounded bg-purple-100 px-2 py-1 text-sm font-medium text-purple-700">
                    공개
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate({ to: '/examinations' })}
              >
                목록
              </Button>
              {isOwner && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: `/examinations/${id}/edit` })}
                  >
                    수정
                  </Button>
                  <Button onClick={() => publishMutation.mutate()}>게시하기</Button>
                </>
              )}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">시험지</div>
                <div className="text-lg font-medium">
                  {examination.testpaper.name}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">과목</div>
                <div className="text-lg font-medium">
                  {examination.testpaper.subject.subject_name}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">시작 시간</div>
                <div className="text-lg">
                  {new Date(examination.start_time).toLocaleString('ko-KR')}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">종료 시간</div>
                <div className="text-lg">
                  {new Date(examination.end_time).toLocaleString('ko-KR')}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">생성자</div>
                <div className="text-lg font-medium">
                  {examination.creat_user.nick_name}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">생성일</div>
                <div className="text-lg">
                  {new Date(examination.created_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">시험지 정보</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">총 문제 수</span>
                <span className="font-medium">
                  {examination.testpaper.question_count}문제
                </span>
              </div>
              {examination.testpaper.questions && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">총 배점</span>
                  <span className="font-medium">
                    {examination.testpaper.questions.reduce(
                      (sum, q) => sum + q.score,
                      0
                    )}
                    점
                  </span>
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        {examination.testpaper.questions && examination.testpaper.questions.length > 0 && (
          <FadeIn delay={0.2}>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">문제 목록</h2>
              <StaggerContainer className="space-y-3" delay={0.2}>
                {examination.testpaper.questions
                  .sort((a, b) => a.order - b.order)
                  .map((tpQuestion, index) => (
                    <StaggerItem key={tpQuestion.id}>
                      <motion.div
                        className="flex items-center justify-between rounded-lg border p-3"
                        initial="rest"
                        whileHover="hover"
                        variants={cardHoverVariants}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">
                              {tpQuestion.question.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {tpQuestion.question.subject.subject_name}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-medium">{tpQuestion.score}점</div>
                      </motion.div>
                    </StaggerItem>
                  ))}
              </StaggerContainer>
            </div>
          </FadeIn>
        )}

        {user?.user_type === 'teacher' && (
          <FadeIn delay={0.25}>
            <div className="rounded-lg border bg-card p-6">
              <EnrolledStudentsSection examinationId={Number(id)} />
            </div>
          </FadeIn>
        )}

        {status === 'ongoing' && user?.user_type === 'student' && (
          <FadeIn delay={0.3}>
            <div className="rounded-lg border bg-card p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">시험 응시</h3>
              <p className="text-muted-foreground mb-4">
                시험이 진행 중입니다. 지금 응시하시겠습니까?
              </p>
              <Button size="lg" onClick={() => navigate({ to: `/exams/${id}/take` })}>
                시험 응시하기
              </Button>
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  )
}
