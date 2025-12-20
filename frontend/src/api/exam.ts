import apiClient from './client'
import type {
  StartExamResponse,
  SubmitExamRequest,
  ExamSubmission,
  SaveAnswerRequest,
  ExamResult,
} from '@/types/exam'
import type { ExaminationListResponse } from '@/types/testpaper'

export const examApi = {
  // 응시 가능한 시험 목록 조회
  getAvailableExams: async (): Promise<ExaminationListResponse> => {
    const response = await apiClient.get<ExaminationListResponse>(
      '/api/v1/exams/available/'
    )
    return response.data
  },

  // 시험 시작
  startExam: async (examinationId: number): Promise<StartExamResponse> => {
    const response = await apiClient.post<StartExamResponse>(
      `/api/v1/examinations/${examinationId}/start/`
    )
    return response.data
  },

  // 답안 임시 저장
  saveAnswer: async (
    submissionId: number,
    data: SaveAnswerRequest
  ): Promise<void> => {
    await apiClient.post(`/api/v1/submissions/${submissionId}/save-answer/`, data)
  },

  // 시험 제출
  submitExam: async (
    submissionId: number,
    data: SubmitExamRequest
  ): Promise<ExamSubmission> => {
    const response = await apiClient.post<ExamSubmission>(
      `/api/v1/submissions/${submissionId}/submit/`,
      data
    )
    return response.data
  },

  // 제출한 시험 목록 조회
  getMySubmissions: async (): Promise<ExamSubmission[]> => {
    const response = await apiClient.get<ExamSubmission[]>(
      '/api/v1/submissions/my/'
    )
    return response.data
  },

  // 시험 결과 조회
  getExamResult: async (submissionId: number): Promise<ExamResult> => {
    const response = await apiClient.get<ExamResult>(
      `/api/v1/submissions/${submissionId}/result/`
    )
    return response.data
  },

  // 진행 중인 시험 조회
  getOngoingSubmission: async (
    examinationId: number
  ): Promise<ExamSubmission | null> => {
    try {
      const response = await apiClient.get<ExamSubmission>(
        `/api/v1/examinations/${examinationId}/ongoing/`
      )
      return response.data
    } catch (error) {
      return null
    }
  },
}
