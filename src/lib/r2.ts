import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3"

/**
 * Cloudflare R2 (S3 호환) 클라이언트 생성
 */
export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

export const PROFILE_IMAGE_BUCKET = process.env.R2_BUCKET || "profile-images"
export const COMMUNITY_IMAGE_BUCKET = "community-images"
export const COMMUNITY_ICON_BUCKET = "community-icons"
export const COMMUNITY_BANNER_BUCKET = "community-banners"
export const BLOG_IMAGE_BUCKET = "blog-images"
// 클래스 썸네일 버킷: 환경변수 우선(철자 상이한 버킷명 대응), 기본값은 'class-thumbnails'
// 클래스 썸네일 버킷: 환경변수가 없고 실제 버킷명이 'class-thumnails'일 수 있어 이를 우선 반영
export const CLASS_THUMBNAIL_BUCKET = process.env.R2_CLASS_THUMBNAIL_BUCKET || "class-thumnails"
export const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || ""
export const R2_COMMUNITY_PUBLIC_BASE_URL = process.env.R2_COMMUNITY_PUBLIC_BASE_URL || ""
export const R2_JSON_CACHE_BUCKET = process.env.R2_JSON_CACHE_BUCKET || "json-cache"

// 프로필 이미지는 항상 내부 프록시를 사용해 안정적으로 서빙
export function buildPublicR2Url(key: string): string {
  const qp = new URLSearchParams({ key }).toString()
  return `/api/profile/avatar?${qp}`
}

export function buildPublicR2UrlForBucket(bucket: string, key: string): string {
  // 커뮤니티 이미지는 항상 내부 프록시를 사용해 안정적으로 서빙
  if (bucket === COMMUNITY_IMAGE_BUCKET || bucket === COMMUNITY_ICON_BUCKET || bucket === COMMUNITY_BANNER_BUCKET || bucket === CLASS_THUMBNAIL_BUCKET || bucket === BLOG_IMAGE_BUCKET) {
    const qp = new URLSearchParams({ bucket, key }).toString()
    return `/api/community-images/file?${qp}`
  }
  // 1) 버킷 전용 BASE 우선 사용
  if (bucket === COMMUNITY_IMAGE_BUCKET && R2_COMMUNITY_PUBLIC_BASE_URL) {
    const base = R2_COMMUNITY_PUBLIC_BASE_URL.replace(/\/$/, "")
    return `${base}/${key}`
  }
  // 2) 공통 BASE 사용 (버킷 경로가 포함된 경우)
  if (R2_PUBLIC_BASE_URL) {
    const base = R2_PUBLIC_BASE_URL.replace(/\/$/, "")
    // 공통 BASE가 특정 버킷 경로를 가리키면, 서로 다른 버킷에 대해 오용될 수 있으므로 방지
    const baseEndsWithProfile = /\/profile-images$/.test(base)
    const baseEndsWithCommunity = /\/community-images$/.test(base)
    if (bucket === PROFILE_IMAGE_BUCKET && baseEndsWithProfile) {
      return `${base}/${key}`
    }
    if (bucket === COMMUNITY_IMAGE_BUCKET && baseEndsWithCommunity) {
      return `${base}/${key}`
    }
    // BASE가 루트면 버킷 경로를 붙임
    if (!baseEndsWithProfile && !baseEndsWithCommunity) {
      return `${base}/${bucket}/${key}`
    }
  }
  // 3) 퍼블릭 BASE 불일치 또는 미지정: 표준 퍼블릭 엔드포인트 시도
  const direct = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}/${key}`
  // 4) 마지막 폴백: 프록시 (사설 버킷/권한 문제 대응)
  const qp = new URLSearchParams({ bucket, key }).toString()
  return `/api/community-images/file?${qp}`
}

export function extractKeyFromUrl(url?: string | null): string | null {
  if (!url) return null
  // /api/profile/avatar 프록시 URL 지원
  try {
    const parsed = new URL(url, 'http://localhost')
    if (parsed.pathname.includes('/api/community-images/file')) {
      const k = parsed.searchParams.get('key')
      if (k) return k
    }
    if (parsed.pathname.includes('/api/profile/avatar')) {
      const k = parsed.searchParams.get('key')
      if (k) return k
      const u = parsed.searchParams.get('url')
      if (u) return extractKeyFromUrl(u)
    }
    // 직접 R2 퍼블릭 도메인인 경우
    const rootBase = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    if (url.startsWith(rootBase + "/")) {
      const rest = url.substring(rootBase.length + 1) // e.g., "bucket/key"
      // rest 가 "<bucket>/<key>" 형태이면 key만 추출
      const firstSlash = rest.indexOf('/')
      if (firstSlash > 0) {
        const possibleBucket = rest.substring(0, firstSlash)
        const knownBuckets = [PROFILE_IMAGE_BUCKET, COMMUNITY_IMAGE_BUCKET, COMMUNITY_BANNER_BUCKET, CLASS_THUMBNAIL_BUCKET, BLOG_IMAGE_BUCKET, 'class-thumnails', 'class-thumbnails']
        if (knownBuckets.includes(possibleBucket)) {
          return rest.substring(firstSlash + 1)
        }
      }
      return rest
    }
  } catch {}
  const baseCandidates = [
    R2_PUBLIC_BASE_URL?.replace(/\/$/, ""),
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${PROFILE_IMAGE_BUCKET}`,
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${COMMUNITY_IMAGE_BUCKET}`,
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${COMMUNITY_BANNER_BUCKET}`,
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${CLASS_THUMBNAIL_BUCKET}`,
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BLOG_IMAGE_BUCKET}`,
  ].filter(Boolean) as string[]
  for (const base of baseCandidates) {
    if (url.startsWith(base + "/")) return url.substring(base.length + 1)
  }
  // 베이스가 다를 경우, 버킷명 이후 경로를 추출 시도
  for (const bucket of [PROFILE_IMAGE_BUCKET, COMMUNITY_IMAGE_BUCKET, COMMUNITY_BANNER_BUCKET, CLASS_THUMBNAIL_BUCKET, BLOG_IMAGE_BUCKET]) {
    const idx = url.indexOf(`${bucket}/`)
    if (idx >= 0) return url.substring(idx + `${bucket}/`.length)
  }
  return null
}

