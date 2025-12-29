import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { questionApi } from '@/api/question'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animation'
import { cardHoverVariants } from '@/lib/animations'

const questionTypeLabels = {
  xz: '객관식',
  pd: '주관식',
  tk: '빈칸채우기',
}

const questionDegreeLabels = {
  jd: '쉬움',
  zd: '보통',
  kn: '어려움',
}

export function QuestionDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams({ strict: false })
  const user = useAuthStore((state) => state.user)

  const { data: question, isLoading } = useQuery({
    queryKey: ['question', id],
    queryFn: () => questionApi.getQuestion(Number(id)),
    enabled: !!id,
  })

  const shareMutation = useMutation({
    mutationFn: (isShare: boolean) =>
      questionApi.shareQuestion(Number(id), isShare),
    onSuccess: () => {
      toast.success('공유 설정이 변경되었습니다.')
      window.location.reload()
    },
    onError: () => {
      toast.error('공유 설정 변경에 실패했습니다.')
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div>문제를 찾을 수 없습니다.</div>
      </div>
    )
  }

  const isOwner = user?.id === question.creat_user.id

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <FadeIn>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{question.name}</h1>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded bg-primary/10 px-2 py-1 text-sm font-medium">
                  {questionTypeLabels[question.tq_type]}
                </span>
                <span className="rounded bg-secondary px-2 py-1 text-sm font-medium">
                  {questionDegreeLabels[question.tq_degree]}
                </span>
                {question.is_share && (
                  <span className="rounded bg-green-100 px-2 py-1 text-sm font-medium text-green-700">
                    공유됨
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate({ to: '/questions' })}>
                목록
              </Button>
              {isOwner && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: `/questions/${id}/edit` })}
                  >
                    수정
                  </Button>
                  <Button
                    variant={question.is_share ? 'destructive' : 'default'}
                    onClick={() => shareMutation.mutate(!question.is_share)}
                  >
                    {question.is_share ? '공유 해제' : '공유하기'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">과목</div>
                <div className="text-lg font-medium">
                  {question.subject.subject_name}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">배점</div>
                <div className="text-lg font-medium">{question.score}점</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">생성자</div>
                <div className="text-lg font-medium">
                  {question.creat_user.nick_name}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">생성일</div>
                <div className="text-lg">
                  {new Date(question.created_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {question.tq_type === 'xz' && question.options.length > 0 && (
          <FadeIn delay={0.2}>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">선택지</h2>
              <StaggerContainer className="space-y-2" delay={0.2}>
                {question.options.map((option, index) => (
                  <StaggerItem key={option.id || index}>
                    <motion.div
                      className={`flex items-center gap-3 rounded-lg border p-3 ${
                        option.is_right
                          ? 'border-green-500 bg-green-50'
                          : 'border-border'
                      }`}
                      initial="rest"
                      whileHover="hover"
                      variants={cardHoverVariants}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-current font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">{option.option}</div>
                      {option.is_right && (
                        <span className="rounded bg-green-500 px-2 py-1 text-xs font-medium text-white">
                          정답
                        </span>
                      )}
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </FadeIn>
        )}

        {question.tq_img && (
          <FadeIn delay={0.3}>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">문제 이미지</h2>
              <img
                src={question.tq_img}
                alt="문제 이미지"
                className="max-w-full rounded-lg"
              />
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  )
}
