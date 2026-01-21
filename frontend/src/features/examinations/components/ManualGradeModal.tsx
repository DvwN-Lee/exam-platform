import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { modalOverlayVariants, modalContentVariants } from '@/lib/animations'
import type { QuestionResult } from '@/types/score'

interface ManualGradeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (score: number, comment: string) => void
  question: QuestionResult | null
  isLoading?: boolean
}

export function ManualGradeModal({
  isOpen,
  onClose,
  onConfirm,
  question,
  isLoading = false,
}: ManualGradeModalProps) {
  const [score, setScore] = useState<string>('')
  const [comment, setComment] = useState('')

  const handleClose = () => {
    setScore('')
    setComment('')
    onClose()
  }

  const handleConfirm = () => {
    const numScore = parseInt(score, 10)
    if (isNaN(numScore) || numScore < 0) {
      return
    }
    if (question && numScore > question.max_score) {
      return
    }
    onConfirm(numScore, comment)
    // 상태 초기화는 부모의 mutation 성공 후 onClose를 통해 처리됨
  }

  const numScore = parseInt(score, 10)
  const isValid =
    !isNaN(numScore) &&
    numScore >= 0 &&
    question &&
    numScore <= question.max_score

  return (
    <AnimatePresence>
      {isOpen && question && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          variants={modalOverlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg"
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">수동 채점</h2>
              <button
                onClick={handleClose}
                className="text-2xl text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">문제</div>
                <div className="font-medium">{question.question_name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {question.question_type_display} - 최대 {question.max_score}점
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">학생 답안</div>
                <div className="mt-1 rounded border bg-muted/50 p-3">
                  {question.user_answer || '(답안 없음)'}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">현재 점수</div>
                <div className="font-medium">
                  {question.score} / {question.max_score}점
                  {question.manual_graded && (
                    <span className="ml-2 text-xs text-blue-600">(수동 채점됨)</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">새로운 점수</label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={question.max_score}
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder={`0 ~ ${question.max_score}`}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">/ {question.max_score}점</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">코멘트 (선택)</label>
                <textarea
                  className="mt-1 w-full rounded border p-2 text-sm"
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="채점 코멘트를 입력하세요..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                취소
              </Button>
              <Button onClick={handleConfirm} disabled={!isValid || isLoading}>
                {isLoading ? '저장 중...' : '저장'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
