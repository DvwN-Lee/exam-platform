/**
 * 시험 관련 상수
 */

/** Timer Interval (ms) */
export const TIMER_INTERVAL_MS = 1000

/** 1시간 (초 단위) */
export const SECONDS_PER_HOUR = 3600

/** 1분 (초 단위) */
export const SECONDS_PER_MINUTE = 60

/** 1분 (밀리초 단위) */
export const MILLISECONDS_PER_MINUTE = 60000

/** 긴급 시간 임계값 (초 단위) - 5분 */
export const URGENT_TIME_THRESHOLD_SECONDS = 300

/** 합격 점수 기준 (%) */
export const PASS_SCORE_THRESHOLD = 60

/** 기본 시험 시작 시간 Offset (ms) - 현재로부터 1시간 후 */
export const DEFAULT_EXAM_START_OFFSET_MS = 3600000

/** 기본 시험 종료 시간 Offset (ms) - 현재로부터 2시간 후 */
export const DEFAULT_EXAM_END_OFFSET_MS = 7200000
