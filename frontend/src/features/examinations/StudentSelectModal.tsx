import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getStudents } from '@/api/student'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Student } from '@/types/student'

interface StudentSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (studentIds: number[]) => void
  enrolledStudentIds: number[]
}

export function StudentSelectModal({
  isOpen,
  onClose,
  onConfirm,
  enrolledStudentIds,
}: StudentSelectModalProps) {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['students', { search }],
    queryFn: () => getStudents({ search }),
    enabled: isOpen,
  })

  const handleToggleStudent = (studentsInfoId: number) => {
    setSelectedIds((prev) =>
      prev.includes(studentsInfoId)
        ? prev.filter((id) => id !== studentsInfoId)
        : [...prev, studentsInfoId]
    )
  }

  const handleConfirm = () => {
    if (selectedIds.length === 0) {
      toast.warning('최소 1명 이상의 학생을 선택해주세요.')
      return
    }
    onConfirm(selectedIds)
    setSelectedIds([])
    setSearch('')
  }

  const handleClose = () => {
    setSelectedIds([])
    setSearch('')
    onClose()
  }

  if (!isOpen) return null

  const availableStudents =
    data?.results.filter((s) => !enrolledStudentIds.includes(s.studentsinfo_id)) || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl rounded-lg bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">학생 선택</h2>
          <button
            onClick={handleClose}
            className="text-2xl text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <Input
            placeholder="이름, 학번, 이메일로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mb-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center">로딩 중...</div>
          ) : availableStudents.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {search ? '검색 결과가 없습니다.' : '등록 가능한 학생이 없습니다.'}
            </div>
          ) : (
            <div className="space-y-2">
              {availableStudents.map((student: Student) => (
                <label
                  key={student.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(student.studentsinfo_id)}
                    onChange={() => handleToggleStudent(student.studentsinfo_id)}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{student.student_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {student.email}
                      {student.student_id && ` • ${student.student_id}`}
                      {student.student_school && ` • ${student.student_school}`}
                      {student.student_class && ` • ${student.student_class}`}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedIds.length}명 선택됨
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
              등록
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
