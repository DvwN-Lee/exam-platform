import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { testPaperApi } from '@/api/testpaper'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animation'
import { cardHoverVariants } from '@/lib/animations'

export function TestPaperDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams({ strict: false })
  const user = useAuthStore((state) => state.user)

  const { data: testPaper, isLoading } = useQuery({
    queryKey: ['testpaper', id],
    queryFn: () => testPaperApi.getTestPaper(Number(id)),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  if (!testPaper) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div>시험지를 찾을 수 없습니다.</div>
      </div>
    )
  }

  const isOwner = user?.id === testPaper.creat_user.id
  const totalScore = testPaper.questions.reduce((sum, q) => sum + q.score, 0)

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <FadeIn>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{testPaper.name}</h1>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded bg-primary/10 px-2 py-1 text-sm font-medium">
                  {testPaper.subject.subject_name}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate({ to: '/testpapers' })}
              >
                목록
              </Button>
              {isOwner && (
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: `/testpapers/${id}/edit` })}
                >
                  수정
                </Button>
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
                  {testPaper.subject.subject_name}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">총 문제 수</div>
                <div className="text-lg font-medium">{testPaper.question_count}개</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">총 배점</div>
                <div className="text-lg font-medium">{totalScore}점</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">생성자</div>
                <div className="text-lg font-medium">
                  {testPaper.creat_user.nick_name}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">생성일</div>
                <div className="text-lg">
                  {new Date(testPaper.created_at).toLocaleDateString('ko-KR')}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">수정일</div>
                <div className="text-lg">
                  {new Date(testPaper.updated_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {testPaper.questions.length > 0 && (
          <FadeIn delay={0.2}>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">문제 목록</h2>
              <StaggerContainer className="space-y-3" delay={0.2}>
                {testPaper.questions
                  .sort((a, b) => a.order - b.order)
                  .map((tpQuestion, index) => (
                    <StaggerItem key={tpQuestion.id}>
                      <motion.div
                        className="rounded-lg border p-4 transition-colors cursor-pointer"
                        onClick={() =>
                          navigate({ to: `/questions/${tpQuestion.question.id}` })
                        }
                        initial="rest"
                        whileHover="hover"
                        variants={cardHoverVariants}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-medium shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">
                                {tpQuestion.question.name}
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{tpQuestion.question.subject.subject_name}</span>
                                <span>.</span>
                                <span>
                                  {tpQuestion.question.tq_type === 'xz'
                                    ? '객관식'
                                    : tpQuestion.question.tq_type === 'pd'
                                    ? '주관식'
                                    : '빈칸채우기'}
                                </span>
                                <span>.</span>
                                <span>
                                  {tpQuestion.question.tq_degree === 'jd'
                                    ? '쉬움'
                                    : tpQuestion.question.tq_degree === 'zd'
                                    ? '보통'
                                    : '어려움'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-medium shrink-0 ml-4">
                            {tpQuestion.score}점
                          </div>
                        </div>
                      </motion.div>
                    </StaggerItem>
                  ))}
              </StaggerContainer>
            </div>
          </FadeIn>
        )}

        {testPaper.questions.length === 0 && (
          <FadeIn delay={0.2}>
            <div className="rounded-lg border bg-card p-12 text-center">
              <p className="text-muted-foreground">등록된 문제가 없습니다.</p>
              {isOwner && (
                <Button
                  className="mt-4"
                  onClick={() => navigate({ to: `/testpapers/${id}/edit` })}
                >
                  문제 추가하기
                </Button>
              )}
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  )
}
