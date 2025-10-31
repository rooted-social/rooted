import sharp from "sharp"

type ProcessOptions = { animated?: boolean }

export async function toWebp(buffer: Buffer, quality = 80, opts?: ProcessOptions) {
  return sharp(buffer).webp({ quality, animated: !!opts?.animated }).toBuffer()
}

export async function processAvatar(buffer: Buffer, opts?: ProcessOptions) {
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 256, height: 256, fit: "cover" })
    .webp({ quality: 82, animated: !!opts?.animated })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}

export async function processCommunityIcon(buffer: Buffer, opts?: ProcessOptions) {
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 256, height: 256, fit: "cover" })
    .webp({ quality: 82, animated: !!opts?.animated })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}

export async function processCommunityImage(buffer: Buffer, opts?: ProcessOptions) {
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside" })
    .webp({ quality: 80, animated: !!opts?.animated })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}

export async function processCommunityImageVariants(buffer: Buffer, opts?: ProcessOptions) {
  const pipeline = sharp(buffer).rotate()
  const [sm, md, lg] = await Promise.all([
    pipeline.clone().resize({ width: 800, height: 800, fit: "inside" }).webp({ quality: 80, animated: !!opts?.animated }).toBuffer(),
    pipeline.clone().resize({ width: 1200, height: 1200, fit: "inside" }).webp({ quality: 80, animated: !!opts?.animated }).toBuffer(),
    pipeline.clone().resize({ width: 1600, height: 1600, fit: "inside" }).webp({ quality: 80, animated: !!opts?.animated }).toBuffer(),
  ])
  return {
    sm: { buffer: sm, contentType: "image/webp", ext: ".webp" },
    md: { buffer: md, contentType: "image/webp", ext: ".webp" },
    lg: { buffer: lg, contentType: "image/webp", ext: ".webp" },
  }
}

export async function processCommunityBanner(buffer: Buffer, opts?: ProcessOptions) {
  // 권장: 가로로 긴 비율 (예: 16:4 ~ 21:9). 최소 1600x400 목표, cover로 중앙 크롭
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 2000, height: 560, fit: "cover", position: "centre" })
    .webp({ quality: 80, animated: !!opts?.animated })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}

export async function processClassThumbnail(buffer: Buffer, opts?: ProcessOptions) {
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 800, height: 450, fit: "cover" })
    .webp({ quality: 80, animated: !!opts?.animated })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}

export async function processClassThumbnailVariants(buffer: Buffer, opts?: ProcessOptions) {
  const pipeline = sharp(buffer).rotate()
  const [sm, md, lg] = await Promise.all([
    pipeline.clone().resize({ width: 400, height: 225, fit: "cover" }).webp({ quality: 80, animated: !!opts?.animated }).toBuffer(),
    pipeline.clone().resize({ width: 800, height: 450, fit: "cover" }).webp({ quality: 80, animated: !!opts?.animated }).toBuffer(),
    pipeline.clone().resize({ width: 1200, height: 675, fit: "cover" }).webp({ quality: 80, animated: !!opts?.animated }).toBuffer(),
  ])
  return {
    sm: { buffer: sm, contentType: "image/webp", ext: ".webp" },
    md: { buffer: md, contentType: "image/webp", ext: ".webp" },
    lg: { buffer: lg, contentType: "image/webp", ext: ".webp" },
  }
}

export async function processBlogImage(buffer: Buffer, opts?: ProcessOptions) {
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 1200, fit: "inside" })
    .webp({ quality: 80, animated: !!opts?.animated })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}

export async function processBlogImageVariants(buffer: Buffer, opts?: ProcessOptions) {
  const pipeline = sharp(buffer).rotate()
  const [sm, md, lg] = await Promise.all([
    pipeline.clone().resize({ width: 400, fit: "inside" }).webp({ quality: 80, animated: !!opts?.animated }).toBuffer(),
    pipeline.clone().resize({ width: 800, fit: "inside" }).webp({ quality: 80, animated: !!opts?.animated }).toBuffer(),
    pipeline.clone().resize({ width: 1200, fit: "inside" }).webp({ quality: 80, animated: !!opts?.animated }).toBuffer(),
  ])
  return {
    sm: { buffer: sm, contentType: "image/webp", ext: ".webp" },
    md: { buffer: md, contentType: "image/webp", ext: ".webp" },
    lg: { buffer: lg, contentType: "image/webp", ext: ".webp" },
  }
}

export async function processBlogThumbnail(buffer: Buffer, opts?: ProcessOptions) {
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 1200, height: 750, fit: "cover", position: "centre" })
    .webp({ quality: 80, animated: !!opts?.animated })
    .toBuffer()
  return { buffer: webp, contentType: "image/webp", ext: ".webp" }
}


export async function getImageMeta(buffer: Buffer) {
  const meta = await sharp(buffer).metadata()
  return {
    width: meta.width || 0,
    height: meta.height || 0,
    bytes: buffer.length,
    contentType: 'image/webp',
  }
}

