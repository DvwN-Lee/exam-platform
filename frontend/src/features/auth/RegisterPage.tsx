import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authApi } from '@/api/auth'
import { questionApi } from '@/api/question'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GraduationCap, User, BookOpen } from 'lucide-react'
import type { RegisterRequest } from '@/types/auth'

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, '아이디는 3자 이상이어야 합니다')
      .regex(/^[a-zA-Z0-9_]+$/, '아이디는 영문, 숫자, 밑줄(_)만 사용 가능합니다'),
    email: z.string().email('올바른 이메일 주소를 입력해주세요'),
    nick_name: z.string().min(2, '닉네임은 2자 이상이어야 합니다'),
    password: z
      .string()
      .min(8, 'Password는 8자 이상이어야 합니다'),
    password2: z.string(),
    user_type: z.enum(['student', 'teacher']),
    student_name: z.string().optional(),
    teacher_name: z.string().optional(),
    subject_id: z.number().optional(),
  })
  .refine((data) => data.password === data.password2, {
    message: 'Password가 일치하지 않습니다',
    path: ['password2'],
  })
  .refine((data) => {
    if (data.user_type === 'student') {
      return data.student_name && data.student_name.length >= 2
    }
    return true
  }, {
    message: '학생 이름은 2자 이상이어야 합니다',
    path: ['student_name'],
  })
  .refine((data) => {
    if (data.user_type === 'teacher') {
      return data.teacher_name && data.teacher_name.length >= 2
    }
    return true
  }, {
    message: '교사 이름은 2자 이상이어야 합니다',
    path: ['teacher_name'],
  })
  .refine((data) => {
    if (data.user_type === 'teacher') {
      return data.subject_id && data.subject_id > 0
    }
    return true
  }, {
    message: '과목을 선택해주세요',
    path: ['subject_id'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const [selectedUserType, setSelectedUserType] = useState<'student' | 'teacher'>('student')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      user_type: 'student',
    },
  })

  const userType = watch('user_type')

  useEffect(() => {
    setSelectedUserType(userType)
  }, [userType])

  // 과목 목록 조회
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: questionApi.getSubjects,
  })

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: () => {
      alert('회원가입이 완료되었습니다. 로그인해주세요.')
      navigate({ to: '/login' })
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        '회원가입에 실패했습니다.'
      alert(errorMessage)
    },
  })

  const onSubmit = (data: RegisterForm) => {
    const requestData: RegisterRequest = {
      username: data.username,
      email: data.email,
      password: data.password,
      password2: data.password2,
      nick_name: data.nick_name,
      user_type: data.user_type,
    }

    if (data.user_type === 'student' && data.student_name) {
      requestData.student_name = data.student_name
    }

    if (data.user_type === 'teacher') {
      if (data.teacher_name) {
        requestData.teacher_name = data.teacher_name
      }
      if (data.subject_id) {
        requestData.subject_id = data.subject_id
      }
    }

    registerMutation.mutate(requestData)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background to-[rgba(16,185,129,0.1)] px-4 py-12">
      {/* Decorative circles */}
      <div className="absolute -right-48 -top-48 size-[500px] rounded-full bg-primary opacity-5" />
      <div className="absolute -bottom-36 -left-36 size-96 rounded-full bg-primary-light opacity-5" />

      <div className="relative z-10 w-full max-w-[1000px] overflow-hidden rounded-[32px] bg-card shadow-2xl md:grid md:grid-cols-2">
        {/* Register Form - Left Side */}
        <div className="flex flex-col justify-center p-8 md:p-12">
          {/* Logo */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-2xl font-bold text-white">
              E
            </div>
            <div className="text-[1.75rem] font-bold text-primary">ExamOnline</div>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="mb-2 text-3xl font-bold text-foreground">회원가입</h1>
            <p className="text-muted-foreground">새로운 계정을 만들어 시작하세요</p>
          </div>

          {/* Role Selector */}
          <div className="mb-6 flex gap-4">
            <button
              type="button"
              onClick={() => {
                setSelectedUserType('student')
                setValue('user_type', 'student')
              }}
              className={`flex flex-1 flex-col items-center gap-2 rounded-[16px] border-2 p-4 transition-all ${
                selectedUserType === 'student'
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent bg-accent hover:border-primary-light'
              }`}
            >
              <GraduationCap className="size-8 text-primary" />
              <span className="text-[0.9375rem] font-semibold text-foreground">학생</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedUserType('teacher')
                setValue('user_type', 'teacher')
              }}
              className={`flex flex-1 flex-col items-center gap-2 rounded-[16px] border-2 p-4 transition-all ${
                selectedUserType === 'teacher'
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent bg-accent hover:border-primary-light'
              }`}
            >
              <User className="size-8 text-primary" />
              <span className="text-[0.9375rem] font-semibold text-foreground">교사</span>
            </button>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-[0.9375rem] font-semibold">
              아이디
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="아이디 (영문, 숫자, _ 가능)"
              className="h-12 rounded-[12px] border-2 px-5 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register('username')}
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[0.9375rem] font-semibold">
              이메일
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              className="h-12 rounded-[12px] border-2 px-5 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nick_name" className="text-[0.9375rem] font-semibold">
              닉네임
            </Label>
            <Input
              id="nick_name"
              type="text"
              placeholder="닉네임을 입력하세요"
              className="h-12 rounded-[12px] border-2 px-5 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register('nick_name')}
            />
            {errors.nick_name && (
              <p className="text-sm text-destructive">{errors.nick_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[0.9375rem] font-semibold">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="8자 이상 입력하세요"
              className="h-12 rounded-[12px] border-2 px-5 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password2" className="text-[0.9375rem] font-semibold">
              Password 확인
            </Label>
            <Input
              id="password2"
              type="password"
              placeholder="Password를 다시 입력하세요"
              className="h-12 rounded-[12px] border-2 px-5 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register('password2')}
            />
            {errors.password2 && (
              <p className="text-sm text-destructive">
                {errors.password2.message}
              </p>
            )}
          </div>

          <input type="hidden" value={selectedUserType} {...register('user_type')} />

          {selectedUserType === 'student' && (
            <div className="space-y-2">
              <Label htmlFor="student_name" className="text-[0.9375rem] font-semibold">
                학생 이름
              </Label>
              <Input
                id="student_name"
                type="text"
                placeholder="실명을 입력하세요"
                className="h-12 rounded-[12px] border-2 px-5 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register('student_name')}
              />
              {errors.student_name && (
                <p className="text-sm text-destructive">{errors.student_name.message}</p>
              )}
            </div>
          )}

          {selectedUserType === 'teacher' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="teacher_name" className="text-[0.9375rem] font-semibold">
                  교사 이름
                </Label>
                <Input
                  id="teacher_name"
                  type="text"
                  placeholder="실명을 입력하세요"
                  className="h-12 rounded-[12px] border-2 px-5 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('teacher_name')}
                />
                {errors.teacher_name && (
                  <p className="text-sm text-destructive">{errors.teacher_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject_id" className="text-[0.9375rem] font-semibold">
                  담당 과목
                </Label>
                <select
                  id="subject_id"
                  {...register('subject_id', { valueAsNumber: true })}
                  className="h-12 w-full rounded-[12px] border-2 border-input bg-background px-5 text-base transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">과목을 선택하세요</option>
                  {subjects?.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
                {errors.subject_id && (
                  <p className="text-sm text-destructive">{errors.subject_id.message}</p>
                )}
              </div>
            </>
          )}

          <Button
            type="submit"
            disabled={registerMutation.isPending}
            className="h-[3.375rem] w-full rounded-[12px] bg-primary text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-lg"
          >
            {registerMutation.isPending ? '가입 중...' : '회원가입'}
          </Button>
        </form>

        {/* Login link */}
        <div className="mt-6 text-center text-[0.9375rem] text-muted-foreground">
          이미 계정이 있으신가요?{' '}
          <button
            onClick={() => navigate({ to: '/login' })}
            className="font-semibold text-primary transition-colors hover:text-primary-dark hover:underline"
          >
            로그인
          </button>
        </div>
      </div>

      {/* Illustration - Right Side */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary to-primary-dark p-12 text-white md:flex md:flex-col md:items-center md:justify-center">
        {/* Decorative circles */}
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-white opacity-10" />
        <div className="absolute -bottom-20 -left-20 size-60 rounded-full bg-white opacity-5" />

        {/* Illustration content */}
        <div className="relative z-10 text-center">
          <div className="mb-6 inline-block animate-float">
            <BookOpen className="size-32 text-white" />
          </div>
          <h2 className="mb-4 text-[2rem] font-bold">학습의 새로운 시작</h2>
          <p className="mb-8 text-lg opacity-90">
            ExamOnline과 함께 효율적인 학습을 경험하세요
          </p>
        </div>

        {/* Features list */}
        <ul className="relative z-10 space-y-3">
          <li className="relative pl-8 text-base opacity-95 before:absolute before:left-0 before:text-xl before:font-bold before:content-['✓']">
            빠르고 간편한 회원가입
          </li>
          <li className="relative pl-8 text-base opacity-95 before:absolute before:left-0 before:text-xl before:font-bold before:content-['✓']">
            학생과 교사 역할 선택
          </li>
          <li className="relative pl-8 text-base opacity-95 before:absolute before:left-0 before:text-xl before:font-bold before:content-['✓']">
            안전한 데이터 보호
          </li>
          <li className="relative pl-8 text-base opacity-95 before:absolute before:left-0 before:text-xl before:font-bold before:content-['✓']">
            언제 어디서나 접속 가능
          </li>
        </ul>
      </div>
      </div>

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
