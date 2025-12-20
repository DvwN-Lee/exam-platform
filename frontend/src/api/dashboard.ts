import apiClient from './client'
import type { StudentDashboard, TeacherDashboard } from '@/types/dashboard'

export const dashboardApi = {
  // 학생 대시보드 데이터 조회
  getStudentDashboard: async (): Promise<StudentDashboard> => {
    const response = await apiClient.get<StudentDashboard>(
      '/api/v1/dashboard/student/'
    )
    return response.data
  },

  // 교사 대시보드 데이터 조회
  getTeacherDashboard: async (): Promise<TeacherDashboard> => {
    const response = await apiClient.get<TeacherDashboard>(
      '/api/v1/dashboard/teacher/'
    )
    return response.data
  },
}
