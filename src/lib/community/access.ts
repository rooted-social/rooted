export type CommunityAccess = {
  isOwner: boolean
  role: string | null
  isMember: boolean
  canManage: boolean
}

export async function getCommunityAccess(
  db: any,
  communityId: string,
  userId: string,
  opts?: { superAdmin?: boolean }
): Promise<CommunityAccess> {
  const isSuper = !!opts?.superAdmin

  // 1) RPC가 존재하면 우선 시도 (단일 호출)
  try {
    const { data: rec } = await db.rpc('get_access', {
      p_user_id: userId,
      p_community_id: communityId,
    })
    const row = Array.isArray(rec) ? (rec[0] || null) : rec
    if (row) {
      const role = (row as any)?.member_role as string | null
      const isOwner = !!(row as any)?.is_owner || false
      const isMember = !!role && role !== 'pending'
      const canManage = isSuper || isOwner || role === 'admin'
      return { isOwner, role, isMember, canManage }
    }
  } catch {}

  // 2) 폴백: 소유자/멤버십 2회 조회
  const [communityRes, memberRes] = await Promise.all([
    db.from('communities').select('owner_id').eq('id', communityId).single(),
    db.from('community_members').select('role').eq('community_id', communityId).eq('user_id', userId).maybeSingle(),
  ])
  const ownerId = (communityRes?.data as any)?.owner_id as string | undefined
  const role = (memberRes?.data as any)?.role as string | undefined
  const isOwner = !!ownerId && ownerId === userId
  const isMember = !!role && role !== 'pending'
  const canManage = isSuper || isOwner || role === 'admin'
  return { isOwner, role: role || null, isMember, canManage }
}


