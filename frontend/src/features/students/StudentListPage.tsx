import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, AlertCircle } from 'lucide-react'
import { getStudents } from '@/api/student'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingPage } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  StaggerTableBody,
  StaggerTableRow,
} from '@/components/animation'
import { cardHoverVariants } from '@/lib/animations'
import type { StudentListParams } from '@/types/student'

export function StudentListPage() {
  const [filters, setFilters] = useState<StudentListParams>({})
  const [searchText, setSearchText] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['students', filters],
    queryFn: () => getStudents(filters),
  })

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchText, page: 1 }))
  }

  const handleFilterChange = (key: keyof StudentListParams, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">학생 관리</h1>
            <p className="text-muted-foreground">등록된 학생 목록을 조회합니다</p>
          </div>
        </div>

        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <motion.div
              variants={cardHoverVariants}
              initial="initial"
              whileHover="hover"
              className="relative overflow-hidden rounded-xl border bg-card p-6"
            >
              <div className="absolute right-4 top-4 text-primary/10">
                <Users className="h-16 w-16" />
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                총 학생 수
              </div>
              <div className="mt-2 text-3xl font-bold">{data?.count || 0}</div>
              <div className="text-xs text-muted-foreground">명</div>
            </motion.div>
          </StaggerItem>
        </StaggerContainer>

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
                value={filters.school || ''}
                onChange={(e) =>
                  handleFilterChange('school', e.target.value || undefined)
                }
                className="w-48"
              />

              <Input
                placeholder="반 필터..."
                value={filters.class || ''}
                onChange={(e) =>
                  handleFilterChange('class', e.target.value || undefined)
                }
                className="w-48"
              />

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
        </FadeIn>

        <FadeIn type="slideUp" delay={0.2}>
          <div className="space-y-4">
            {data?.results.length === 0 ? (
              <EmptyState
                icon={Users}
                title="등록된 학생이 없습니다"
                description="아직 시험에 응시한 학생이 없습니다."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-4 text-left font-medium">학생명</th>
                      <th className="p-4 text-left font-medium">학번</th>
                      <th className="p-4 text-left font-medium">이메일</th>
                      <th className="p-4 text-left font-medium">학교</th>
                      <th className="p-4 text-left font-medium">반</th>
                      <th className="p-4 text-left font-medium">가입일</th>
                    </tr>
                  </thead>
                  <StaggerTableBody delay={0.1}>
                    {data?.results.map((student) => (
                      <StaggerTableRow
                        key={student.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{student.student_name}</div>
                            <div className="text-sm text-muted-foreground">
                              @{student.username}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {student.student_id || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4 text-sm">{student.email}</td>
                        <td className="p-4">
                          {student.student_school || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          {student.student_class || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(student.date_joined).toLocaleDateString('ko-KR')}
                        </td>
                      </StaggerTableRow>
                    ))}
                  </StaggerTableBody>
                </table>
              </div>
            )}
          </div>
        </FadeIn>

        {data && data.count > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              총 {data.count}명의 학생
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
