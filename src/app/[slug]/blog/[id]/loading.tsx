export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse">
      <div className="h-8 w-2/3 bg-slate-200 rounded mb-4" />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-24 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="h-6 w-14 bg-slate-200 rounded-full" />
      </div>
      <div className="h-40 w-full bg-slate-200 rounded-2xl" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-full bg-slate-200 rounded" />
        <div className="h-4 w-11/12 bg-slate-200 rounded" />
        <div className="h-4 w-10/12 bg-slate-200 rounded" />
      </div>
    </div>
  )
}


