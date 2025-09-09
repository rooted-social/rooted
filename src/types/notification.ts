export type NotificationType =
  | 'community_join_welcome'
  | 'community_create_congrats'
  | 'comment_on_my_post'

export interface Notification {
  id: string
  recipient_id: string
  type: NotificationType
  community_id?: string | null
  post_id?: string | null
  comment_id?: string | null
  actor_id?: string | null
  title?: string | null
  message?: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationPreferences {
  user_id: string
  web_enabled: boolean
  enable_welcome_on_join: boolean
  enable_congrats_on_create: boolean
  enable_comment_on_my_post: boolean
  updated_at: string
}


