"use client"

import { cn } from "@/lib/utils"

interface SectionTitleProps {
  title: string
  description?: string | null
  className?: string
}

export function SectionTitle({ title, description, className }: SectionTitleProps) {
  return (
    <div className={cn("space-y-1.5 text-center", className)}>
      <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-900 to-slate-700 px-3 py-1 text-md font-medium text-white">
        <span className="inline-block size-1.5 rounded-full bg-white/80" />
        <span className="opacity-90 line-clamp-1">{title}</span>
      </div>
      {description && (
        <p className="text-sm text-slate-600">
          {description}
        </p>
      )}
    </div>
  )
}

export default SectionTitle


