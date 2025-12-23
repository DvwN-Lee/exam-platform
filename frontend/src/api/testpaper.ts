import apiClient from './client'
import type {
  TestPaper,
  TestPaperListResponse,
  CreateTestPaperRequest,
  UpdateTestPaperRequest,
  Examination,
  ExaminationListResponse,
  CreateExaminationRequest,
  UpdateExaminationRequest,
  ExaminationFilters,
} from '@/types/testpaper'

export const testPaperApi = {
  // 시험지 목록 조회
  getTestPapers: async (page?: number): Promise<TestPaperListResponse> => {
    const params = new URLSearchParams()
    if (page) params.append('page', String(page))

    const response = await apiClient.get<TestPaperListResponse>(
      `/testpapers/?${params.toString()}`
    )
    return response.data
  },

  // 시험지 상세 조회
  getTestPaper: async (id: number): Promise<TestPaper> => {
    const response = await apiClient.get<TestPaper>(`/testpapers/${id}`)
    return response.data
  },

  // 시험지 생성
  createTestPaper: async (data: CreateTestPaperRequest): Promise<TestPaper> => {
    const response = await apiClient.post<TestPaper>('/testpapers/', data)
    return response.data
  },

  // 시험지 수정
  updateTestPaper: async (
    id: number,
    data: UpdateTestPaperRequest
  ): Promise<TestPaper> => {
    const response = await apiClient.patch<TestPaper>(
      `/testpapers/${id}`,
      data
    )
    return response.data
  },

  // 시험지 삭제
  deleteTestPaper: async (id: number): Promise<void> => {
    await apiClient.delete(`/testpapers/${id}`)
  },

  // 시험지에 문제 추가
  addQuestionToTestPaper: async (
    id: number,
    questionId: number,
    score: number,
    order: number
  ): Promise<TestPaper> => {
    const response = await apiClient.post<TestPaper>(
      `/testpapers/${id}/add_questions/`,
      {
        questions: [
          {
            test_question_id: questionId,
            score,
            order,
          },
        ],
      }
    )
    return response.data
  },

  // 시험지에서 문제 제거
  removeQuestionFromTestPaper: async (
    id: number,
    questionId: number
  ): Promise<void> => {
    await apiClient.delete(`/testpapers/${id}/remove-question/${questionId}/`)
  },
}

export const examinationApi = {
  // 시험 목록 조회
  getExaminations: async (
    filters?: ExaminationFilters
  ): Promise<ExaminationListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }

    const response = await apiClient.get<ExaminationListResponse>(
      `/examinations/?${params.toString()}`
    )
    return response.data
  },

  // 시험 상세 조회
  getExamination: async (id: number): Promise<Examination> => {
    const response = await apiClient.get<Examination>(`/examinations/${id}`)
    return response.data
  },

  // 시험 생성
  createExamination: async (data: CreateExaminationRequest): Promise<Examination> => {
    const response = await apiClient.post<Examination>('/examinations/', data)
    return response.data
  },

  // 시험 수정
  updateExamination: async (
    id: number,
    data: UpdateExaminationRequest
  ): Promise<Examination> => {
    const response = await apiClient.patch<Examination>(
      `/examinations/${id}`,
      data
    )
    return response.data
  },

  // 시험 삭제
  deleteExamination: async (id: number): Promise<void> => {
    await apiClient.delete(`/examinations/${id}`)
  },

  // 시험 게시
  publishExamination: async (id: number): Promise<Examination> => {
    const response = await apiClient.post<Examination>(
      `/examinations/${id}/publish`
    )
    return response.data
  },
}
