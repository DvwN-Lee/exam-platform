import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { ProfileSettings } from './ProfileSettings'
import { PasswordSettings } from './PasswordSettings'
import { SubjectSettings } from './SubjectSettings'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'subjects'>('profile')
  const user = useAuthStore((state) => state.user)

  const tabs = [
    { id: 'profile' as const, label: '프로필 설정' },
    { id: 'password' as const, label: '비밀번호 변경' },
    ...(user?.user_type === 'teacher'
      ? [{ id: 'subjects' as const, label: '과목 관리' }]
      : []),
  ]

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">설정</h1>
          <p className="text-muted-foreground">계정 및 시스템 설정을 관리합니다</p>
        </div>

        <div className="rounded-lg border bg-card">
          {/* Tabs */}
          <div className="border-b">
            <div className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'password' && <PasswordSettings />}
            {activeTab === 'subjects' && user?.user_type === 'teacher' && (
              <SubjectSettings />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
