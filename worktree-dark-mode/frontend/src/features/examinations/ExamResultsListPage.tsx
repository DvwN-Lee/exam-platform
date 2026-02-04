import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { scoreApi } from '@/api/score'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'
import { StatisticsCards } from './components/StatisticsCards'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animation'
import { cardHoverVariants } from '@/lib/animations'
import type { ExamScore } from '@/types/score'

type FilterType = 'all' | 'submitted' | 'not_submitted'
type SortType = 'score_desc' | 'score_asc' | 'name' | 'submit_time'

export function ExamResultsListPage() {
  const navigate = useNavigate()
  const { id } = useParams({ strict: false })
  const examId = Number(id)

  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('score_desc')

  const { data: scoresData, isLoading: scoresLoading, isError: scoresError } = useQuery({
    queryKey: ['examScores', examId],
    queryFn: () => scoreApi.getExamScores(examId),
    enabled: !!examId,
  })

  const { data: statistics, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['examStatistics', examId],
    queryFn: () => scoreApi.getExamStatistics(examId),
    enabled: !!examId,
  })

  const isLoading = scoresLoading || statsLoading
  const isError = scoresError || statsError

  const filteredScores = (scoresData?.scores ?? [])
    .filter((score: ExamScore) => {
      if (filter === 'submitted') return score.is_submitted
      if (filter === 'not_submitted') return !score.is_submitted
      return true
    })
    .sort((a: ExamScore, b: ExamScore) => {
      switch (sort) {
        case 'score_desc':
          return (b.test_score ?? 0) - (a.test_score ?? 0)
        case 'score_asc':
          return (a.test_score ?? 0) - (b.test_score ?? 0)
        case 'name':
          return a.student.student_name.localeCompare(b.student.student_name)
        case 'submit_time':
          if (!a.submit_time) return 1
          if (!b.submit_time) return -1
          return new Date(b.submit_time).getTime() - new Date(a.submit_time).getTime()
        default:
          return 0
      }
    })

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-'
    return new Date(timeString).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <TableSkeleton rows={5} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-[250px] sm:min-h-[300px] md:min-h-[400px] items-center justify-center">
        <div className="text-destructive">데이터를 불러오는데 실패했습니다.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <FadeIn>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {scoresData?.exam_name ?? '시험 결과'}
              </h1>
              <p className="mt-1 text-muted-foreground">
                학생별 시험 결과를 확인하고 관리합니다.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate({ to: '/examinations' })}
              >
                목록
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate({ to: `/examinations/${id}` })}
              >
                상세
              </Button>
            </div>
          </div>
        </FadeIn>

        {statistics && (
          <FadeIn delay={0.1}>
            <StatisticsCards statistics={statistics} />
          </FadeIn>
        )}

        <FadeIn delay={0.15}>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['all', 'submitted', 'not_submitted'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' && '전체'}
                  {f === 'submitted' && '제출'}
                  {f === 'not_submitted' && '미제출'}
                </Button>
              ))}
            </div>
            <Select value={sort} onValueChange={(value) => setSort(value as SortType)}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score_desc">점수 높은순</SelectItem>
                <SelectItem value="score_asc">점수 낮은순</SelectItem>
                <SelectItem value="name">이름순</SelectItem>
                <SelectItem value="submit_time">제출시간순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="rounded-lg border bg-card">
            <div className="grid grid-cols-6 gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground">
              <div className="col-span-2">학생명</div>
              <div>학번</div>
              <div className="text-center">점수</div>
              <div className="text-center">제출시간</div>
              <div className="text-center">상태</div>
            </div>

            <StaggerContainer className="divide-y" delay={0.2}>
              {filteredScores.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  {filter === 'all'
                    ? '등록된 학생이 없습니다.'
                    : filter === 'submitted'
                      ? '제출한 학생이 없습니다.'
                      : '미제출 학생이 없습니다.'}
                </div>
              ) : (
                filteredScores.map((score: ExamScore) => (
                  <StaggerItem key={score.id}>
                    <motion.div
                      className={`grid grid-cols-6 gap-4 px-4 py-3 transition-colors hover:bg-muted/50 ${
                        score.is_submitted ? 'cursor-pointer' : ''
                      }`}
                      initial="rest"
                      whileHover="hover"
                      variants={cardHoverVariants}
                      onClick={() =>
                        score.is_submitted &&
                        navigate({
                          to: `/examinations/${id}/results/${score.student.id}`,
                        })
                      }
                    >
                      <div className="col-span-2 font-medium">
                        {score.student.student_name}
                      </div>
                      <div className="text-muted-foreground">
                        {score.student.student_id}
                      </div>
                      <div className="text-center">
                        {score.is_submitted ? (
                          <span className="font-medium">{score.test_score}점</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                      <div className="text-center text-sm text-muted-foreground">
                        {formatTime(score.submit_time)}
                      </div>
                      <div className="text-center">
                        {score.is_submitted ? (
                          score.passed ? (
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              합격
                            </span>
                          ) : (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              불합격
                            </span>
                          )
                        ) : (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            미제출
                          </span>
                        )}
                      </div>
                    </motion.div>
                  </StaggerItem>
                ))
              )}
            </StaggerContainer>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}