// 이미 저장된 아바타 URL(직접 R2/퍼블릭/프록시 혼재)을 프록시 URL로 정규화
export function normalizeProfileAvatarUrl(url?: string | null): string {
  const key = extractKeyFromUrl(url || undefined)
  if (key) return `/api/profile/avatar?${new URLSearchParams({ key }).toString()}`
  return url || ''
}

export function normalizeClassThumbnailUrl(url?: string | null): string {
  if (!url) return ''
  try {
    const parsed = new URL(url, 'http://localhost')
    // 프록시 경로이면서 버킷이 잘못되었으면 교정
    if (parsed.pathname.includes('/api/community-images/file')) {
      const b = parsed.searchParams.get('bucket')
      const k = parsed.searchParams.get('key')
      if (k && b !== CLASS_THUMBNAIL_BUCKET) {
        return buildPublicR2UrlForBucket(CLASS_THUMBNAIL_BUCKET, k)
      }
      return url
    }
  } catch {}
  const key = extractKeyFromUrl(url)
  if (key) return buildPublicR2UrlForBucket(CLASS_THUMBNAIL_BUCKET, key)
  return url
}

// --- JSON Cache helpers (for aggregates) ---
export async function getJsonCache(key: string): Promise<any | null> {
  try {
    const cmd = new GetObjectCommand({ Bucket: R2_JSON_CACHE_BUCKET, Key: key })
    const res: any = await r2Client.send(cmd)
    const text = await res.Body?.transformToString?.()
    if (!text) return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function putJsonCache(key: string, data: any, cacheSeconds: number = 60): Promise<void> {
  try {
    const body = Buffer.from(JSON.stringify(data))
    const cmd = new PutObjectCommand({
      Bucket: R2_JSON_CACHE_BUCKET,
      Key: key,
      Body: body,
      ContentType: "application/json",
      CacheControl: `public, max-age=${cacheSeconds}`,
    })
    await r2Client.send(cmd)
  } catch {}
}

export { PutObjectCommand, DeleteObjectCommand }
export { ListObjectsV2Command }


