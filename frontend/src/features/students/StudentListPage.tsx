import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Users, AlertCircle } from 'lucide-react'
import { getStudents } from '@/api/student'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingPage } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animation'
import { cardHoverVariants } from '@/lib/animations'
import type { StudentListParams } from '@/types/student'

const PAGE_SIZE = 20

export function StudentListPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<StudentListParams>({})
  const [searchText, setSearchText] = useState('')
  const [schoolText, setSchoolText] = useState('')
  const [classText, setClassText] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['students', filters],
    queryFn: () => getStudents(filters),
  })

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchText || undefined,
      school: schoolText || undefined,
      class: classText || undefined,
      page: 1,
    }))
  }, [searchText, schoolText, classText])

  const handleOrderingChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, ordering: value || undefined, page: 1 }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({})
    setSearchText('')
    setSchoolText('')
    setClassText('')
  }, [])

  const currentPage = filters.page || 1
  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0

  if (isLoading) {
    return <LoadingPage message="학생 목록을 불러오는 중..." fullScreen={false} />
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="데이터를 불러오지 못했습니다"
        description="잠시 후 다시 시도해 주세요."
        action={{ label: '재시도', onClick: () => refetch() }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">학생 관리</h1>
              <p className="text-muted-foreground">등록된 학생 목록을 조회합니다</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn type="slideUp" delay={0.05}>
          <div className="relative overflow-hidden rounded-lg border bg-card p-6">
            <div className="absolute right-4 top-4 text-primary/10">
              <Users className="h-16 w-16" />
            </div>
            <div className="text-sm font-medium text-muted-foreground">총 학생 수</div>
            <div className="mt-2 text-3xl font-bold">{data?.count || 0}</div>
            <div className="text-xs text-muted-foreground">명</div>
          </div>
        </FadeIn>

        <FadeIn type="slideUp" delay={0.1}>
          <div className="space-y-4 rounded-lg border bg-card p-4">
            <div className="flex gap-4">
              <Input
                placeholder="이름, 학번, 이메일로 검색..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch}>검색</Button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="학교 필터..."
                value={schoolText}
                onChange={(e) => setSchoolText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-48"
              />

              <Input
                placeholder="반 필터..."
                value={classText}
                onChange={(e) => setClassText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-48"
              />

              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.ordering || ''}
                onChange={(e) => handleOrderingChange(e.target.value)}
              >
                <option value="">최신 가입순</option>
                <option value="studentsinfo__student_name">이름순 (오름차순)</option>
                <option value="-studentsinfo__student_name">이름순 (내림차순)</option>
                <option value="date_joined">가입일 (오래된순)</option>
              </select>

              {(Object.keys(filters).length > 0 || searchText || schoolText || classText) && (
                <Button variant="outline" onClick={resetFilters}>
                  필터 초기화
                </Button>
              )}
            </div>
          </div>
        </FadeIn>

        <StaggerContainer className="space-y-4">
          {data?.results.length === 0 ? (
            <FadeIn>
              <EmptyState
                icon={Users}
                title="등록된 학생이 없습니다"
                description="아직 시험에 응시한 학생이 없습니다."
              />
            </FadeIn>
          ) : (
            data?.results.map((student) => (
              <StaggerItem key={student.id}>
                <motion.div
                  className="rounded-lg border bg-card p-4 transition-colors"
                  initial="rest"
                  whileHover="hover"
                  variants={cardHoverVariants}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{student.student_name}</span>
                        <span className="text-sm text-muted-foreground">
                          @{student.username}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          학번:{' '}
                          {student.student_id || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </span>
                        <span>
                          학교:{' '}
                          {student.student_school || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </span>
                        <span>
                          반:{' '}
                          {student.student_class || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        가입일: {new Date(student.date_joined).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate({ to: `/students/${student.id}` })}
                    >
                      상세
                    </Button>
                  </div>
                </motion.div>
              </StaggerItem>
            ))
          )}
        </StaggerContainer>

        {data && data.count > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              총 {data.count}명의 학생 | {currentPage} / {totalPages} 페이지
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
