import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStudents } from '@/api/student'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { StudentListParams } from '@/types/student'

export function StudentListPage() {
  const [filters, setFilters] = useState<StudentListParams>({})
  const [searchText, setSearchText] = useState('')

  const { data, isLoading } = useQuery({
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
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div>로딩 중...</div>
      </div>
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

        <div className="space-y-4">
          {data?.results.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <p className="text-muted-foreground">등록된 학생이 없습니다.</p>
            </div>
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
                <tbody>
                  {data?.results.map((student) => (
                    <tr
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
