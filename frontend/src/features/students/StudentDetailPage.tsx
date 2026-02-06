import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, AlertCircle, BookOpen, TrendingUp, CheckCircle } from 'lucide-react'
import { getStudent } from '@/api/student'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  getScoreColor,
} from '@/components/ui/table'
import type { ExamHistoryItem } from '@/types/student'

export function StudentDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams({ strict: false })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(Number(id)),
    enabled: !!id,
  })

  if (isLoading) {
    return <LoadingPage message="학생 정보를 불러오는 중..." fullScreen={false} />
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="학생 정보를 불러오지 못했습니다"
        description="잠시 후 다시 시도해 주세요."
        action={{ label: '재시도', onClick: () => refetch() }}
      />
    )
  }

  const statistics = data.statistics ?? {
    total_exams_taken: 0,
    average_score: 0,
    pass_rate: 0,
  }
  const exam_history = data.exam_history ?? []

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <FadeIn>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/students' })}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              목록
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {data.student_name}
              </h1>
              <p className="text-muted-foreground">@{data.username}</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn type="slideUp" delay={0.05}>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">프로필 정보</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">이름</div>
                <div className="font-medium">{data.student_name || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">학번</div>
                <div className="font-medium">{data.student_id || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">이메일</div>
                <div className="font-medium">{data.email || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">학교</div>
                <div className="font-medium">{data.student_school || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">반</div>
                <div className="font-medium">{data.student_class || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">가입일</div>
                <div className="font-medium">
                  {new Date(data.date_joined).toLocaleDateString('ko-KR')}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        <StaggerContainer className="grid gap-4 sm:grid-cols-3">
          <StaggerItem>
            <div className="relative overflow-hidden rounded-lg border bg-card p-6">
              <div className="absolute right-4 top-4 text-primary/10">
                <BookOpen className="h-12 w-12" />
              </div>
              <div className="text-sm font-medium text-muted-foreground">응시 횟수</div>
              <div className="mt-2 text-3xl font-bold">
                {statistics.total_exams_taken}
              </div>
              <div className="text-xs text-muted-foreground">회</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="relative overflow-hidden rounded-lg border bg-card p-6">
              <div className="absolute right-4 top-4 text-primary/10">
                <TrendingUp className="h-12 w-12" />
              </div>
              <div className="text-sm font-medium text-muted-foreground">평균 점수</div>
              <div className="mt-2 text-3xl font-bold">
                {statistics.average_score}
              </div>
              <div className="text-xs text-muted-foreground">점</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="relative overflow-hidden rounded-lg border bg-card p-6">
              <div className="absolute right-4 top-4 text-primary/10">
                <CheckCircle className="h-12 w-12" />
              </div>
              <div className="text-sm font-medium text-muted-foreground">합격률</div>
              <div className="mt-2 text-3xl font-bold">
                {statistics.pass_rate}
              </div>
              <div className="text-xs text-muted-foreground">%</div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        <FadeIn type="slideUp" delay={0.2}>
          <div className="rounded-lg border bg-card">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold">시험 이력</h2>
            </div>
            {exam_history.length === 0 ? (
              <div className="p-6 pt-0">
                <EmptyState
                  icon={BookOpen}
                  title="시험 이력이 없습니다"
                  description="아직 응시한 시험이 없습니다."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시험명</TableHead>
                    <TableHead>과목</TableHead>
                    <TableHead className="text-right">점수</TableHead>
                    <TableHead className="text-right">총점</TableHead>
                    <TableHead className="text-right">득점률</TableHead>
                    <TableHead>제출일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exam_history.map((item: ExamHistoryItem, index: number) => {
                    const percentage =
                      item.total_score > 0
                        ? Math.round((item.score / item.total_score) * 100)
                        : 0
                    return (
                      <TableRow key={`${item.exam_id}-${index}`}>
                        <TableCell className="font-medium">
                          {item.exam_name}
                        </TableCell>
                        <TableCell>{item.subject_name || '-'}</TableCell>
                        <TableCell className={`text-right ${getScoreColor(percentage)}`}>
                          {item.score}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.total_score}
                        </TableCell>
                        <TableCell className={`text-right ${getScoreColor(percentage)}`}>
                          {percentage}%
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.submitted_at
                            ? new Date(item.submitted_at).toLocaleDateString('ko-KR')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  )
}
