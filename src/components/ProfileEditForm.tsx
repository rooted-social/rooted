"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { updateProfile, checkUsernameAvailability } from "@/lib/profiles"
import { supabase } from "@/lib/supabase"
import type { Profile, ProfileUpdateData } from "@/types/auth"

interface ProfileEditFormProps {
  profile: Profile | null
  userId: string
  onProfileUpdateAction: (updatedProfile: Profile) => void
  onCancel?: () => void
}

export function ProfileEditForm({ profile, userId, onProfileUpdateAction, onCancel }: ProfileEditFormProps) {
  const [formData, setFormData] = useState<ProfileUpdateData>({
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || ''
  })
  const [loading, setLoading] = useState(false)
  

  // 사용자명 기능 제거됨: 전체 이름만 사용

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 이름 검증: 최소 1자
    if ((formData.full_name || '').trim().length === 0) {
      toast.error('이름을 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const result = await updateProfile(userId, formData)

      if (result.success) {
        toast.success('프로필이 업데이트되었습니다!')
        // 업데이트된 프로필 정보를 부모 컴포넌트에 전달
        const updatedProfile: Profile = {
          ...profile!,
          ...formData,
          updated_at: new Date().toISOString()
        }
        onProfileUpdateAction(updatedProfile)
        // 전역 이벤트로 헤더 등 갱신
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('profile-updated', { detail: updatedProfile }))
        }
      } else {
        toast.error(result.error || '프로필 업데이트에 실패했습니다.')
      }
         } catch {
       toast.error('프로필 업데이트 중 오류가 발생했습니다.')
     } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setLoading(true)
      // 1) 이미지 리사이즈/압축 (Canvas)
      const optimized = await optimizeImage(file, 512, 512, 0.85)

      // 2) 액세스 토큰 포함하여 전송
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) throw new Error('인증 정보가 없습니다. 다시 로그인 해주세요.')

      const body = new FormData()
      body.append('file', optimized)
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body,
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || '업로드 실패')
      }
      // 업로드 결과만 폼에 반영, 최종 저장은 '프로필 업데이트' 버튼으로
      setFormData(prev => ({ ...prev, avatar_url: json.url }))
      toast.success('이미지가 업로드되었습니다. 프로필 업데이트를 눌러 저장하세요.')
    } catch (err: any) {
      toast.error(err?.message || '업로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleImageRemove = async () => {
    if (!formData.avatar_url) return
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) throw new Error('인증 정보가 없습니다. 다시 로그인 해주세요.')

      const url = new URL('/api/profile/avatar', window.location.origin)
      url.searchParams.set('url', formData.avatar_url)
      const res = await fetch(url.toString(), { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || '삭제 실패')
      setFormData(prev => ({ ...prev, avatar_url: '' }))
      toast.success('이미지가 삭제되었습니다. 프로필 업데이트를 눌러 저장하세요.')
    } catch (err: any) {
      toast.error(err?.message || '삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function optimizeImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<File> {
    const imgBitmap = await createImageBitmap(file)
    const { width, height } = scaleToFit(imgBitmap.width, imgBitmap.height, maxWidth, maxHeight)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(imgBitmap, 0, 0, width, height)
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/webp', quality))
    return new File([blob], changeExt(file.name, 'webp'), { type: 'image/webp' })
  }

  function scaleToFit(w: number, h: number, maxW: number, maxH: number) {
    const ratio = Math.min(maxW / w, maxH / h, 1)
    return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
  }

  function changeExt(name: string, nextExt: string) {
    const base = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name
    return `${base}.${nextExt}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>프로필 편집</CardTitle>
        <CardDescription>
          프로필 정보를 수정하고 업데이트하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 프로필 이미지 */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={formData.avatar_url} alt="프로필 이미지" />
              <AvatarFallback className="text-2xl">
                {formData.full_name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label htmlFor="avatar-upload">프로필 이미지</Label>
              <div className="flex gap-2">
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button type="button" variant="outline" onClick={() => document.getElementById('avatar-upload')?.click()} className="cursor-pointer">
                  업로드
                </Button>
                {formData.avatar_url && (
                  <Button type="button" variant="destructive" onClick={handleImageRemove} className="cursor-pointer">
                    삭제
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 사용자명 입력 제거됨 */}

          {/* 이름 */}
          <div className="space-y-2">
            <Label htmlFor="full_name">이름</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="이름(닉네임)을 입력하세요"
              value={formData.full_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value.slice(0, 10) }))}
            />
            <p className="text-xs text-slate-500 text-right">{(formData.full_name || '').length}/10</p>
          </div>

          {/* 소개 */}
          <div className="space-y-2">
            <Label htmlFor="bio">소개</Label>
            <Textarea
              id="bio"
              placeholder="자신을 소개해보세요"
              value={formData.bio || ''}
              onChange={(e) => {
                const next = e.target.value.slice(0, 80)
                setFormData(prev => ({ ...prev, bio: next }))
              }}
              rows={3}
            />
            <p className="text-xs text-slate-500 text-right">{(formData.bio || '').length}/80</p>
          </div>

          <Button 
            type="submit" 
            className="w-full cursor-pointer" 
            disabled={loading}
          >
            {loading ? '업데이트 중...' : '프로필 업데이트'}
          </Button>

          {onCancel && (
            <Button type="button" variant="ghost" className="w-full cursor-pointer" onClick={onCancel}>
              편집 취소
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
} 