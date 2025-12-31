import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { GraduationCap, User, BookOpen } from 'lucide-react'
import { DURATION, EASING, STAGGER } from '@/lib/animations'

const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력해주세요'),
  password: z.string().min(1, 'Password를 입력해주세요'),
  remember: z.boolean(),
})

type LoginForm = z.infer<typeof loginSchema>
type UserRole = 'student' | 'teacher'

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [selectedRole, setSelectedRole] = useState<UserRole>('student')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: {
      username: '',
      password: '',
      remember: false,
    },
  })

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.access, data.refresh)
      navigate({ to: '/dashboard' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '로그인에 실패했습니다.')
    },
  })

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: STAGGER.fast,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATION.normal, ease: EASING.easeOut },
    },
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background to-[rgba(16,185,129,0.1)] px-4 py-12">
      {/* Decorative circles */}
      <motion.div
        className="absolute -right-48 -top-48 size-[500px] rounded-full bg-primary opacity-5"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.05 }}
        transition={{ duration: DURATION.slower, ease: EASING.easeOut }}
      />
      <motion.div
        className="absolute -bottom-36 -left-36 size-96 rounded-full bg-primary-light opacity-5"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.05 }}
        transition={{ duration: DURATION.slower, ease: EASING.easeOut, delay: 0.2 }}
      />

      <motion.div
        className="relative z-10 w-full max-w-[1000px] overflow-hidden rounded-[32px] bg-card shadow-2xl md:grid md:grid-cols-2"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.slow, ease: EASING.easeOut }}
      >
        {/* Login Form - Left Side */}
        <motion.div
          className="flex flex-col justify-center p-8 md:p-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo */}
          <motion.div className="mb-10 flex items-center gap-3" variants={itemVariants}>
            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-2xl font-bold text-white">
              E
            </div>
            <div className="text-[1.75rem] font-bold text-primary">ExamOnline</div>
          </motion.div>

          {/* Header */}
          <motion.div className="mb-8" variants={itemVariants}>
            <h1 className="mb-2 text-3xl font-bold text-foreground">환영합니다</h1>
            <p className="text-muted-foreground">계정에 로그인하여 시작하세요</p>
          </motion.div>

          {/* Role Selector */}
          <motion.div className="mb-8 flex gap-4" role="radiogroup" aria-label="사용자 유형 선택" variants={itemVariants}>
            <motion.button
              type="button"
              role="radio"
              aria-checked={selectedRole === 'student'}
              onClick={() => setSelectedRole('student')}
              className={`flex flex-1 flex-col items-center gap-2 rounded-[16px] border-2 p-4 transition-all ${
                selectedRole === 'student'
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent bg-accent hover:border-primary-light'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <GraduationCap className="size-8 text-primary" />
              <span className="text-[0.9375rem] font-semibold text-foreground">학생</span>
            </motion.button>
            <motion.button
              type="button"
              role="radio"
              aria-checked={selectedRole === 'teacher'}
              onClick={() => setSelectedRole('teacher')}
              className={`flex flex-1 flex-col items-center gap-2 rounded-[16px] border-2 p-4 transition-all ${
                selectedRole === 'teacher'
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent bg-accent hover:border-primary-light'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <User className="size-8 text-primary" />
              <span className="text-[0.9375rem] font-semibold text-foreground">교사</span>
            </motion.button>
          </motion.div>

          {/* Login Form */}
          <motion.form onSubmit={handleSubmit(onSubmit)} className="space-y-6" variants={itemVariants}>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[0.9375rem] font-semibold">
                아이디
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="아이디를 입력하세요"
                className="h-12 rounded-[12px] border-2 px-5 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register('username')}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[0.9375rem] font-semibold">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Password를 입력하세요"
                className="h-12 rounded-[12px] border-2 px-5 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={watch('remember')}
                  onCheckedChange={(checked) => setValue('remember', checked === true)}
                />
                <label
                  htmlFor="remember"
                  className="cursor-pointer text-sm text-muted-foreground"
                >
                  로그인 유지
                </label>
              </div>
              <button
                type="button"
                onClick={() => toast.info('비밀번호 찾기 기능은 준비 중입니다.')}
                className="text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
              >
                비밀번호 찾기
              </button>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="h-[3.375rem] w-full rounded-[12px] bg-primary text-base font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg"
              >
                {loginMutation.isPending ? '로그인 중...' : '로그인'}
              </Button>
            </motion.div>
          </motion.form>

          {/* Divider */}
          <motion.div className="my-6 flex items-center gap-4" variants={itemVariants}>
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm text-muted-foreground">또는</span>
            <div className="h-px flex-1 bg-border" />
          </motion.div>

          {/* Social Login */}
          <motion.div className="mb-6 flex gap-4" variants={itemVariants}>
            <motion.button
              type="button"
              onClick={() => toast.info('Google 로그인 기능은 준비 중입니다.')}
              className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border-2 border-border bg-card p-4 font-semibold transition-all hover:border-primary"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-base">G</span>
              Google
            </motion.button>
            <motion.button
              type="button"
              onClick={() => toast.info('Kakao 로그인 기능은 준비 중입니다.')}
              className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border-2 border-border bg-card p-4 font-semibold transition-all hover:border-primary"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-base">K</span>
              Kakao
            </motion.button>
          </motion.div>

          {/* Sign up link */}
          <motion.div className="text-center text-[0.9375rem] text-muted-foreground" variants={itemVariants}>
            계정이 없으신가요?{' '}
            <button
              onClick={() => navigate({ to: '/register' })}
              className="font-semibold text-primary transition-colors hover:text-primary-dark hover:underline"
            >
              회원가입
            </button>
          </motion.div>
        </motion.div>

        {/* Illustration - Right Side */}
        <motion.div
          className="relative hidden overflow-hidden bg-gradient-to-br from-primary to-primary-dark p-12 text-white md:flex md:flex-col md:items-center md:justify-center"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: DURATION.slow, ease: EASING.easeOut, delay: 0.3 }}
        >
          {/* Decorative circles */}
          <div className="absolute -right-24 -top-24 size-72 rounded-full bg-white opacity-10" />
          <div className="absolute -bottom-20 -left-20 size-60 rounded-full bg-white opacity-5" />

          {/* Illustration content */}
          <div className="relative z-10 text-center">
            <motion.div
              className="mb-6 inline-block"
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <BookOpen className="size-32 text-white" />
            </motion.div>
            <h2 className="mb-4 text-[2rem] font-bold">스마트한 학습 관리</h2>
            <p className="mb-8 text-lg opacity-90">
              효과적인 평가와 성적 관리를 한 곳에서
            </p>
          </div>

          {/* Features list */}
          <motion.ul
            className="relative z-10 space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1, delayChildren: 0.6 },
              },
            }}
          >
            {[
              '실시간 자동 채점 시스템',
              '상세한 성적 분석 리포트',
              '맞춤형 학습 진도 관리',
              '모바일 친화적 인터페이스',
            ].map((feature, index) => (
              <motion.li
                key={index}
                className="relative pl-8 text-base opacity-95 before:absolute before:left-0 before:text-xl before:font-bold before:content-['✓']"
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 0.95, x: 0 },
                }}
              >
                {feature}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
