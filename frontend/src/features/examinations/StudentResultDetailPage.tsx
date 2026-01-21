import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { scoreApi } from '@/api/score'
import { Button } from '@/components/ui/button'
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton'
import { ManualGradeModal } from './components/ManualGradeModal'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animation'
import { cardHoverVariants } from '@/lib/animations'
import type { QuestionResult } from '@/types/score'

export function StudentResultDetailPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id, studentId } = useParams({ strict: false })
  const examId = Number(id)
  const studentIdNum = Number(studentId)

  const [selectedQuestion, setSelectedQuestion] = useState<QuestionResult | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: scoreDetail, isLoading, isError } = useQuery({
    queryKey: ['studentScoreDetail', examId, studentIdNum],
    queryFn: () => scoreApi.getStudentScoreDetail(examId, studentIdNum),
    enabled: !!examId && !!studentIdNum,
  })

  const gradeMutation = useMutation({
    mutationFn: (params: { questionId: number; score: number; comment: string }) => {
      if (!scoreDetail) {
        return Promise.reject(new Error('Score detail not loaded'))
      }
      return scoreApi.manualGrade(scoreDetail.id, {
        question_id: params.questionId,
        score: params.score,
        comment: params.comment,
      })
    },
    onSuccess: () => {
      toast.success('채점이 완료되었습니다.')
      setIsModalOpen(false)
      queryClient.invalidateQueries({
        queryKey: ['studentScoreDetail', examId, studentIdNum],
      })
      queryClient.invalidateQueries({ queryKey: ['examScores', examId] })
      queryClient.invalidateQueries({ queryKey: ['examStatistics', examId] })
    },
    onError: () => {
      toast.error('채점에 실패했습니다.')
    },
  })

  const handleOpenGradeModal = (question: QuestionResult) => {
    setSelectedQuestion(question)
    setIsModalOpen(true)
  }

  const handleGrade = (score: number, comment: string) => {
    if (!selectedQuestion) return
    gradeMutation.mutate({
      questionId: selectedQuestion.question_id,
      score,
      comment,
    })
  }

  const getAnswerStatusBadge = (question: QuestionResult) => {
    if (question.is_correct === null) {
      return (
        <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
          채점 필요
        </span>
      )
    }
    return question.is_correct ? (
      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        정답
      </span>
    ) : (
      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        오답
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-6 w-1/3" />
        <div className="flex justify-center">
          <Skeleton className="h-40 w-64 rounded-lg" />
        </div>
        <CardSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-destructive">데이터를 불러오는데 실패했습니다.</div>
      </div>
    )
  }

  if (!scoreDetail) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div>성적 정보를 찾을 수 없습니다.</div>
      </div>
    )
  }

  const correctCount = scoreDetail.question_results.filter(
    (q) => q.is_correct === true
  ).length
  const totalQuestions = scoreDetail.question_results.length
  const correctRate = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <FadeIn>
          <div className="flex items-start justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: `/examinations/${id}/results` })}
                className="mb-2 -ml-2"
              >
                &larr; 결과 목록
              </Button>
              <h1 className="text-3xl font-bold tracking-tight">학생 성적 상세</h1>
              <p className="mt-1 text-muted-foreground">
                {scoreDetail.exam_name} - {scoreDetail.subject_name}
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="flex justify-center">
            <div className="rounded-lg border bg-card px-12 py-8 text-center">
              <div className="text-4xl font-bold">
                {scoreDetail.test_score}{' '}
                <span className="text-2xl text-muted-foreground">
                  / {scoreDetail.total_possible}점
                </span>
              </div>
              <div className="mt-2 flex items-center justify-center gap-3">
                <span className="text-lg text-muted-foreground">{correctRate}%</span>
                {scoreDetail.passed ? (
                  <span className="rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    합격
                  </span>
                ) : (
                  <span className="rounded bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                    불합격
                  </span>
                )}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <div>정답: {correctCount} / {totalQuestions}문제</div>
                <div>합격 기준: {scoreDetail.passing_score}점</div>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">문제별 결과</h2>
            <StaggerContainer className="space-y-3" delay={0.15}>
              {scoreDetail.question_results.map((question, index) => (
                <StaggerItem key={question.question_id}>
                  <motion.div
                    className="rounded-lg border p-4"
                    initial="rest"
                    whileHover="hover"
                    variants={cardHoverVariants}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{question.question_name}</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {question.question_type_display}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {question.score}/{question.max_score}점
                        </span>
                        {getAnswerStatusBadge(question)}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="text-muted-foreground">학생 답안:</span>
                        <span className="font-medium">
                          {question.user_answer || '(답안 없음)'}
                        </span>
                      </div>
                      {question.correct_answer && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">정답:</span>
                          <span className="font-medium text-green-600">
                            {question.correct_answer}
                          </span>
                        </div>
                      )}
                      {question.comment && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">코멘트:</span>
                          <span>{question.comment}</span>
                        </div>
                      )}
                    </div>

                    {question.question_type === 'jd' && (
                      <div className="mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenGradeModal(question)}
                        >
                          {question.manual_graded ? '재채점' : '수동 채점'}
                        </Button>
                      </div>
                    )}
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </FadeIn>

        <ManualGradeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleGrade}
          question={selectedQuestion}
          isLoading={gradeMutation.isPending}
        />
      </div>
    </div>
  )
}
