import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import apiClient from '@/api/client'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animation'
import { InteractivePieChart, InteractiveBarChart } from '@/components/charts'
import type { PieChartDataItem, ChartDataItem } from '@/types/chart'
import { motion } from 'framer-motion'
import { cardHoverVariants } from '@/lib/animations'
import { FileText, Users, TrendingUp, CheckCircle2 } from 'lucide-react'

export function AnalyticsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/teacher/')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  // Chart data preparation
  const questionTypeData: PieChartDataItem[] = [
    { name: '객관식', value: data?.question_statistics?.questions_by_type?.xz || 0, type: 'xz' },
    { name: '빈칸채우기', value: data?.question_statistics?.questions_by_type?.tk || 0, type: 'tk' },
    { name: '주관식', value: data?.question_statistics?.questions_by_type?.pd || 0, type: 'pd' },
  ]

  const questionDifficultyData: ChartDataItem[] = [
    { name: '쉬움', value: data?.question_statistics?.questions_by_difficulty?.jd || 0, difficulty: 'jd' },
    { name: '보통', value: data?.question_statistics?.questions_by_difficulty?.zd || 0, difficulty: 'zd' },
    { name: '어려움', value: data?.question_statistics?.questions_by_difficulty?.kn || 0, difficulty: 'kn' },
  ]

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">통계 분석</h1>
          <p className="text-muted-foreground">시험 및 문제 통계를 확인합니다</p>
        </div>

        {/* Statistics Cards */}
        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <motion.div
              className="relative overflow-hidden rounded-lg border bg-card p-6"
              initial="rest"
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="absolute right-4 top-4 text-primary/10">
                <FileText className="h-12 w-12" />
              </div>
              <div className="relative">
                <div className="text-sm font-medium text-muted-foreground">총 문제 수</div>
                <div className="mt-2 text-3xl font-bold">
                  {data?.question_statistics?.total_questions || 0}
                </div>
              </div>
            </motion.div>
          </StaggerItem>

          <StaggerItem>
            <motion.div
              className="relative overflow-hidden rounded-lg border bg-card p-6"
              initial="rest"
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="absolute right-4 top-4 text-primary/10">
                <Users className="h-12 w-12" />
              </div>
              <div className="relative">
                <div className="text-sm font-medium text-muted-foreground">총 응시자</div>
                <div className="mt-2 text-3xl font-bold">
                  {data?.student_statistics?.total_students || 0}
                </div>
              </div>
            </motion.div>
          </StaggerItem>

          <StaggerItem>
            <motion.div
              className="relative overflow-hidden rounded-lg border bg-card p-6"
              initial="rest"
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="absolute right-4 top-4 text-primary/10">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div className="relative">
                <div className="text-sm font-medium text-muted-foreground">총 응시 횟수</div>
                <div className="mt-2 text-3xl font-bold text-primary">
                  {data?.student_statistics?.total_submissions || 0}
                </div>
              </div>
            </motion.div>
          </StaggerItem>

          <StaggerItem>
            <motion.div
              className="relative overflow-hidden rounded-lg border bg-card p-6"
              initial="rest"
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="absolute right-4 top-4 text-primary/10">
                <TrendingUp className="h-12 w-12" />
              </div>
              <div className="relative">
                <div className="text-sm font-medium text-muted-foreground">평균 점수</div>
                <div className="mt-2 text-3xl font-bold text-green-600">
                  {data?.student_statistics?.average_score?.toFixed(1) || '0.0'}점
                </div>
              </div>
            </motion.div>
          </StaggerItem>
        </StaggerContainer>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <FadeIn type="slideUp" delay={0.1}>
            <InteractivePieChart
              data={questionTypeData}
              title="문제 유형 분포"
              height={300}
              hideZeroValues={true}
              enableLegendToggle={true}
              emptyMessage="문제를 생성하면 유형 분포가 표시됩니다"
              className="h-full"
              onSliceClick={(event) => {
                const typeCode = event.data.type as string
                if (typeCode) {
                  navigate({ to: '/questions', search: { type: typeCode } })
                }
              }}
            />
          </FadeIn>

          <FadeIn type="slideUp" delay={0.2}>
            <InteractiveBarChart
              data={questionDifficultyData}
              title="문제 난이도 분포"
              height={300}
              emptyMessage="문제를 생성하면 난이도 분포가 표시됩니다"
              className="h-full"
              onBarClick={(event) => {
                const difficultyCode = event.data.difficulty as string
                if (difficultyCode) {
                  navigate({ to: '/questions', search: { difficulty: difficultyCode } })
                }
              }}
            />
          </FadeIn>
        </div>

        <FadeIn type="slideUp" delay={0.1}>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">최근 문제</h2>
            {data?.recent_questions && data.recent_questions.length > 0 ? (
              <StaggerContainer className="space-y-3" delay={0.2}>
                {data.recent_questions.map((question: any) => (
                  <StaggerItem key={question.id}>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium">{question.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {question.subject?.subject_name || question.subject} • {question.type} • {question.score}점
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(question.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            ) : (
              <p className="text-center text-muted-foreground">생성한 문제가 없습니다.</p>
            )}
          </div>
        </FadeIn>

        <FadeIn type="slideUp" delay={0.2}>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">진행 중인 시험</h2>
            {data?.ongoing_exams && data.ongoing_exams.length > 0 ? (
              <StaggerContainer className="space-y-3" delay={0.2}>
                {data.ongoing_exams.map((exam: any) => (
                  <StaggerItem key={exam.id}>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium">{exam.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {exam.subject?.subject_name || exam.subject} • {exam.student_count}명 응시
                        </div>
                      </div>
                      <div className="rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                        진행중
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            ) : (
              <p className="text-center text-muted-foreground">
                진행 중인 시험이 없습니다.
              </p>
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  )
}
