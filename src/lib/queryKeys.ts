// 공용 React Query 키 유틸

export const keys = {
  auth: {
    root: ['auth'] as const,
    session: ['auth', 'session'] as const,
    profile: (userId?: string | null) => ['auth', 'profile', userId] as const,
  },
  notifications: {
    root: ['notifications'] as const,
    unreadCount: (userId?: string | null) => ['notifications', 'unread-count', userId] as const,
  },
  communities: {
    root: ['communities'] as const,
    mine: (userId?: string | null) => ['communities', 'mine', userId] as const,
    list: (filters?: unknown) => ['communities', 'list', filters] as const,
    bySlug: (slug: string) => ['communities', 'by-slug', slug] as const,
    owner: (communityId: string) => ['communities', communityId, 'owner'] as const,
    pages: (communityId: string) => ['communities', communityId, 'pages'] as const,
    pageGroups: (communityId: string) => ['communities', communityId, 'page-groups'] as const,
    members: (communityId: string) => ['communities', communityId, 'members'] as const,
  },
  posts: {
    list: (communityId: string, pageId?: string | null) => ['posts', communityId, 'list', pageId ?? null] as const,
    likeCount: (postId: string) => ['posts', postId, 'like-count'] as const,
  },
}

