import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { questionApi } from '@/api/question'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FadeIn } from '@/components/animation'
import { DURATION, EASING } from '@/lib/animations'
import type { Question } from '@/types/question'

const questionSchema = z
  .object({
    name: z.string().min(1, '문제 제목을 입력해주세요'),
    subject_id: z.number().min(1, '과목을 선택해주세요'),
    score: z.number().min(1, '배점은 1점 이상이어야 합니다'),
    tq_type: z.enum(['xz', 'pd', 'tk']),
    tq_degree: z.enum(['jd', 'zd', 'kn']),
    options: z.array(
      z.object({
        id: z.number().optional(),
        option: z.string(),
        is_right: z.boolean(),
      })
    ),
  })
  .superRefine((data, ctx) => {
    // 객관식(xz)인 경우에만 options validation 적용
    if (data.tq_type === 'xz') {
      if (data.options.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '최소 1개의 선택지가 필요합니다',
          path: ['options'],
        })
      }
      // 각 옵션의 텍스트가 비어있지 않은지 검증
      data.options.forEach((opt, index) => {
        if (!opt.option || opt.option.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '선택지를 입력해주세요',
            path: ['options', index, 'option'],
          })
        }
      })
      if (!data.options.some((opt) => opt.is_right)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '최소 1개의 정답이 필요합니다',
          path: ['options'],
        })
      }
    }
  })

type QuestionFormData = z.infer<typeof questionSchema>

interface QuestionFormProps {
  questionId?: number
  initialData?: Question
}

export function QuestionForm({ questionId, initialData }: QuestionFormProps) {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: questionApi.getSubjects,
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          subject_id: initialData.subject.id,
          score: initialData.score,
          tq_type: initialData.tq_type,
          tq_degree: initialData.tq_degree,
          options: initialData.options,
        }
      : {
          name: '',
          score: 10,
          tq_type: 'xz',
          tq_degree: 'zd',
          options: [
            { option: '', is_right: false },
            { option: '', is_right: false },
          ],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  })

  const tqType = watch('tq_type')

  const createMutation = useMutation({
    mutationFn: questionApi.createQuestion,
    onSuccess: () => {
      toast.success('문제가 생성되었습니다.')
      navigate({ to: '/questions' })
    },
    onError: () => {
      toast.error('문제 생성에 실패했습니다.')
      setIsSubmitting(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: QuestionFormData) =>
      questionApi.updateQuestion(questionId!, data),
    onSuccess: () => {
      toast.success('문제가 수정되었습니다.')
      navigate({ to: '/questions' })
    },
    onError: () => {
      toast.error('문제 수정에 실패했습니다.')
      setIsSubmitting(false)
    },
  })

  const onSubmit = (data: QuestionFormData) => {
    setIsSubmitting(true)

    // 주관식(pd)과 빈칸채우기(tk)는 빈 옵션 제거
    const submitData = {
      ...data,
      options:
        data.tq_type === 'xz'
          ? data.options
          : data.options.filter((opt) => opt.option && opt.option.trim().length > 0),
    }

    if (questionId) {
      updateMutation.mutate(submitData)
    } else {
      createMutation.mutate(submitData)
    }
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <FadeIn>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {questionId ? '문제 수정' : '문제 생성'}
            </h1>
            <p className="text-muted-foreground">
              새로운 문제를 생성하거나 기존 문제를 수정합니다
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">문제 제목</Label>
            <Input
              id="name"
              placeholder="문제 제목을 입력하세요"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subject_id">과목</Label>
              <select
                id="subject_id"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('subject_id', { valueAsNumber: true })}
              >
                <option value="">과목 선택</option>
                {subjects?.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>
              {errors.subject_id && (
                <p className="text-sm text-destructive">
                  {errors.subject_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="score">배점</Label>
              <Input
                id="score"
                type="number"
                min="1"
                {...register('score', { valueAsNumber: true })}
              />
              {errors.score && (
                <p className="text-sm text-destructive">{errors.score.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tq_type">문제 유형</Label>
              <select
                id="tq_type"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('tq_type')}
              >
                <option value="xz">객관식</option>
                <option value="pd">주관식</option>
                <option value="tk">빈칸채우기</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tq_degree">난이도</Label>
              <select
                id="tq_degree"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('tq_degree')}
              >
                <option value="jd">쉬움</option>
                <option value="zd">보통</option>
                <option value="kn">어려움</option>
              </select>
            </div>
          </div>

          {tqType === 'xz' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>선택지</Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => append({ option: '', is_right: false })}
                >
                  선택지 추가
                </Button>
              </div>

              <AnimatePresence mode="popLayout">
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    className="flex gap-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
                    layout
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        {...register(`options.${index}.is_right`)}
                        className="h-4 w-4"
                      />
                    </div>
                    <Input
                      placeholder={`선택지 ${index + 1}`}
                      {...register(`options.${index}.option`)}
                      className="flex-1"
                    />
                    {fields.length > 2 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        삭제
                      </Button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {errors.options && (
                <p className="text-sm text-destructive">
                  {typeof errors.options === 'object' && 'message' in errors.options
                    ? errors.options.message
                    : '선택지를 확인해주세요'}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate({ to: '/questions' })}
            >
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting
                ? questionId
                  ? '수정 중...'
                  : '생성 중...'
                : questionId
                ? '문제 수정'
                : '문제 생성'}
            </Button>
          </div>
          </form>
        </FadeIn>
      </div>
    </div>
  )
}
