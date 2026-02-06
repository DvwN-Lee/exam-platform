/**
 * Student API service
 */

import apiClient from './client'
import type { StudentDetail, StudentListResponse, StudentListParams } from '../types/student'

/**
 * 학생 목록 조회 (교사 전용)
 */
export const getStudents = async (params?: StudentListParams): Promise<StudentListResponse> => {
  const response = await apiClient.get<StudentListResponse>('/students/', { params })
  return response.data
}

/**
 * 학생 상세 조회 (교사 전용)
 */
export const getStudent = async (id: number): Promise<StudentDetail> => {
  const response = await apiClient.get<StudentDetail>(`/students/${id}/`)
  return response.data
}
