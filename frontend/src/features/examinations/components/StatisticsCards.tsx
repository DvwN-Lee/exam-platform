import type { ExamStatistics } from '@/types/score'

interface StatisticsCardsProps {
  statistics: ExamStatistics
}

export function StatisticsCards({ statistics }: StatisticsCardsProps) {
  const cards = [
    {
      label: '평균 점수',
      value: `${statistics.average_score}점`,
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    },
    {
      label: '최고점',
      value: `${statistics.highest_score}점`,
      color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
    },
    {
      label: '최저점',
      value: `${statistics.lowest_score}점`,
      color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    },
    {
      label: '합격률',
      value: `${statistics.pass_rate}%`,
      color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
    },
    {
      label: '제출률',
      value:
        statistics.total_students > 0
          ? `${Math.round((statistics.submitted_count / statistics.total_students) * 100)}%`
          : '0%',
      subValue: `${statistics.submitted_count}/${statistics.total_students}명`,
      color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg p-4 ${card.color}`}
        >
          <div className="text-sm font-medium opacity-80">{card.label}</div>
          <div className="mt-1 text-2xl font-bold">{card.value}</div>
          {card.subValue && (
            <div className="mt-1 text-xs opacity-70">{card.subValue}</div>
          )}
        </div>
      ))}
    </div>
  )
}
