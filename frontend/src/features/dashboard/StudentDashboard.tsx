import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { dashboardApi } from '@/api/dashboard'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'
import { DDayBadge } from '@/components/ui/badge'
import { LearningProgress } from '@/components/ui/progress'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { CheckCircle2, TrendingUp, Calendar } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/animation'
import { cardHoverVariants } from '@/lib/animations'

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

  // 과목별 점수 데이터 (Vertical Bar Chart용)
  const subjectScores = [
    { subject: '수학', score: 85, color: '#10b981' },
    { subject: '영어', score: 92, color: '#3b82f6' },
    { subject: '과학', score: 78, color: '#f59e0b' },
    { subject: '국어', score: 88, color: '#8b5cf6' },
    { subject: '사회', score: 95, color: '#ec4899' },
  ]

  // 학습 진행률 데이터
  const learningProgressData = [
    { subject: '자료구조', percentage: 75, completed: 15, total: 20 },
    { subject: 'Algorithm', percentage: 60, completed: 12, total: 20 },
    { subject: 'Database', percentage: 90, completed: 18, total: 20 },
  ]

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
                <div className="mt-1 text-sm font-medium text-green-600">
                  ↑ 지난달 대비 +3개
                </div>
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
                <div className="mt-1 text-sm font-medium text-green-600">
                  ↑ +2.3점 향상
                </div>
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

        {/* 과목별 점수 Bar Chart */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-6 text-xl font-semibold">과목별 최근 성적</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subjectScores}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="subject"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 14 }}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 14 }}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                isAnimationActive={true}
                animationDuration={200}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey="score"
                radius={[8, 8, 0, 0]}
                barSize={60}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {subjectScores.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Submissions */}
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

          {/* Upcoming Exams */}
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
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Wrong Questions */}
          {dashboard.wrong_questions.length > 0 && (
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
          )}

          {/* Learning Progress */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">학습 진행률</h2>
              <span className="text-sm text-muted-foreground">
                과목별 강의 완료 현황
              </span>
            </div>

            <div className="space-y-6">
              {learningProgressData.map((item) => (
                <LearningProgress
                  key={item.subject}
                  subject={item.subject}
                  percentage={item.percentage}
                  completed={item.completed}
                  total={item.total}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
  )
}
