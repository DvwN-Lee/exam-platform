import type { Question } from './question'
import type { Examination } from './testpaper'

// 시험용 문제 (배점이 포함된 형태)
export interface ExamQuestion extends Question {
  assigned_score: number
}

export interface ExamInfo {
  exam_id: number
  exam_name: string
  subject_name: string
  start_time: string
  end_time: string
  duration: number
  total_score: number
  passing_score: number
  question_count: number
  questions: ExamQuestion[]
  is_started: boolean
  is_submitted: boolean
}

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
