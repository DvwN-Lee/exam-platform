import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { dashboardApi } from '@/api/dashboard'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'
import { DDayBadge } from '@/components/ui/badge'
import { CheckCircle2, TrendingUp, Calendar } from 'lucide-react'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animation'
import { cardHoverVariants } from '@/lib/animations'
import { ScoreTrendChart } from '@/components/charts'
import type { ScoreTrendDataItem } from '@/types/chart'

export function StudentDashboard() {
  const navigate = useNavigate()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: dashboardApi.getStudentDashboard,
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

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">학생 대시보드</h1>
            <p className="text-muted-foreground">학습 현황을 한눈에 확인하세요</p>
          </div>
          <Button onClick={() => navigate({ to: '/exams' })}>
            시험 보러 가기
          </Button>
        </div>

        {/* Statistics Cards */}
        <StaggerContainer className="grid gap-6 md:grid-cols-3">
          {/* 완료한 시험 */}
          <StaggerItem>
            <motion.div
              className="relative overflow-hidden rounded-lg border bg-card p-6"
              initial="rest"
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="absolute right-4 top-4 text-primary/10">
                <CheckCircle2 className="h-16 w-16" />
              </div>
              <div className="relative">
                <div className="text-sm font-medium text-muted-foreground">
                  완료한 시험
                </div>
                <div className="mt-2 text-3xl font-bold">
                  {dashboard.statistics.total_exams_taken}
                </div>
                {dashboard.statistics.exams_trend > 0 && (
                  <div className="mt-1 text-sm font-medium text-green-600">
                    ↑ 이번 달 {dashboard.statistics.exams_trend}개 응시
                  </div>
                )}
                {dashboard.statistics.exams_trend < 0 && (
                  <div className="mt-1 text-sm font-medium text-red-600">
                    ↓ 지난달 대비 {Math.abs(dashboard.statistics.exams_trend)}개 감소
                  </div>
                )}
                {dashboard.statistics.exams_trend === 0 && dashboard.statistics.total_exams_taken === 0 && (
                  <div className="mt-1 text-sm font-medium text-muted-foreground">
                    아직 응시한 시험이 없습니다
                  </div>
                )}
              </div>
            </motion.div>
          </StaggerItem>

          {/* 평균 점수 */}
          <StaggerItem>
            <motion.div
              className="relative overflow-hidden rounded-lg border bg-card p-6"
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
                <div className="mt-2 text-3xl font-bold text-primary">
                  {dashboard.statistics.average_score.toFixed(1)}점
                </div>
                {dashboard.statistics.avg_score_trend > 0 && (
                  <div className="mt-1 text-sm font-medium text-green-600">
                    ↑ 이번 달 {dashboard.statistics.avg_score_trend.toFixed(1)}점 상승
                  </div>
                )}
                {dashboard.statistics.avg_score_trend < 0 && (
                  <div className="mt-1 text-sm font-medium text-red-600">
                    ↓ 이번 달 {Math.abs(dashboard.statistics.avg_score_trend).toFixed(1)}점 하락
                  </div>
                )}
                {dashboard.statistics.avg_score_trend === 0 && dashboard.statistics.total_exams_taken === 0 && (
                  <div className="mt-1 text-sm font-medium text-muted-foreground">
                    아직 성적 데이터가 없습니다
                  </div>
                )}
              </div>
            </motion.div>
          </StaggerItem>

          {/* 예정된 시험 */}
          <StaggerItem>
            <motion.div
              className="relative overflow-hidden rounded-lg border bg-card p-6"
              initial="rest"
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="absolute right-4 top-4 text-primary/10">
                <Calendar className="h-16 w-16" />
              </div>
              <div className="relative">
                <div className="text-sm font-medium text-muted-foreground">
                  예정된 시험
                </div>
                <div className="mt-2 text-3xl font-bold">
                  {dashboard.upcoming_exams.length}
                </div>
                {dashboard.upcoming_exams.length > 0 && (
                  <div className="mt-1 text-sm font-medium text-orange-600">
                    다음 시험:{' '}
                    {new Date(
                      dashboard.upcoming_exams[0].start_time
                    ).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </StaggerItem>
        </StaggerContainer>

        {/* Score Trend Chart */}
        {dashboard.score_trend.length > 0 && (
          <FadeIn type="slideUp" delay={0.1}>
            <ScoreTrendChart
              data={dashboard.score_trend.map((item): ScoreTrendDataItem => ({
                date: item.date,
                score: item.score,
                total_score: item.total_score,
                percentage: item.percentage,
                exam_name: item.exam_name,
              }))}
              title="점수 추이"
              height={300}
              showPercentage={true}
              showAverageLine={true}
              onPointClick={(data) => {
                // 시험 결과 페이지로 이동 (examination_id가 있다면)
                const submission = dashboard.recent_submissions.find(
                  (s) => s.examination.exam_name === data.exam_name
                )
                if (submission) {
                  navigate({ to: `/exams/${submission.examination.id}/result` })
                }
              }}
            />
          </FadeIn>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Submissions */}
          <FadeIn type="slideUp" delay={0.2}>
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">최근 시험 성적</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/exams/results' })}
              >
                전체 보기
              </Button>
            </div>

            {dashboard.recent_submissions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                응시한 시험이 없습니다.
              </p>
            ) : (
              <StaggerContainer className="space-y-3" delay={0.2}>
                {dashboard.recent_submissions.slice(0, 5).map((submission) => (
                  <StaggerItem key={submission.id}>
                    <motion.div
                      className="flex items-center justify-between rounded-lg border p-3 cursor-pointer"
                      onClick={() =>
                        navigate({ to: `/exams/${submission.examination.id}/result` })
                      }
                      initial="rest"
                      whileHover="hover"
                      variants={cardHoverVariants}
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {submission.examination.exam_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(submission.submitted_at).toLocaleDateString(
                            'ko-KR'
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {submission.score} / {submission.total_score}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(
                            (submission.score / submission.total_score) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
            </div>
          </FadeIn>

          {/* Upcoming Exams */}
          <FadeIn type="slideUp" delay={0.2}>
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">응시 예정 시험</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/exams' })}
              >
                전체 보기
              </Button>
            </div>

            {dashboard.upcoming_exams.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                예정된 시험이 없습니다.
              </p>
            ) : (
              <StaggerContainer className="space-y-3" delay={0.2}>
                {dashboard.upcoming_exams.slice(0, 5).map((exam) => {
                  const startTime = new Date(exam.start_time)
                  const now = new Date()
                  const isOngoing = now >= startTime && now <= new Date(exam.end_time)

                  return (
                    <StaggerItem key={exam.id}>
                      <motion.div
                        className="rounded-lg border p-3 cursor-pointer"
                        onClick={() => navigate({ to: `/examinations/${exam.id}` })}
                        initial="rest"
                        whileHover="hover"
                        variants={cardHoverVariants}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{exam.exam_name}</div>
                          <DDayBadge targetDate={exam.start_time} />
                          <Button
                            size="sm"
                            variant={isOngoing ? 'default' : 'outline'}
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate({ to: `/exams/${exam.id}/take` })
                            }}
                          >
                            {isOngoing ? '응시하기' : '시험 시작'}
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {exam.testpaper.subject.subject_name} •{' '}
                          {exam.testpaper.question_count}문제
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {startTime.toLocaleString('ko-KR')}
                        </div>
                      </motion.div>
                    </StaggerItem>
                  )
                })}
              </StaggerContainer>
            )}
            </div>
          </FadeIn>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Wrong Questions */}
          {dashboard.wrong_questions.length > 0 && (
            <FadeIn type="slideUp" delay={0.1}>
              <div className="rounded-lg border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">오답 문제 복습</h2>
                <span className="text-sm text-muted-foreground">
                  {dashboard.wrong_questions.length}개
                </span>
              </div>

              <StaggerContainer className="grid gap-3" delay={0.2}>
                {dashboard.wrong_questions.slice(0, 6).map((question) => (
                  <StaggerItem key={question.id}>
                    <motion.div
                      className="rounded-lg border p-3 cursor-pointer"
                      onClick={() => navigate({ to: `/questions/${question.id}` })}
                      initial="rest"
                      whileHover="hover"
                      variants={cardHoverVariants}
                    >
                      <div className="font-medium">{question.name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {question.subject.subject_name} • {question.score}점
                      </div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
              </div>
            </FadeIn>
          )}

        </div>
      </div>
  )
}
