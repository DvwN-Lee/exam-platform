import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary 컴포넌트
 * Route 또는 Feature 레벨에서 에러를 캐치하여 사용자에게 친화적인 UI를 제공
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 에러 로깅 또는 외부 서비스 전송
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 커스텀 fallback UI가 제공된 경우 사용
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 기본 에러 UI
      return (
        <div className="flex min-h-[250px] sm:min-h-[300px] md:min-h-[400px] items-center justify-center p-4">
          <div className="max-w-md text-center space-y-4">
            <AlertTriangle className="mx-auto h-16 w-16 text-destructive" />
            <h2 className="text-xl font-semibold">문제가 발생했습니다</h2>
            <p className="text-muted-foreground">
              페이지를 표시하는 중 오류가 발생했습니다.
              다시 시도하거나 페이지를 새로고침해 주세요.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 rounded-lg border bg-muted/50 p-4 text-left">
                <summary className="cursor-pointer text-sm font-medium">
                  오류 상세 정보
                </summary>
                <pre className="mt-2 overflow-auto text-xs text-destructive">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex gap-2 justify-center pt-4">
              <Button variant="outline" onClick={this.handleReset}>
                다시 시도
              </Button>
              <Button onClick={this.handleReload}>
                페이지 새로고침
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
