import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { examApi } from '@/api/exam'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ExamAnswer } from '@/types/exam'

export function ExamTakePage() {
  const navigate = useNavigate()
  const { id } = useParams({ strict: false })
  const [submissionId, setSubmissionId] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Map<number, ExamAnswer>>(new Map())
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  const { data: examInfo } = useQuery({
    queryKey: ['exam-info', id],
    queryFn: () => examApi.getExamInfo(Number(id)),
    enabled: !!id,
  })

  const startExamMutation = useMutation({
    mutationFn: () => examApi.startExam(Number(id)),
    onSuccess: (data) => {
      setSubmissionId(data.submission_id)
      const endTime = new Date(examInfo!.end_time).getTime()
      const now = new Date().getTime()
      setTimeRemaining(Math.floor((endTime - now) / 1000))
    },
    onError: () => {
      alert('시험 시작에 실패했습니다.')
      navigate({ to: '/exams' })
    },
  })

  const saveAnswerMutation = useMutation({
    mutationFn: (data: ExamAnswer) =>
      examApi.saveAnswer(Number(id), {
        question_id: data.question_id,
        answer: data.answer,
        selected_options: data.selected_options,
      }),
  })

  const submitExamMutation = useMutation({
    mutationFn: () =>
      examApi.submitExam(Number(id), {
        answers: Array.from(answers.values()),
      }),
    onSuccess: () => {
      alert('시험이 제출되었습니다.')
      navigate({ to: `/exams/${id}/result` })
    },
    onError: () => {
      alert('시험 제출에 실패했습니다.')
    },
  })

  useEffect(() => {
    if (examInfo && !submissionId) {
      startExamMutation.mutate()
    }
  }, [examInfo])

  useEffect(() => {
    if (timeRemaining <= 0 && submissionId) {
      alert('시험 시간이 종료되었습니다. 자동으로 제출됩니다.')
      submitExamMutation.mutate()
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, submissionId])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswerChange = (questionId: number, answer: string) => {
    const newAnswer: ExamAnswer = {
      question_id: questionId,
      answer,
    }
    setAnswers(new Map(answers.set(questionId, newAnswer)))
    saveAnswerMutation.mutate(newAnswer)
  }

  const handleOptionChange = (
    questionId: number,
    optionId: number,
    isMultiple: boolean
  ) => {
    const currentAnswer = answers.get(questionId)
    let selectedOptions = currentAnswer?.selected_options || []

    if (isMultiple) {
      if (selectedOptions.includes(optionId)) {
        selectedOptions = selectedOptions.filter((id) => id !== optionId)
      } else {
        selectedOptions = [...selectedOptions, optionId]
      }
    } else {
      selectedOptions = [optionId]
    }

    const newAnswer: ExamAnswer = {
      question_id: questionId,
      answer: '',
      selected_options: selectedOptions,
    }
    setAnswers(new Map(answers.set(questionId, newAnswer)))
    saveAnswerMutation.mutate(newAnswer)
  }

  const handleSubmit = () => {
    const unanswered = examInfo!.questions.filter(
      (q) => !answers.has(q.id)
    )

    if (unanswered.length > 0) {
      if (
        !confirm(
          `${unanswered.length}개의 문제가 답변되지 않았습니다. 제출하시겠습니까?`
        )
      ) {
        return
      }
    }

    setShowSubmitModal(true)
  }

  const confirmSubmit = () => {
    setShowSubmitModal(false)
    submitExamMutation.mutate()
  }

  if (!examInfo || !submissionId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>시험을 준비 중입니다...</div>
      </div>
    )
  }

  const questions = examInfo.questions
  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-background">
      {/* Timer Header */}
      <div className="sticky top-0 z-10 border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{examInfo.exam_name}</h2>
            <p className="text-sm text-muted-foreground">
              {currentQuestionIndex + 1} / {questions.length} 문제
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`text-2xl font-bold ${
                timeRemaining < 300 ? 'text-destructive' : ''
              }`}
            >
              {formatTime(timeRemaining)}
            </div>
            <Button onClick={handleSubmit} disabled={submitExamMutation.isPending}>
              제출하기
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-4">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Question Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-lg border bg-card p-4">
              <h3 className="mb-4 font-semibold">문제 목록</h3>
              <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
                {questions.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                      index === currentQuestionIndex
                        ? 'border-primary bg-primary text-primary-foreground'
                        : answers.has(q.id)
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border-2 border-primary bg-primary"></div>
                  <span>현재 문제</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border-2 border-green-500 bg-green-50"></div>
                  <span>답변 완료</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border-2 border-border"></div>
                  <span>미답변</span>
                </div>
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3">
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-6">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    문제 {currentQuestionIndex + 1}
                  </span>
                  <span className="rounded bg-primary/10 px-2 py-1 text-sm">
                    {currentQuestion.assigned_score}점
                  </span>
                </div>
                <h3 className="text-xl font-semibold">
                  {currentQuestion.name}
                </h3>
              </div>

              {currentQuestion.tq_img && (
                <div className="mb-6">
                  <img
                    src={currentQuestion.tq_img}
                    alt="문제 이미지"
                    className="max-w-full rounded-lg"
                  />
                </div>
              )}

              {/* Answer Input */}
              <div className="space-y-4">
                {currentQuestion.tq_type === 'xz' && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option, index) => (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={answers
                            .get(currentQuestion.id)
                            ?.selected_options?.includes(option.id!) || false}
                          onChange={() =>
                            handleOptionChange(
                              currentQuestion.id,
                              option.id!,
                              true
                            )
                          }
                          className="h-4 w-4"
                        />
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-current font-medium">
                          {index + 1}
                        </div>
                        <span>{option.option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {(currentQuestion.tq_type === 'pd' ||
                  currentQuestion.tq_type === 'tk') && (
                  <div>
                    <Input
                      placeholder="답안을 입력하세요"
                      value={answers.get(currentQuestion.id)?.answer || ''}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestion.id, e.target.value)
                      }
                      className="text-lg"
                    />
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="mt-8 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))
                  }
                  disabled={currentQuestionIndex === 0}
                >
                  이전 문제
                </Button>
                <Button
                  onClick={() =>
                    setCurrentQuestionIndex(
                      Math.min(questions.length - 1, currentQuestionIndex + 1)
                    )
                  }
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  다음 문제
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card p-6">
            <h3 className="mb-4 text-xl font-semibold">시험 제출 확인</h3>
            <p className="mb-6 text-muted-foreground">
              시험을 제출하시겠습니까? 제출 후에는 답안을 수정할 수 없습니다.
            </p>
            <div className="mb-6 rounded-lg bg-accent p-4">
              <div className="flex justify-between text-sm">
                <span>총 문제 수</span>
                <span className="font-medium">{questions.length}개</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>답변 완료</span>
                <span className="font-medium text-green-600">
                  {answers.size}개
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>미답변</span>
                <span className="font-medium text-destructive">
                  {questions.length - answers.size}개
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowSubmitModal(false)}
              >
                취소
              </Button>
              <Button className="flex-1" onClick={confirmSubmit}>
                제출하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
