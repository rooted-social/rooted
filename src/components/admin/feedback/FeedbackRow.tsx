'use client'

import { useState } from 'react'

export default function FeedbackRow({ f, profileName }: { f: any; profileName?: string }) {
  const [showTitle, setShowTitle] = useState(false)
  const [showContent, setShowContent] = useState(false)

  const title: string = f?.title || ''
  const content: string = f?.content || ''

  const displayTitle = showTitle ? title : (title.length > 25 ? title.slice(0, 25) + '…' : title)
  const displayContent = showContent ? content : (content.length > 150 ? content.slice(0, 150) + '…' : content)

  return (
    <tr className="border-b align-top">
      <td className="px-2 py-2 whitespace-nowrap max-w-[260px]">
        <div className="font-medium">{profileName || '-'}</div>
        <div className="text-xs text-slate-500">{f.user_email || '-'}</div>
      </td>
      <td className="px-2 py-2 font-medium max-w-[280px]">
        <div className="truncate" title={showTitle ? undefined : title}>{displayTitle}</div>
        {title.length > 25 && (
          <button
            className="mt-1 text-xs text-slate-600 underline underline-offset-2 hover:text-slate-900"
            onClick={() => setShowTitle(v => !v)}
          >
            {showTitle ? '접기' : '더 보기'}
          </button>
        )}
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        {f.category === 'ops' && <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">운영 관련</span>}
        {f.category === 'feature' && <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">기능 관련</span>}
        {f.category === 'billing' && <span className="rounded bg-violet-100 px-2 py-1 text-xs text-violet-800">정산 및 비용</span>}
        {f.category === 'general' && <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-800">일반 문의</span>}
      </td>
      <td className="px-2 py-2 text-slate-700 max-w-[600px]">
        <div className="whitespace-pre-wrap break-words" title={showContent ? undefined : content}>{displayContent}</div>
        {content.length > 150 && (
          <button
            className="mt-1 text-xs text-slate-600 underline underline-offset-2 hover:text-slate-900"
            onClick={() => setShowContent(v => !v)}
          >
            {showContent ? '접기' : '더 보기'}
          </button>
        )}
      </td>
      <td className="px-2 py-2 whitespace-nowrap">{new Date(f.created_at).toLocaleString()}</td>
    </tr>
  )
}


