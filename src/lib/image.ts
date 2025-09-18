import sharp from "sharp"

export async function toWebp(buffer: Buffer, quality = 80) {
  return sharp(buffer).webp({ quality }).toBuffer()
}

export async function processAvatar(buffer: Buffer) {
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 256, height: 256, fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}

export async function processCommunityIcon(buffer: Buffer) {
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 256, height: 256, fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}

export async function processCommunityImage(buffer: Buffer) {
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside" })
    .webp({ quality: 80 })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}

export async function processCommunityBanner(buffer: Buffer) {
  // 권장: 가로로 긴 비율 (예: 16:4 ~ 21:9). 최소 1600x400 목표, cover로 중앙 크롭
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 2000, height: 560, fit: "cover", position: "centre" })
    .webp({ quality: 80 })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}

export async function processClassThumbnail(buffer: Buffer) {
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 800, height: 450, fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}

export async function processBlogImage(buffer: Buffer) {
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 1200, fit: "inside" })
    .webp({ quality: 80 })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}

export async function processBlogImageVariants(buffer: Buffer) {
  const pipeline = sharp(buffer).rotate()
  const [sm, md, lg] = await Promise.all([
    pipeline.clone().resize({ width: 400, fit: "inside" }).webp({ quality: 80 }).toBuffer(),
    pipeline.clone().resize({ width: 800, fit: "inside" }).webp({ quality: 80 }).toBuffer(),
    pipeline.clone().resize({ width: 1200, fit: "inside" }).webp({ quality: 80 }).toBuffer(),
  ])
  return {
    sm: { buffer: sm, contentType: "image/webp", ext: ".webp" },
    md: { buffer: md, contentType: "image/webp", ext: ".webp" },
    lg: { buffer: lg, contentType: "image/webp", ext: ".webp" },
  }
}

export async function processBlogThumbnail(buffer: Buffer) {
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 1200, height: 750, fit: "cover", position: "centre" })
    .webp({ quality: 80 })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}

