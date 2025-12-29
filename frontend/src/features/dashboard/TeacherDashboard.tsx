import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { dashboardApi } from '@/api/dashboard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingPage } from '@/components/ui/loading'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  getScoreColor,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  FileText,
  Files,
  Users,
  TrendingUp,
  CheckCircle,
  FilePlus,
  UserPlus,
  Clock,
} from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/animation'
import { cardHoverVariants } from '@/lib/animations'
import { CHART_COLORS, CHART_STYLES } from '@/constants/theme'

// Tooltip 공통 스타일 (리렌더링 방지를 위해 컴포넌트 외부 선언)
const tooltipStyle = CHART_STYLES.tooltip

// Mock data for new sections (이 부분은 실제 API 연동 시 제거)
const mockExamResults = [
  {
    id: 1,
    name: '자료구조 중간고사',
    subject: '자료구조 및 알고리즘',
    students: 87,
    avgScore: 85.2,
    passRate: 92,
    status: 'ongoing',
  },
  {
    id: 2,
    name: '데이터베이스 기말고사',
    subject: '데이터베이스 설계',
    students: 124,
    avgScore: 78.5,
    passRate: 88,
    status: 'completed',
  },
  {
    id: 3,
    name: '알고리즘 실습 평가',
    subject: '고급 알고리즘',
    students: 65,
    avgScore: 88.7,
    passRate: 95,
    status: 'completed',
  },
  {
    id: 4,
    name: '운영체제 중간고사',
    subject: '운영체제',
    students: 92,
    avgScore: 72.3,
    passRate: 75,
    status: 'upcoming',
  },
  {
    id: 5,
    name: '네트워크 과제 평가',
    subject: '컴퓨터 네트워크',
    students: 78,
    avgScore: 90.1,
    passRate: 97,
    status: 'completed',
  },
]

const mockActivities = [
  {
    id: 1,
    type: 'success',
    icon: CheckCircle,
    title: '자동 채점 완료',
    description: '자료구조 중간고사 87명 채점 완료',
    time: '5분 전',
  },
  {
    id: 2,
    type: 'primary',
    icon: FilePlus,
    title: '새 문제 추가',
    description: '데이터베이스 실습 문제 12개 추가',
    time: '1시간 전',
  },
  {
    id: 3,
    type: 'warning',
    icon: UserPlus,
    title: '학생 등록',
    description: '알고리즘 실습 시험 등록 완료',
    time: '3시간 전',
  },
  {
    id: 4,
    type: 'success',
    icon: CheckCircle,
    title: '시험 종료',
    description: '알고리즘 실습 시험 종료됨',
    time: '5시간 전',
  },
  {
    id: 5,
    type: 'primary',
    icon: FilePlus,
    title: '시험지 생성',
    description: '운영체제 기말고사 시험지 생성',
    time: '1일 전',
  },
]

