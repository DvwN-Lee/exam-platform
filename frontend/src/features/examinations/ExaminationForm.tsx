import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { toast } from 'sonner'
import { addHours, differenceInMinutes } from 'date-fns'
import type { AxiosError } from 'axios'
import { examinationApi, testPaperApi } from '@/api/testpaper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingPage } from '@/components/ui/loading'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { MILLISECONDS_PER_MINUTE } from '@/constants'
import type { Examination } from '@/types/testpaper'

const examinationSchema = z
  .object({
    exam_name: z.string().min(1, '시험명을 입력해주세요'),
    testpaper_id: z.number().min(1, '시험지를 선택해주세요'),
    start_time: z.date({ error: '시작 시간을 선택해주세요' }),
    end_time: z.date({ error: '종료 시간을 선택해주세요' }),
    is_public: z.boolean(),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: '종료 시간은 시작 시간 이후여야 합니다',
    path: ['end_time'],
  })
  .refine((data) => data.start_time > new Date(), {
    message: '시작 시간은 현재 시간 이후여야 합니다',
    path: ['start_time'],
  })

export type BackendFieldError = {
  [key: string]: string[] | string
}

// Backend 에러 응답에서 메시지 추출 helper function
// eslint-disable-next-line react-refresh/only-export-components -- Unit Test에서 사용하는 함수
export function extractErrorMessage(error: AxiosError<BackendFieldError>): string {
  const data = error.response?.data

  // Backend 필드별 에러 형식: {"field_name": ["error message"]}
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const messages: string[] = []

    for (const value of Object.values(data)) {
      if (Array.isArray(value)) {
        messages.push(...value.filter((msg) => typeof msg === 'string'))
      } else if (typeof value === 'string') {
        messages.push(value)
      }
    }

    if (messages.length > 0) {
      return messages.join(', ')
    }
  }

  // Fallback
  return ''
}

type ExaminationFormData = z.infer<typeof examinationSchema>

interface ExaminationFormProps {
  examinationId?: number
  initialData?: Examination
}

