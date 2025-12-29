import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { examinationApi } from '@/api/testpaper'
import { Button } from '@/components/ui/button'
import { StudentSelectModal } from './StudentSelectModal'

interface EnrolledStudentsSectionProps {
  examinationId: number
}

export function EnrolledStudentsSection({
  examinationId,
}: EnrolledStudentsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: enrolledStudents, isLoading } = useQuery({
    queryKey: ['enrolledStudents', examinationId],
    queryFn: () => examinationApi.getEnrolledStudents(examinationId),
  })

  const enrollMutation = useMutation({
    mutationFn: (studentIds: number[]) =>
      examinationApi.enrollStudents(examinationId, studentIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['enrolledStudents', examinationId],
      })
      toast.success(data.detail)
      setIsModalOpen(false)
    },
    onError: () => {
      toast.error('학생 등록에 실패했습니다.')
    },
  })

  const handleEnrollStudents = (studentIds: number[]) => {
    enrollMutation.mutate(studentIds)
  }

  if (isLoading) {
    return <div>로딩 중...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          등록된 학생 ({enrolledStudents?.length || 0}명)
        </h3>
        <Button onClick={() => setIsModalOpen(true)}>학생 추가</Button>
      </div>

      {enrolledStudents && enrolledStudents.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left text-sm font-medium">학생명</th>
                <th className="p-3 text-left text-sm font-medium">학번</th>
                <th className="p-3 text-left text-sm font-medium">이메일</th>
                <th className="p-3 text-left text-sm font-medium">학교</th>
                <th className="p-3 text-left text-sm font-medium">반</th>
              </tr>
            </thead>
            <tbody>
              {enrolledStudents.map((student: any) => (
                <tr key={student.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 text-sm">{student.student_name}</td>
                  <td className="p-3 text-sm">
                    {student.student_id || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3 text-sm">{student.email}</td>
                  <td className="p-3 text-sm">
                    {student.student_school || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    {student.student_class || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">등록된 학생이 없습니다.</p>
          <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
            학생 추가하기
          </Button>
        </div>
      )}

      <StudentSelectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleEnrollStudents}
        enrolledStudentIds={enrolledStudents?.map((s: any) => s.id) || []}
      />
    </div>
  )
}
