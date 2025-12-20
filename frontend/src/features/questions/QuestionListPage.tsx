import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { questionApi } from '@/api/question'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { QuestionFilters, QuestionType, QuestionDegree } from '@/types/question'

const questionTypeLabels: Record<QuestionType, string> = {
  xz: '객관식',
  pd: '주관식',
  tk: '빈칸채우기',
}

const questionDegreeLabels: Record<QuestionDegree, string> = {
  jd: '쉬움',
  zd: '보통',
  kn: '어려움',
}

export function QuestionListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [filters, setFilters] = useState<QuestionFilters>({})
  const [searchText, setSearchText] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['questions', filters],
    queryFn: () => questionApi.getMyQuestions(filters),
  })

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchText, page: 1 }))
  }

  const handleFilterChange = (key: keyof QuestionFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const handleDelete = async (id: number) => {
    if (!confirm('문제를 삭제하시겠습니까?')) return

    try {
      await questionApi.deleteQuestion(id)
      refetch()
      alert('문제가 삭제되었습니다.')
    } catch (error) {
      alert('문제 삭제에 실패했습니다.')
    }
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
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">문제 관리</h1>
            <p className="text-muted-foreground">내가 생성한 문제를 관리합니다</p>
          </div>
          {user?.user_type === 'teacher' && (
            <Button onClick={() => navigate({ to: '/questions/new' })}>
              문제 생성
            </Button>
          )}
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="flex gap-4">
            <Input
              placeholder="문제 제목 검색..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch}>검색</Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.tq_type || ''}
              onChange={(e) =>
                handleFilterChange('tq_type', e.target.value || undefined)
              }
            >
              <option value="">전체 유형</option>
              {Object.entries(questionTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.tq_degree || ''}
              onChange={(e) =>
                handleFilterChange('tq_degree', e.target.value || undefined)
              }
            >
              <option value="">전체 난이도</option>
              {Object.entries(questionDegreeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.ordering || ''}
              onChange={(e) =>
                handleFilterChange('ordering', e.target.value || undefined)
              }
            >
              <option value="">최신순</option>
              <option value="-created_at">생성일 (최신)</option>
              <option value="created_at">생성일 (오래된)</option>
              <option value="-score">점수 (높은순)</option>
              <option value="score">점수 (낮은순)</option>
            </select>

            {Object.keys(filters).length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({})
                  setSearchText('')
                }}
              >
                필터 초기화
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {data?.results.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <p className="text-muted-foreground">문제가 없습니다.</p>
              {user?.user_type === 'teacher' && (
                <Button
                  className="mt-4"
                  onClick={() => navigate({ to: '/questions/new' })}
                >
                  첫 문제 만들기
                </Button>
              )}
            </div>
          ) : (
            data?.results.map((question) => (
              <div
                key={question.id}
                className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{question.name}</h3>
                      <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium">
                        {questionTypeLabels[question.tq_type]}
                      </span>
                      <span className="rounded bg-secondary px-2 py-1 text-xs font-medium">
                        {questionDegreeLabels[question.tq_degree]}
                      </span>
                      {question.is_share && (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          공유됨
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>과목: {question.subject.subject_name}</span>
                      <span>배점: {question.score}점</span>
                      <span>
                        생성일:{' '}
                        {new Date(question.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate({ to: `/questions/${question.id}` })}
                    >
                      상세
                    </Button>
                    {user?.id === question.creat_user.id && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate({ to: `/questions/${question.id}/edit` })
                          }
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(question.id)}
                        >
                          삭제
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {data && data.count > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              총 {data.count}개의 문제
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!data.previous}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))
                }
              >
                이전
              </Button>
              <Button
                variant="outline"
                disabled={!data.next}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))
                }
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