export function ExaminationForm({
  examinationId: propExaminationId,
  initialData: propInitialData,
}: ExaminationFormProps) {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // URL 파라미터에서 ID 추출 (strict: false로 여러 라우트에서 재사용 가능)
  const params = useParams({ strict: false }) as { id?: string }
  const parsedId = params.id ? Number(params.id) : undefined
  const examinationId = propExaminationId || (parsedId && !Number.isNaN(parsedId) ? parsedId : undefined)

  // 기존 데이터 fetch (ID가 있는 경우)
  const {
    data: fetchedExamination,
    isLoading: isLoadingExamination,
    isError: isExaminationError,
    error: examinationError,
  } = useQuery({
    queryKey: ['examination', examinationId],
    queryFn: () => examinationApi.getExamination(examinationId!),
    enabled: !!examinationId && !propInitialData,
  })

  const initialData = propInitialData || fetchedExamination

  const { data: testPapers } = useQuery({
    queryKey: ['testpapers'],
    queryFn: () => testPaperApi.getTestPapers(),
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<ExaminationFormData>({
    resolver: zodResolver(examinationSchema),
    defaultValues: {
      exam_name: '',
      testpaper_id: 0,
      start_time: addHours(new Date(), 1),
      end_time: addHours(new Date(), 2),
      is_public: false,
    },
  })

  const startTime = watch('start_time')
  const endTime = watch('end_time')

  // Duration 계산
  const durationMinutes =
    startTime && endTime ? differenceInMinutes(endTime, startTime) : 0
  const durationHours = Math.floor(durationMinutes / 60)
  const durationRemainingMinutes = durationMinutes % 60
  const isDurationValid = durationMinutes > 0

  // 기존 데이터 로드 시 폼 초기화
  useEffect(() => {
    if (initialData) {
      reset({
        exam_name: initialData.exam_name,
        testpaper_id: initialData.testpaper.id,
        start_time: new Date(initialData.start_time),
        end_time: new Date(initialData.end_time),
        is_public: initialData.is_public,
      })
    }
  }, [initialData, reset])

  const createMutation = useMutation({
    mutationFn: examinationApi.createExamination,
    onSuccess: () => {
      toast.success('시험이 생성되었습니다.')
      navigate({ to: '/examinations' })
    },
    onError: (error: AxiosError<BackendFieldError>) => {
      const message = extractErrorMessage(error) || '시험 생성에 실패했습니다.'
      toast.error(message)
      setIsSubmitting(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; subject_id?: number; start_time?: string; duration?: number; exam_type?: 'pt' | 'ts' }) =>
      examinationApi.updateExamination(examinationId!, data),
    onSuccess: () => {
      toast.success('시험이 수정되었습니다.')
      navigate({ to: '/examinations' })
    },
    onError: (error: AxiosError<BackendFieldError>) => {
      const message = extractErrorMessage(error) || '시험 수정에 실패했습니다.'
      toast.error(message)
      setIsSubmitting(false)
    },
  })

  const onSubmit = (data: ExaminationFormData) => {
    setIsSubmitting(true)

    // 선택한 testpaper의 subject_id 찾기
    const selectedTestPaper = testPapers?.results.find(
      (tp) => tp.id === data.testpaper_id
    )

    if (!selectedTestPaper) {
      toast.error('선택한 시험지를 찾을 수 없습니다.')
      setIsSubmitting(false)
      return
    }

    // start_time과 end_time의 차이를 분 단위로 계산
    const submitDurationMinutes = Math.floor(
      (data.end_time.getTime() - data.start_time.getTime()) / MILLISECONDS_PER_MINUTE
    )

    // Backend API 형식에 맞게 데이터 변환
    const backendData = {
      name: data.exam_name,
      subject_id: selectedTestPaper.subject.id,
      start_time: data.start_time.toISOString(),
      duration: submitDurationMinutes,
      exam_type: 'pt',
      papers: [
        {
          paper_id: data.testpaper_id,
        },
      ],
    }

    if (examinationId) {
      const updateData = {
        name: data.exam_name,
        subject_id: selectedTestPaper.subject.id,
        start_time: data.start_time.toISOString(),
        duration: submitDurationMinutes,
        exam_type: 'pt' as const,
      }
      updateMutation.mutate(updateData)
    } else {
      createMutation.mutate(backendData)
    }
  }

  // 로딩 상태 처리
  if (isLoadingExamination) {
    return <LoadingPage message="시험 정보를 불러오는 중..." />
  }

  // 에러 상태 처리
  if (isExaminationError) {
    return (
      <div className="flex min-h-[250px] sm:min-h-[300px] md:min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-destructive">
          시험 정보를 불러오는데 실패했습니다.
          {examinationError instanceof Error && `: ${examinationError.message}`}
        </p>
        <Button variant="outline" onClick={() => navigate({ to: '/examinations' })}>
          목록으로 돌아가기
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {examinationId ? '시험 수정' : '시험 생성'}
          </h1>
          <p className="text-muted-foreground">
            새로운 시험을 생성하거나 기존 시험을 수정합니다
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="exam_name">시험명</Label>
            <Input
              id="exam_name"
              placeholder="시험명을 입력하세요"
              {...register('exam_name')}
            />
            {errors.exam_name && (
              <p className="text-sm text-destructive">{errors.exam_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="testpaper_id">시험지</Label>
            <select
              id="testpaper_id"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('testpaper_id', { valueAsNumber: true })}
            >
              <option value="">시험지 선택</option>
              {testPapers?.results.map((testPaper) => (
                <option key={testPaper.id} value={testPaper.id}>
                  {testPaper.name} ({testPaper.subject.subject_name} -{' '}
                  {testPaper.question_count}문제)
                </option>
              ))}
            </select>
            {errors.testpaper_id && (
              <p className="text-sm text-destructive">
                {errors.testpaper_id.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>시작 시간</Label>
              <Controller
                name="start_time"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                    minDate={new Date()}
                  />
                )}
              />
              {errors.start_time && (
                <p className="text-sm text-destructive">
                  {errors.start_time.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>종료 시간</Label>
              <Controller
                name="end_time"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                    minDate={startTime}
                  />
                )}
              />
              {errors.end_time && (
                <p className="text-sm text-destructive">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          {isDurationValid && (
            <div className="rounded-md border border-input bg-muted/50 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                시험 시간:{' '}
                <span className="font-medium text-foreground">
                  {durationHours > 0 && `${durationHours}시간 `}
                  {durationRemainingMinutes}분
                </span>
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_public"
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
              {...register('is_public')}
            />
            <Label htmlFor="is_public" className="cursor-pointer">
              공개 시험 (모든 사용자에게 공개)
            </Label>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate({ to: '/examinations' })}
            >
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting
                ? examinationId
                  ? '수정 중...'
                  : '생성 중...'
                : examinationId
                ? '시험 수정'
                : '시험 생성'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
