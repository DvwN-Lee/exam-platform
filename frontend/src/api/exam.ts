import apiClient from './client'
import type {
  StartExamResponse,
  SubmitExamRequest,
  ExamSubmission,
  SaveAnswerRequest,
  ExamResult,
  ExamInfo,
} from '@/types/exam'
import type { ExaminationListResponse } from '@/types/testpaper'

export const examApi = {
  // 응시 가능한 시험 목록 조회
  getAvailableExams: async (): Promise<ExaminationListResponse> => {
    const response = await apiClient.get<ExaminationListResponse>(
      '/exams/available/'
    )
    return response.data
  },

  // 시험 정보 및 문제 조회 (응시용)
  getExamInfo: async (examinationId: number): Promise<ExamInfo> => {
    const response = await apiClient.get<ExamInfo>(
      `/exams/${examinationId}/info/`
    )
    return response.data
  },

  // 시험 시작
  startExam: async (examinationId: number): Promise<StartExamResponse> => {
    const response = await apiClient.post<StartExamResponse>(
      `/exams/${examinationId}/start/`
    )
    return response.data
  },

  // 답안 임시 저장
  saveAnswer: async (
    examinationId: number,
    data: SaveAnswerRequest
  ): Promise<void> => {
    await apiClient.post(`/exams/${examinationId}/save-answer/`, data)
  },

  // 시험 제출
  submitExam: async (
    examinationId: number,
    data: SubmitExamRequest
  ): Promise<ExamSubmission> => {
    const response = await apiClient.post<ExamSubmission>(
      `/exams/${examinationId}/submit/`,
      data
    )
    return response.data
  },

  // 제출한 시험 목록 조회
  getMySubmissions: async (): Promise<ExamSubmission[]> => {
    const response = await apiClient.get<ExamSubmission[]>(
      '/submissions/my/'
    )
    return response.data
  },

  // 시험 결과 조회
  getExamResult: async (examinationId: number): Promise<ExamResult> => {
    const response = await apiClient.get<ExamResult>(
      `/exams/${examinationId}/result/`
    )
    return response.data
  },

  // 진행 중인 시험 조회
  getOngoingSubmission: async (
    examinationId: number
  ): Promise<ExamSubmission | null> => {
    try {
      const response = await apiClient.get<ExamSubmission>(
        `/exams/${examinationId}/status/`
      )
      return response.data
    } catch (error) {
      return null
    }
  },
}
