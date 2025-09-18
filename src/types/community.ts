import { User, Profile } from './auth'

export interface Community {
  id: string
  name: string
  description: string
  slug: string
  category: string
  image_url?: string
  icon_url?: string
  thumb_url?: string | null
  owner_id: string
  member_count: number
  created_at: string
  updated_at: string
}

export interface CommunityMember {
  id: string
  community_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

export interface Post {
  id: string
  community_id: string
  user_id: string
  page_id?: string | null
  category_id?: string | null
  title: string
  content: string
  image_url?: string
  created_at: string
  updated_at: string
  author?: Profile
  comment_count?: number
  like_count?: number
  views?: number
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  author?: Profile
} 

export interface Notice {
  id: string
  community_id: string
  user_id: string
  title: string
  content: string
  pinned?: boolean
  created_at: string
}

export interface CommunitySettings {
  community_id: string
  mission?: string
  about?: string
  banner_url?: string
  // 대시보드 활성 버튼 등에 사용하는 브랜드 컬러 (HEX)
  brand_color?: string | null
  updated_at: string
  updated_by: string
}

export interface BoardCategory {
  id: string
  community_id: string
  name: string
  parent_id: string | null
  position?: number
  created_at: string
}

export interface CommunityService {
  id: string
  community_id: string
  label: string
  created_at: string
}

export interface PostLike {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface CommunityPage {
  id: string
  community_id: string
  title: string
  slug?: string | null
  group_id?: string | null
  type?: 'feed' | 'notes' | 'blog' | 'divider'
  banner_url?: string | null
  description?: string | null
  position?: number | null
  created_at: string
}

export interface CommunityPageGroup {
  id: string
  community_id: string
  title: string
  position?: number | null
  created_at: string
}