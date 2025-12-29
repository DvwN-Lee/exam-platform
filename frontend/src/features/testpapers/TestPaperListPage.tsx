import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { testPaperApi } from '@/api/testpaper'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animation'
import { cardHoverVariants } from '@/lib/animations'

export function TestPaperListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [page, setPage] = useState(1)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['testpapers', page],
    queryFn: () => testPaperApi.getTestPapers(page),
  })

  const handleDelete = async (id: number) => {
    if (!confirm('시험지를 삭제하시겠습니까?')) return

    try {
      await testPaperApi.deleteTestPaper(id)
      refetch()
      toast.success('시험지가 삭제되었습니다.')
    } catch (error) {
      toast.error('시험지 삭제에 실패했습니다.')
    }
  }

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
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">시험지 관리</h1>
              <p className="text-muted-foreground">시험지를 관리합니다</p>
            </div>
            {user?.user_type === 'teacher' && (
              <Button onClick={() => navigate({ to: '/testpapers/new' })}>
                시험지 생성
              </Button>
            )}
          </div>
        </FadeIn>

        <StaggerContainer className="space-y-4">
          {data?.results.length === 0 ? (
            <FadeIn>
              <div className="rounded-lg border bg-card p-12 text-center">
                <p className="text-muted-foreground">시험지가 없습니다.</p>
                {user?.user_type === 'teacher' && (
                  <Button
                    className="mt-4"
                    onClick={() => navigate({ to: '/testpapers/new' })}
                  >
                    첫 시험지 만들기
                  </Button>
                )}
              </div>
            </FadeIn>
          ) : (
            data?.results.map((testPaper) => (
              <StaggerItem key={testPaper.id}>
                <motion.div
                  className="rounded-lg border bg-card p-4 transition-colors"
                  initial="rest"
                  whileHover="hover"
                  variants={cardHoverVariants}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{testPaper.name}</h3>
                        <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium">
                          {testPaper.subject.subject_name}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>문제 수: {testPaper.question_count}개</span>
                        <span>생성자: {testPaper.creat_user.nick_name}</span>
                        <span>
                          생성일:{' '}
                          {new Date(testPaper.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate({ to: `/testpapers/${testPaper.id}` })}
                      >
                        상세
                      </Button>
                      {user?.id === testPaper.creat_user.id && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigate({ to: `/testpapers/${testPaper.id}/edit` })
                            }
                          >
                            수정
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(testPaper.id)}
                          >
                            삭제
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            ))
          )}
        </StaggerContainer>

        {data && data.count > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              총 {data.count}개의 시험지
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!data.previous}
                onClick={() => setPage((prev) => prev - 1)}
              >
                이전
              </Button>
              <Button
                variant="outline"
                disabled={!data.next}
                onClick={() => setPage((prev) => prev + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
