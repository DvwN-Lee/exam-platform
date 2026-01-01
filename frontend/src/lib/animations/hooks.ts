import { useEffect, useState } from 'react'

/**
 * Hook to detect if user prefers reduced motion
 * Returns true if the user has enabled reduced motion in their system settings
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if window is defined (SSR safety)
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

/**
 * Hook that returns animation props based on reduced motion preference
 * If reduced motion is preferred, returns empty object
 */
export function useAnimationProps<T extends object>(props: T): T | Record<string, never> {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return {} as Record<string, never>
  }

  return props
}
