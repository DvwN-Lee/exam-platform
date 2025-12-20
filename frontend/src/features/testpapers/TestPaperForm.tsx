import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { testPaperApi } from '@/api/testpaper'
import { questionApi } from '@/api/question'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TestPaper } from '@/types/testpaper'

const testPaperSchema = z.object({
  name: z.string().min(1, '시험지 제목을 입력해주세요'),
  subject_id: z.number().min(1, '과목을 선택해주세요'),
  questions: z
    .array(
      z.object({
        question_id: z.number(),
        score: z.number().min(1, '배점은 1점 이상이어야 합니다'),
        order: z.number(),
      })
    )
    .min(1, '최소 1개의 문제가 필요합니다'),
})

type TestPaperFormData = z.infer<typeof testPaperSchema>

interface TestPaperFormProps {
  testPaperId?: number
  initialData?: TestPaper
}

export function TestPaperForm({ testPaperId, initialData }: TestPaperFormProps) {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(
    initialData?.subject.id
  )

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: questionApi.getSubjects,
  })

  const { data: questions } = useQuery({
    queryKey: ['questions', selectedSubjectId],
    queryFn: () =>
      questionApi.getMyQuestions(
        selectedSubjectId ? { subject: selectedSubjectId } : {}
      ),
    enabled: !!selectedSubjectId,
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<TestPaperFormData>({
    resolver: zodResolver(testPaperSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          subject_id: initialData.subject.id,
          questions: initialData.questions.map((q) => ({
            question_id: q.question.id,
            score: q.score,
            order: q.order,
          })),
        }
      : {
          name: '',
          questions: [],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  })

  const subjectId = watch('subject_id')

  const createMutation = useMutation({
    mutationFn: testPaperApi.createTestPaper,
    onSuccess: () => {
      alert('시험지가 생성되었습니다.')
      navigate({ to: '/testpapers' })
    },
    onError: () => {
      alert('시험지 생성에 실패했습니다.')
      setIsSubmitting(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: TestPaperFormData) =>
      testPaperApi.updateTestPaper(testPaperId!, data),
    onSuccess: () => {
      alert('시험지가 수정되었습니다.')
      navigate({ to: '/testpapers' })
    },
    onError: () => {
      alert('시험지 수정에 실패했습니다.')
      setIsSubmitting(false)
    },
  })

  const onSubmit = (data: TestPaperFormData) => {
    setIsSubmitting(true)
    if (testPaperId) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const handleAddQuestion = (questionId: number) => {
    const exists = fields.some((field) => field.question_id === questionId)
    if (exists) {
      alert('이미 추가된 문제입니다.')
      return
    }

    append({
      question_id: questionId,
      score: 10,
      order: fields.length + 1,
    })
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {testPaperId ? '시험지 수정' : '시험지 생성'}
          </h1>
          <p className="text-muted-foreground">
            새로운 시험지를 생성하거나 기존 시험지를 수정합니다
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">시험지 제목</Label>
            <Input
              id="name"
              placeholder="시험지 제목을 입력하세요"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject_id">과목</Label>
            <select
              id="subject_id"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('subject_id', {
                valueAsNumber: true,
                onChange: (e) => setSelectedSubjectId(Number(e.target.value)),
              })}
            >
              <option value="">과목 선택</option>
              {subjects?.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.subject_name}
                </option>
              ))}
            </select>
            {errors.subject_id && (
              <p className="text-sm text-destructive">{errors.subject_id.message}</p>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">사용 가능한 문제</h3>
                <p className="text-sm text-muted-foreground">
                  {subjectId ? '문제를 클릭하여 시험지에 추가' : '과목을 먼저 선택하세요'}
                </p>
              </div>

              {subjectId && (
                <div className="space-y-2 max-h-96 overflow-y-auto rounded-lg border p-4">
                  {questions?.results.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      등록된 문제가 없습니다.
                    </p>
                  ) : (
                    questions?.results.map((question) => (
                      <div
                        key={question.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                        onClick={() => handleAddQuestion(question.id)}
                      >
                        <div>
                          <div className="font-medium">{question.name}</div>
                          <div className="text-sm text-muted-foreground">
                            기본 배점: {question.score}점
                          </div>
                        </div>
                        <Button type="button" size="sm" variant="outline">
                          추가
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">선택된 문제</h3>
                <p className="text-sm text-muted-foreground">
                  총 {fields.length}문제
                </p>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto rounded-lg border p-4">
                {fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    선택된 문제가 없습니다.
                  </p>
                ) : (
                  fields.map((field, index) => {
                    const question = questions?.results.find(
                      (q) => q.id === field.question_id
                    )
                    return (
                      <div key={field.id} className="p-3 rounded-lg border space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{question?.name}</div>
                            <div className="flex gap-4 mt-2">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`questions.${index}.score`}>
                                  배점
                                </Label>
                                <Input
                                  id={`questions.${index}.score`}
                                  type="number"
                                  min="1"
                                  className="w-20"
                                  {...register(`questions.${index}.score`, {
                                    valueAsNumber: true,
                                  })}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`questions.${index}.order`}>
                                  순서
                                </Label>
                                <Input
                                  id={`questions.${index}.order`}
                                  type="number"
                                  min="1"
                                  className="w-20"
                                  {...register(`questions.${index}.order`, {
                                    valueAsNumber: true,
                                  })}
                                />
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            제거
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              {errors.questions && (
                <p className="text-sm text-destructive">
                  {typeof errors.questions === 'object' && 'message' in errors.questions
                    ? errors.questions.message
                    : '문제를 확인해주세요'}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate({ to: '/testpapers' })}
            >
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting
                ? testPaperId
                  ? '수정 중...'
                  : '생성 중...'
                : testPaperId
                ? '시험지 수정'
                : '시험지 생성'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
