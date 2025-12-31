import apiClient from './client'
import type {
  Question,
  QuestionListResponse,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  QuestionFilters,
  Subject,
} from '@/types/question'

export const questionApi = {
  // 문제 목록 조회
  getQuestions: async (filters?: QuestionFilters): Promise<QuestionListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }

    const response = await apiClient.get<QuestionListResponse>(
      `/questions?${params.toString()}`
    )
    return response.data
  },

  // 내 문제 목록
  getMyQuestions: async (filters?: QuestionFilters): Promise<QuestionListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }

    const response = await apiClient.get<QuestionListResponse>(
      `/questions/my?${params.toString()}`
    )
    return response.data
  },

  // 공유된 문제 목록
  getSharedQuestions: async (filters?: QuestionFilters): Promise<QuestionListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }

    const response = await apiClient.get<QuestionListResponse>(
      `/questions/shared?${params.toString()}`
    )
    return response.data
  },

  // 문제 상세 조회
  getQuestion: async (id: number): Promise<Question> => {
    const response = await apiClient.get<Question>(`/questions/${id}`)
    return response.data
  },

  // 문제 생성
  createQuestion: async (data: CreateQuestionRequest): Promise<Question> => {
    const response = await apiClient.post<Question>('/questions/', data)
    return response.data
  },

  // 문제 수정
  updateQuestion: async (id: number, data: UpdateQuestionRequest): Promise<Question> => {
    const response = await apiClient.patch<Question>(`/questions/${id}`, data)
    return response.data
  },

  // 문제 삭제
  deleteQuestion: async (id: number): Promise<void> => {
    await apiClient.delete(`/questions/${id}`)
  },

  // 문제 공유 설정
  shareQuestion: async (id: number, isShare: boolean): Promise<{ status: string }> => {
    const response = await apiClient.post<{ status: string }>(
      `/questions/${id}/share`,
      { is_share: isShare }
    )
    return response.data
  },

  // 과목 목록
  getSubjects: async (): Promise<Subject[]> => {
    const response = await apiClient.get<{ results: Subject[] }>('/subjects/')
    return response.data.results
  },
}
