/**
 * 성적 API 호출 함수
 * Backend: /api/v1/scores/
 */

import apiClient from './client'
import type {
  ExamScoresResponse,
  ExamStatistics,
  StudentScoreDetail,
  ManualGradeRequest,
  ManualGradeResponse,
} from '@/types/score'

export const scoreApi = {
  /**
   * 시험별 학생 성적 목록 조회 (교사용)
   * GET /api/v1/scores/exam/{exam_id}/
   */
  getExamScores: async (examId: number): Promise<ExamScoresResponse> => {
    const response = await apiClient.get<ExamScoresResponse>(
      `/scores/exam/${examId}/`
    )
    return response.data
  },

  /**
   * 시험 성적 통계 조회 (교사용)
   * GET /api/v1/scores/exam/{exam_id}/statistics/
   */
  getExamStatistics: async (examId: number): Promise<ExamStatistics> => {
    const response = await apiClient.get<ExamStatistics>(
      `/scores/exam/${examId}/statistics/`
    )
    return response.data
  },

  /**
   * 개별 학생 성적 상세 조회 (교사용)
   * GET /api/v1/scores/exam/{exam_id}/student/{student_id}/
   */
  getStudentScoreDetail: async (
    examId: number,
    studentId: number
  ): Promise<StudentScoreDetail> => {
    const response = await apiClient.get<StudentScoreDetail>(
      `/scores/exam/${examId}/student/${studentId}/`
    )
    return response.data
  },

  /**
   * 수동 채점 (교사용)
   * POST /api/v1/scores/{score_id}/grade/
   */
  manualGrade: async (
    scoreId: number,
    data: ManualGradeRequest
  ): Promise<ManualGradeResponse> => {
    const response = await apiClient.post<ManualGradeResponse>(
      `/scores/${scoreId}/grade/`,
      data
    )
    return response.data
  },
}
