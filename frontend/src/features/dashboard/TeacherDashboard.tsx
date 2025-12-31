import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { dashboardApi } from '@/api/dashboard'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingPage } from '@/components/ui/loading'
import {
  FileText,
  Files,
  Users,
  TrendingUp,
} from 'lucide-react'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animation'
import { cardHoverVariants } from '@/lib/animations'
import { InteractivePieChart, InteractiveBarChart } from '@/components/charts'
import type { PieChartDataItem, ChartDataItem } from '@/types/chart'


export function TeacherDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: dashboardApi.getTeacherDashboard,
  })

  if (isLoading) {
    return <LoadingPage message="대시보드를 불러오는 중..." fullScreen={false} />
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-semibold text-muted-foreground">
            대시보드 데이터를 불러올 수 없습니다.
          </p>
        </div>
      </div>
    )
  }

  // PieChart 데이터 준비 (0값은 차트에서 숨기고 Legend에서만 표시)
  const questionTypeData: PieChartDataItem[] = [
    { name: '객관식', value: dashboard.question_statistics.questions_by_type.xz ?? 0, type: 'xz' },
    { name: '빈칸채우기', value: dashboard.question_statistics.questions_by_type.tk ?? 0, type: 'tk' },
    { name: '주관식', value: dashboard.question_statistics.questions_by_type.pd ?? 0, type: 'pd' },
  ]

  // BarChart 데이터 준비
  const questionDifficultyData: ChartDataItem[] = [
    { name: '쉬움', value: dashboard.question_statistics.questions_by_difficulty.jd ?? 0, difficulty: 'jd' },
    { name: '보통', value: dashboard.question_statistics.questions_by_difficulty.zd ?? 0, difficulty: 'zd' },
    { name: '어려움', value: dashboard.question_statistics.questions_by_difficulty.kn ?? 0, difficulty: 'kn' },
  ]

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              환영합니다, {user?.nick_name || '선생님'}
            </h1>
            <p className="text-muted-foreground">
              {dashboard.ongoing_exams.length > 0
                ? `현재 ${dashboard.ongoing_exams.length}개의 시험이 진행 중입니다.`
                : '현재 진행 중인 시험이 없습니다.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/questions/new' })}
            >
              + 문제 추가
            </Button>
            <Button onClick={() => navigate({ to: '/examinations/new' })}>
              시험 생성
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem className="h-full">
            <motion.div
              className="relative h-full overflow-hidden rounded-lg border bg-card p-6"
              initial="rest"
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="absolute right-4 top-4 text-primary/10">
                <FileText className="h-16 w-16" />
              </div>
              <div className="relative">
                <div className="text-sm font-medium text-muted-foreground">
                  생성한 문제
                </div>
                <div className="mt-2 text-3xl font-bold">
                  {dashboard.question_statistics.total_questions}
                </div>
                <div className="mt-1 h-5 text-sm font-medium">
                  {dashboard.question_statistics.trend > 0 && (
                    <span className="text-green-600">
                      ↑ 이번 달 {dashboard.question_statistics.trend}개 추가
                    </span>
                  )}
                  {dashboard.question_statistics.trend < 0 && (
                    <span className="text-red-600">
                      ↓ 이번 달 {Math.abs(dashboard.question_statistics.trend)}개 감소
                    </span>
                  )}
                  {dashboard.question_statistics.trend === 0 && dashboard.question_statistics.total_questions === 0 && (
                    <span className="text-muted-foreground">
                      아직 문제가 없습니다
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </StaggerItem>

          <StaggerItem className="h-full">
            <motion.div
              className="relative h-full overflow-hidden rounded-lg border bg-card p-6"
              initial="rest"
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="absolute right-4 top-4 text-primary/10">
                <Files className="h-16 w-16" />
              </div>
              <div className="relative">
                <div className="text-sm font-medium text-muted-foreground">
                  시험지 수
                </div>
                <div className="mt-2 text-3xl font-bold text-primary">
                  {dashboard.testpaper_statistics?.total_testpapers ?? 0}
                </div>
                <div className="mt-1 h-5 text-sm font-medium">
                  {(dashboard.testpaper_statistics?.trend ?? 0) > 0 && (
                    <span className="text-green-600">
                      ↑ 이번 달 {dashboard.testpaper_statistics?.trend}개 추가
                    </span>
                  )}
                  {(dashboard.testpaper_statistics?.trend ?? 0) < 0 && (
                    <span className="text-red-600">
                      ↓ 이번 달 {Math.abs(dashboard.testpaper_statistics?.trend ?? 0)}개 감소
                    </span>
                  )}
                  {(dashboard.testpaper_statistics?.total_testpapers ?? 0) === 0 && (dashboard.testpaper_statistics?.trend ?? 0) === 0 && (
                    <span className="text-muted-foreground">
                      아직 시험지가 없습니다
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </StaggerItem>

          <StaggerItem className="h-full">
            <motion.div
              className="relative h-full overflow-hidden rounded-lg border bg-card p-6"
              initial="rest"
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="absolute right-4 top-4 text-primary/10">
                <Users className="h-16 w-16" />
              </div>
              <div className="relative">
                <div className="text-sm font-medium text-muted-foreground">
                  총 응시자
                </div>
                <div className="mt-2 text-3xl font-bold">
                  {dashboard.student_statistics.total_students}
                </div>
                <div className="mt-1 h-5 text-sm font-medium">
                  {dashboard.student_statistics.submissions_trend > 0 && (
                    <span className="text-green-600">
                      ↑ 이번 달 {dashboard.student_statistics.submissions_trend}명 응시
                    </span>
                  )}
                  {dashboard.student_statistics.submissions_trend < 0 && (
                    <span className="text-red-600">
                      ↓ 이번 달 {Math.abs(dashboard.student_statistics.submissions_trend)}명 감소
                    </span>
                  )}
                  {dashboard.student_statistics.submissions_trend === 0 && dashboard.student_statistics.total_students === 0 && (
                    <span className="text-muted-foreground">
                      아직 응시자가 없습니다
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </StaggerItem>

          <StaggerItem className="h-full">
            <motion.div
              className="relative h-full overflow-hidden rounded-lg border bg-card p-6"
              initial="rest"
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="absolute right-4 top-4 text-primary/10">
                <TrendingUp className="h-16 w-16" />
              </div>
              <div className="relative">
                <div className="text-sm font-medium text-muted-foreground">
                  평균 점수
                </div>
                <div className="mt-2 text-3xl font-bold text-green-600">
                  {dashboard.student_statistics.average_score.toFixed(1)}
                </div>
                <div className="mt-1 h-5 text-sm font-medium">
                  {dashboard.student_statistics.score_trend > 0 && (
                    <span className="text-green-600">
                      ↑ 이번 달 {dashboard.student_statistics.score_trend.toFixed(1)}점 상승
                    </span>
                  )}
                  {dashboard.student_statistics.score_trend < 0 && (
                    <span className="text-red-600">
                      ↓ 이번 달 {Math.abs(dashboard.student_statistics.score_trend).toFixed(1)}점 하락
                    </span>
                  )}
                  {dashboard.student_statistics.score_trend === 0 && dashboard.student_statistics.total_submissions === 0 && (
                    <span className="text-muted-foreground">
                      아직 점수 데이터가 없습니다
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </StaggerItem>
        </StaggerContainer>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart - Question Types */}
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

          {/* Bar Chart - Question Difficulty */}
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

        {/* Recent Questions & Ongoing Exams */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Questions */}
          <FadeIn type="slideUp" delay={0.1}>
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">최근 생성한 문제</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/questions' })}
              >
                전체 보기
              </Button>
            </div>

            {dashboard.recent_questions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                생성한 문제가 없습니다.
              </p>
            ) : (
              <StaggerContainer className="space-y-3" delay={0.2}>
                {dashboard.recent_questions.slice(0, 5).map((question) => (
                  <StaggerItem key={question.id}>
                    <motion.div
                      className="flex items-center justify-between rounded-lg border p-3 cursor-pointer"
                      onClick={() => navigate({ to: `/questions/${question.id}` })}
                      initial="rest"
                      whileHover="hover"
                      variants={cardHoverVariants}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{question.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {question.subject.subject_name} • {question.score}점
                        </div>
                      </div>
                      {question.is_share && (
                        <Badge variant="success">공유됨</Badge>
                      )}
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
            </div>
          </FadeIn>

          {/* Ongoing Exams */}
          <FadeIn type="slideUp" delay={0.2}>
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">진행 중인 시험</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/examinations' })}
              >
                전체 보기
              </Button>
            </div>

            {dashboard.ongoing_exams.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                진행 중인 시험이 없습니다.
              </p>
            ) : (
              <StaggerContainer className="space-y-3" delay={0.2}>
                {dashboard.ongoing_exams.slice(0, 5).map((exam) => (
                  <StaggerItem key={exam.id}>
                    <motion.div
                      className="flex items-center justify-between rounded-lg border p-3 cursor-pointer"
                      onClick={() => navigate({ to: `/examinations/${exam.id}` })}
                      initial="rest"
                      whileHover="hover"
                      variants={cardHoverVariants}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{exam.exam_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {exam.testpaper.name} • {exam.testpaper.question_count}문제
                        </div>
                        <div className="text-sm text-muted-foreground">
                          종료: {new Date(exam.end_time).toLocaleString('ko-KR')}
                        </div>
                      </div>
                      <Badge variant="primary">진행중</Badge>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
            </div>
          </FadeIn>
        </div>

        {/* Recent Submissions */}
        <FadeIn type="slideUp" delay={0.1}>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">최근 제출된 시험</h2>

          {dashboard.student_statistics.recent_submissions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              제출된 시험이 없습니다.
            </p>
          ) : (
            <StaggerContainer className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" delay={0.2}>
              {dashboard.student_statistics.recent_submissions
                .slice(0, 6)
                .map((submission) => (
                  <StaggerItem key={submission.id}>
                    <motion.div
                      className="rounded-lg border p-3 cursor-pointer"
                      initial="rest"
                      whileHover="hover"
                      variants={cardHoverVariants}
                    >
                      <div className="font-medium">
                        {submission.student.nick_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {submission.examination.exam_name}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {new Date(submission.submitted_at).toLocaleDateString(
                            'ko-KR'
                          )}
                        </div>
                        <div className="text-lg font-bold">
                          {submission.score}/{submission.total_score}
                        </div>
                      </div>
                    </motion.div>
                  </StaggerItem>
                ))}
            </StaggerContainer>
          )}
          </div>
        </FadeIn>
      </div>
  )
}
