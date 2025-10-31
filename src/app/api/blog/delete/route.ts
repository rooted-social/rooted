import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { r2Client, BLOG_IMAGE_BUCKET } from '@/lib/r2'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: userRes } = await sb.auth.getUser(token)
    const user = userRes?.user
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // 게시글 소유자 확인(작성자 본인 또는 SUPER_ADMIN)
    const superId = process.env.SUPER_ADMIN_USER_ID
    const { data: post } = await sb
      .from('community_page_blog_posts')
      .select('id,user_id')
      .eq('id', id)
      .maybeSingle()
    if (!post) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const isOwner = post.user_id === user.id || (!!superId && superId === user.id)
    if (!isOwner) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    // 관련 blog_images 키 조회
    const { data: images } = await sb
      .from('blog_images')
      .select('key')
      .eq('post_id', id)

    // R2 객체 삭제(없어도 계속 진행)
    let deleted = 0
    if (images && images.length > 0) {
      const results = await Promise.allSettled(
        images.map((r: any) => r.key ? r2Client.send(new DeleteObjectCommand({ Bucket: BLOG_IMAGE_BUCKET, Key: r.key })) : Promise.resolve(null))
      )
      deleted = results.filter(r => r.status === 'fulfilled').length
    }

    // 게시글 삭제(참조된 blog_images는 FK on delete cascade로 함께 삭제)
    const { error: delErr } = await sb
      .from('community_page_blog_posts')
      .delete()
      .eq('id', id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, deletedKeys: deleted })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'delete failed' }, { status: 500 })
  }
}


