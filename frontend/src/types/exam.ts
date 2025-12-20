import type { Question } from './question'
import type { Examination } from './testpaper'

export interface ExamAnswer {
  question_id: number
  answer: string
  selected_options?: number[]
}

export interface ExamSubmission {
  id: number
  examination: Examination
  student: {
    id: number
    nick_name: string
  }
  answers: ExamAnswerDetail[]
  score: number
  total_score: number
  submitted_at: string
  created_at: string
}

export interface ExamAnswerDetail {
  id: number
  question: Question
  answer: string
  selected_options: number[]
  is_correct: boolean
  score: number
  max_score: number
}

export interface StartExamResponse {
  submission_id: number
  examination: Examination
  started_at: string
}

export interface SubmitExamRequest {
  answers: ExamAnswer[]
}

export interface SaveAnswerRequest {
  question_id: number
  answer: string
  selected_options?: number[]
}

export interface ExamResult {
  submission: ExamSubmission
  pass: boolean
  pass_score: number
  accuracy: number
}