export function TeacherDashboard() {
  const navigate = useNavigate()

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

  const questionTypeData = [
    { name: '객관식', value: dashboard.question_statistics.questions_by_type.xz },
    { name: '주관식', value: dashboard.question_statistics.questions_by_type.pd },
    {
      name: '빈칸채우기',
      value: dashboard.question_statistics.questions_by_type.tk,
    },
  ]

  const questionDifficultyData = [
    { name: '쉬움', value: dashboard.question_statistics.questions_by_difficulty.jd },
    { name: '보통', value: dashboard.question_statistics.questions_by_difficulty.zd },
    { name: '어려움', value: dashboard.question_statistics.questions_by_difficulty.kn },
  ]

  // 점수 분포 데이터 (Mock - 실제로는 API에서 가져와야 함)
  const scoreDistributionData = [
    { range: '90-100점 (우수)', count: 245, percentage: 35, color: 'excellent' },
    { range: '80-89점 (양호)', count: 312, percentage: 45, color: 'good' },
    { range: '70-79점 (보통)', count: 98, percentage: 14, color: 'average' },
    { range: '60점 미만 (미흡)', count: 42, percentage: 6, color: 'poor' },
  ]

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">환영합니다, 박교수님</h1>
            <p className="text-muted-foreground">
              현재 3개의 시험이 진행 중이며, 새로운 알림이 5개 있습니다.
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
          <StaggerItem>
            <motion.div
              className="relative overflow-hidden rounded-lg border bg-card p-6"
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
                <div className="mt-1 text-sm text-green-600 font-medium">
                  ↑ 12개 증가
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
                <Files className="h-16 w-16" />
              </div>
              <div className="relative">
                <div className="text-sm font-medium text-muted-foreground">
                  시험지 수
                </div>
                <div className="mt-2 text-3xl font-bold text-primary">18</div>
                <div className="mt-1 text-sm text-green-600 font-medium">
                  ↑ 3개 추가
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
                <Users className="h-16 w-16" />
              </div>
              <div className="relative">
                <div className="text-sm font-medium text-muted-foreground">
                  총 응시자
                </div>
                <div className="mt-2 text-3xl font-bold">
                  {dashboard.student_statistics.total_students}
                </div>
                <div className="mt-1 text-sm text-green-600 font-medium">
                  ↑ 156명 증가
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
                <TrendingUp className="h-16 w-16" />
              </div>
              <div className="relative">
                <div className="text-sm font-medium text-muted-foreground">
                  평균 점수
                </div>
                <div className="mt-2 text-3xl font-bold text-green-600">
                  {dashboard.student_statistics.average_score.toFixed(1)}
                </div>
                <div className="mt-1 text-sm text-red-600 font-medium">
                  ↓ 1.2점 감소
                </div>
              </div>
            </motion.div>
          </StaggerItem>
        </StaggerContainer>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Charts Section */}
          <div className="space-y-6">
            {/* Pie Chart - Question Types */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">문제 유형 분포</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={questionTypeData}
                    cx="40%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {questionTypeData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS.pie[index % CHART_COLORS.pie.length]}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    isAnimationActive={true}
                    animationDuration={200}
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [`${value}개`, name]}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value: string) => {
                      const item = questionTypeData.find((d) => d.name === value)
                      return `${value}: ${item?.value || 0}개`
                    }}
                    wrapperStyle={{ paddingLeft: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart - Question Difficulty */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">문제 난이도 분포</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={questionDifficultyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 14 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 14 }}
                  />
                  <Tooltip
                    isAnimationActive={true}
                    animationDuration={200}
                    cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value}개`, '문제 수']}
                  />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {questionDifficultyData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS.difficulty[index % CHART_COLORS.difficulty.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column - Activity & Score Distribution */}
          <div className="space-y-6">
            {/* Activity Timeline */}
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">최근 활동</h2>
                <Button variant="ghost" size="sm">
                  전체 보기 →
                </Button>
              </div>

              <StaggerContainer className="space-y-3" delay={0.2}>
                {mockActivities.map((activity) => {
                  const Icon = activity.icon
                  const bgColor =
                    activity.type === 'success'
                      ? 'bg-green-50'
                      : activity.type === 'warning'
                        ? 'bg-orange-50'
                        : 'bg-primary/5'
                  const iconColor =
                    activity.type === 'success'
                      ? 'text-green-600'
                      : activity.type === 'warning'
                        ? 'text-orange-600'
                        : 'text-primary'

                  return (
                    <StaggerItem key={activity.id}>
                      <motion.div
                        className="flex gap-3 rounded-xl bg-green-50 p-4 transition-colors hover:bg-green-100"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}
                        >
                          <Icon className={`h-5 w-5 ${iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {activity.title}
                          </div>
                          <div className="text-sm text-gray-600">
                            {activity.description}
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {activity.time}
                          </div>
                        </div>
                      </motion.div>
                    </StaggerItem>
                  )
                })}
              </StaggerContainer>
            </div>

            {/* Score Distribution */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">점수 분포</h2>

              <StaggerContainer className="space-y-4" delay={0.3}>
                {scoreDistributionData.map((item, index) => {
                  const gradientClass =
                    item.color === 'excellent'
                      ? 'bg-gradient-to-r from-green-600 to-green-500'
                      : item.color === 'good'
                        ? 'bg-gradient-to-r from-primary to-primary/70'
                        : item.color === 'average'
                          ? 'bg-gradient-to-r from-orange-500 to-yellow-400'
                          : 'bg-gradient-to-r from-red-600 to-red-500'

                  return (
                    <StaggerItem key={index}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">
                          {item.range}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {item.count}명
                        </span>
                      </div>
                      <div className="h-8 w-full overflow-hidden rounded-full bg-gray-100">
                        <motion.div
                          className={`flex h-full items-center justify-center text-xs font-semibold text-white ${gradientClass}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{
                            duration: 0.8,
                            delay: 0.4 + index * 0.1,
                            ease: [0, 0, 0.2, 1],
                          }}
                        >
                          {item.percentage}%
                        </motion.div>
                      </div>
                    </StaggerItem>
                  )
                })}
              </StaggerContainer>
            </div>
          </div>
        </div>

        {/* Exam Results Table */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">최근 시험 결과</h2>
            <Button variant="ghost" size="sm">
              전체 보기 →
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시험명</TableHead>
                <TableHead>응시자</TableHead>
                <TableHead>평균 점수</TableHead>
                <TableHead>합격률</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockExamResults.map((exam) => (
                <TableRow
                  key={exam.id}
                  className="cursor-pointer"
                  onClick={() => navigate({ to: `/examinations/${exam.id}` })}
                >
                  <TableCell>
                    <div className="font-medium">{exam.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {exam.subject}
                    </div>
                  </TableCell>
                  <TableCell>{exam.students}명</TableCell>
                  <TableCell className={getScoreColor(exam.avgScore)}>
                    {exam.avgScore.toFixed(1)}점
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={exam.passRate >= 90 ? 'success' : 'default'}
                    >
                      {exam.passRate}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        exam.status === 'ongoing'
                          ? 'primary'
                          : exam.status === 'completed'
                            ? 'success'
                            : 'secondary'
                      }
                    >
                      {exam.status === 'ongoing'
                        ? '진행 중'
                        : exam.status === 'completed'
                          ? '완료'
                          : '예정'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Recent Questions & Ongoing Exams */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Questions */}
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

          {/* Ongoing Exams */}
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
        </div>

        {/* Recent Submissions */}
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
      </div>
  )
}
