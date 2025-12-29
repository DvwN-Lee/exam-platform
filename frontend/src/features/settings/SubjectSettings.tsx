import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import apiClient from '@/api/client'

interface Subject {
  id: number
  subject_name: string
  create_time: string
}

export function SubjectSettings() {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  // 과목 목록 조회
  const { data: subjects, isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await apiClient.get<{ results: Subject[] }>('/subjects/')
      return response.data.results
    },
  })

  // 과목 추가
  const addMutation = useMutation({
    mutationFn: async (subject_name: string) => {
      const response = await apiClient.post('/subjects/', { subject_name })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setNewSubjectName('')
      setIsAdding(false)
      toast.success('과목이 추가되었습니다.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '과목 추가에 실패했습니다.')
    },
  })

  // 과목 수정
  const updateMutation = useMutation({
    mutationFn: async ({ id, subject_name }: { id: number; subject_name: string }) => {
      const response = await apiClient.put(`/subjects/${id}/`, { subject_name })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setEditingId(null)
      setEditingName('')
      toast.success('과목이 수정되었습니다.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '과목 수정에 실패했습니다.')
    },
  })

  // 과목 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/subjects/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      toast.success('과목이 삭제되었습니다.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '과목 삭제에 실패했습니다.')
    },
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubjectName.trim()) {
      toast.warning('과목명을 입력하세요.')
      return
    }
    addMutation.mutate(newSubjectName)
  }

  const handleUpdate = (id: number) => {
    if (!editingName.trim()) {
      toast.warning('과목명을 입력하세요.')
      return
    }
    updateMutation.mutate({ id, subject_name: editingName })
  }

  const handleDelete = (id: number, name: string) => {
    if (confirm(`"${name}" 과목을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return <div className="text-center">로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">과목 관리</h2>
        <p className="text-sm text-muted-foreground">
          시험에 사용할 과목을 추가하고 관리합니다
        </p>
      </div>

      <div className="space-y-3">
        {/* 과목 목록 */}
        {subjects && subjects.length > 0 ? (
          <div className="space-y-2">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                {editingId === subject.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 rounded-md border px-3 py-1"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdate(subject.id)}
                      className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditingName('')
                      }}
                      className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="font-medium">{subject.subject_name}</div>
                      <div className="text-xs text-muted-foreground">
                        생성일: {new Date(subject.create_time).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(subject.id)
                          setEditingName(subject.subject_name)
                        }}
                        className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(subject.id, subject.subject_name)}
                        className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            등록된 과목이 없습니다. 과목을 추가해주세요.
          </div>
        )}

        {/* 과목 추가 폼 */}
        {isAdding ? (
          <form onSubmit={handleAdd} className="flex gap-2 rounded-lg border p-3">
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="새 과목명을 입력하세요"
              className="flex-1 rounded-md border px-3 py-1"
              autoFocus
            />
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="rounded-md bg-primary px-4 py-1 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {addMutation.isPending ? '추가 중...' : '추가'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setNewSubjectName('')
              }}
              className="rounded-md border px-4 py-1 text-sm hover:bg-muted"
            >
              취소
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:border-primary hover:text-primary"
          >
            + 새 과목 추가
          </button>
        )}
      </div>
    </div>
  )
}
