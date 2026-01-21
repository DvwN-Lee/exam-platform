/**
 * 성적 관련 TypeScript 타입 정의
 * Backend API: /api/v1/scores/
 */

// 학생 기본 정보 (StudentBasicSerializer)
export interface StudentBasic {
  id: number
  student_name: string
  student_id: string
  student_class: string
}

// 문제별 결과 (QuestionResultSerializer)
export interface QuestionResult {
  question_id: number
  question_name: string
  question_type: 'xz' | 'pd' | 'jd' // 객관식, OX, 주관식
  question_type_display: string
  user_answer: string | null
  correct_answer: string | null
  is_correct: boolean | null
  score: number
  max_score: number
  manual_graded?: boolean
  comment?: string
}

// 교사용: 시험별 학생 성적 (ExamScoreListSerializer)
export interface ExamScore {
  id: number
  student: StudentBasic
  test_score: number
  start_time: string | null
  submit_time: string | null
  time_used: number | null
  is_submitted: boolean
  passed: boolean | null
}

// 교사용: 시험별 성적 목록 응답
export interface ExamScoresResponse {
  exam_id: number
  exam_name: string
  scores: ExamScore[]
}

// 교사용: 시험 통계 (ExamStatisticsSerializer)
export interface ExamStatistics {
  exam_id: number
  exam_name: string
  total_students: number
  submitted_count: number
  not_submitted_count: number
  average_score: number
  highest_score: number
  lowest_score: number
  pass_count: number
  fail_count: number
  pass_rate: number
}

// 학생 성적 상세 (MyScoreDetailSerializer)
export interface StudentScoreDetail {
  id: number
  exam_name: string
  subject_name: string
  paper_name: string
  test_score: number
  total_possible: number
  passing_score: number
  passed: boolean
  start_time: string | null
  submit_time: string | null
  time_used: number | null
  question_results: QuestionResult[]
}

// 수동 채점 요청
export interface ManualGradeRequest {
  question_id: number
  score: number
  comment?: string
}

// 수동 채점 응답
export interface ManualGradeResponse {
  detail: string
  new_total_score: number
}
