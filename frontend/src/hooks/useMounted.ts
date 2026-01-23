import { useSyncExternalStore } from 'react'

/**
 * Client-side hydration 완료 여부를 추적하는 hook
 *
 * SSR/SSG 환경에서 hydration mismatch를 방지하기 위해 사용
 * mounted 상태가 true가 되면 client-side에서만 렌더링되는 컴포넌트를 표시
 *
 * useSyncExternalStore를 사용하여 ESLint react-hooks/set-state-in-effect 준수
 */

const emptySubscribe = () => () => {}

export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // Client에서는 항상 true
    () => false // Server에서는 항상 false
  )
}
