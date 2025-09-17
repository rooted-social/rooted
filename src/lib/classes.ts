import { supabase, getUserId } from '@/lib/supabase'

export interface ClassCategory {
  id: string
  community_id: string
  name: string
  created_at: string
}

export interface ClassItem {
  id: string
  community_id: string
  category_id: string | null
  title: string
  description?: string | null
  thumbnail_url?: string | null
  youtube_url?: string | null
  user_id?: string | null
  views?: number
  completed?: boolean // 현재 사용자의 수강 완료 상태
  created_at: string
  author?: {
    id: string
    full_name: string | null
    username: string
    avatar_url: string | null
    updated_at: string | null
  } | null
}

export interface ClassEnrollment {
  id: string
  class_id: string
  user_id: string
  completed: boolean
  enrolled_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export async function listClassCategories(communityId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/classes/categories?communityId=${encodeURIComponent(communityId)}&t=${Date.now()}`, { cache: 'no-store', headers: session?.access_token ? { authorization: `Bearer ${session.access_token}` } : undefined })
    if (!res.ok) throw new Error('failed')
    const data = await res.json()
    return (data || []) as ClassCategory[]
  } catch {
    return []
  }
}

export async function createClassCategory(communityId: string, name: string) {
  const { data, error } = await supabase
    .from('class_categories')
    .insert({ community_id: communityId, name })
    .select()
    .single()
  if (error) throw error
  return data as ClassCategory
}

export async function updateClassCategory(id: string, name: string) {
  const { data, error } = await supabase
    .from('class_categories')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ClassCategory
}

export async function deleteClassCategory(id: string) {
  const { error } = await supabase.from('class_categories').delete().eq('id', id)
  if (error) throw error
  return true
}

export async function listClasses(communityId: string, categoryId?: string | null, userId?: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const url = `/api/classes/list?communityId=${encodeURIComponent(communityId)}${categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : ''}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`
    const res = await fetch(url, { headers: session?.access_token ? { authorization: `Bearer ${session.access_token}` } : undefined })
    if (!res.ok) throw new Error('failed')
    const data = await res.json()
    return (data || []) as ClassItem[]
  } catch (error) {
    console.error('listClasses error:', error)
    return []
  }
}

export async function createClass(payload: Omit<ClassItem,'id'|'created_at'|'author'|'completed'>) {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  
  const { data, error } = await supabase
    .from('classes')
    .insert({
      ...payload,
      user_id: uid
    })
    .select()
    .single()
  if (error) throw error
  return data as ClassItem
}

export async function updateClass(id: string, updates: Partial<Omit<ClassItem,'id'|'community_id'|'created_at'>>) {
  const { data, error } = await supabase
    .from('classes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ClassItem
}

export async function deleteClass(id: string) {
  const { error } = await supabase.from('classes').delete().eq('id', id)
  if (error) throw error
  return true
}

// 수강 완료 상태 토글
export async function toggleClassCompletion(classId: string, completed: boolean): Promise<boolean> {
  try {
    const uid = await getUserId()
    if (!uid) throw new Error('로그인이 필요합니다.')

    // 기존 수강 정보 확인
    const { data: existingEnrollment } = await supabase
      .from('class_enrollments')
      .select('id, completed')
      .eq('class_id', classId)
      .eq('user_id', uid)
      .single()

    if (existingEnrollment) {
      // 기존 수강 정보 업데이트
      const { error } = await supabase
        .from('class_enrollments')
        .update({ completed })
        .eq('id', existingEnrollment.id)
      
      if (error) throw error
    } else {
      // 새 수강 정보 생성
      const { error } = await supabase
        .from('class_enrollments')
        .insert({
          class_id: classId,
          user_id: uid,
          completed
        })
      
      if (error) throw error
    }

    return completed
  } catch (error) {
    console.error('toggleClassCompletion error:', error)
    throw error
  }
}

// 사용자의 특정 클래스 수강 완료 상태 확인
export async function getClassCompletionStatus(classId: string): Promise<boolean> {
  try {
    const uid = await getUserId()
    if (!uid) return false

    const { data } = await supabase
      .from('class_enrollments')
      .select('completed')
      .eq('class_id', classId)
      .eq('user_id', uid)
      .single()

    return data?.completed || false
  } catch (error) {
    console.error('getClassCompletionStatus error:', error)
    return false
  }
}

// 클래스별 수강 완료 통계
export async function getClassCompletionStats(classId: string): Promise<{ total: number; completed: number }> {
  try {
    const [totalResult, completedResult] = await Promise.all([
      supabase
        .from('class_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId),
      supabase
        .from('class_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('completed', true)
    ])

    return {
      total: totalResult.count || 0,
      completed: completedResult.count || 0
    }
  } catch (error) {
    console.error('getClassCompletionStats error:', error)
    return { total: 0, completed: 0 }
  }
}

// 클래스 조회수 증가
export async function incrementClassViews(classId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_class_view_count', {
      class_id: classId
    })
    
    if (error) throw error
  } catch (error) {
    console.error('incrementClassViews error:', error)
  }
}

// 클래스 상세 정보 가져오기 (작성자 정보 포함)
export async function getClassById(classId: string): Promise<ClassItem | null> {
  try {
    // 클래스 기본 정보 가져오기
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, community_id, category_id, title, description, thumbnail_url, youtube_url, user_id, views, created_at')
      .eq('id', classId)
      .single()
    
    if (classError) throw classError
    if (!classData) return null

    // 작성자 정보 가져오기
    let author = null
    if (classData.user_id) {
      try {
        const { data: authorData, error: authorError } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, updated_at')
          .eq('id', classData.user_id)
          .single()
        
        if (!authorError && authorData) {
          author = authorData
        }
      } catch (authorError) {
        console.warn('Failed to load author for class:', authorError)
      }
    }

    // 현재 사용자의 수강 완료 상태 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    let completed = false
    
    if (user) {
      try {
        const { data: enrollmentData } = await supabase
          .from('class_enrollments')
          .select('completed')
          .eq('class_id', classId)
          .eq('user_id', user.id)
          .single()
        
        completed = enrollmentData?.completed || false
      } catch (enrollmentError) {
        // 수강 정보가 없으면 완료되지 않음으로 처리
        completed = false
      }
    }

    return {
      ...classData,
      author,
      completed
    } as ClassItem

  } catch (error) {
    console.error('getClassById error:', error)
    return null
  }
}


