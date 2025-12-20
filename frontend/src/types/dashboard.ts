import type { Question } from './question'
import type { Examination, TestPaper } from './testpaper'
import type { ExamSubmission } from './exam'

export interface StudentDashboard {
  recent_submissions: ExamSubmission[]
  upcoming_exams: Examination[]
  score_trend: ScoreTrend[]
  wrong_questions: Question[]
  statistics: StudentStatistics
}

export interface TeacherDashboard {
  recent_questions: Question[]
  recent_testpapers: TestPaper[]
  ongoing_exams: Examination[]
  question_statistics: QuestionStatistics
  student_statistics: StudentExamStatistics
}

export interface ScoreTrend {
  date: string
  score: number
  total_score: number
  percentage: number
  exam_name: string
}

export interface StudentStatistics {
  total_exams_taken: number
  average_score: number
  pass_rate: number
  total_questions_answered: number
  correct_answers: number
}

export interface QuestionStatistics {
  total_questions: number
  shared_questions: number
  questions_by_type: {
    xz: number
    pd: number
    tk: number
  }
  questions_by_difficulty: {
    jd: number
    zd: number
    kn: number
  }
}

export interface StudentExamStatistics {
  total_students: number
  total_submissions: number
  average_score: number
  pass_rate: number
  recent_submissions: ExamSubmission[]
}
