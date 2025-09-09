"use client"

import { AnimatedBackground } from '@/components/AnimatedBackground'

export default function Loading() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <main className="relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-5 pb-24 z-10">
        <div className="w-full">
          <div className="animate-pulse space-y-4 sm:space-y-6">
            <div className="h-8 sm:h-10 bg-gray-200 rounded w-48 sm:w-64" />
            <div className="h-48 sm:h-64 bg-gray-200 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="h-40 sm:h-48 bg-gray-200 rounded" />
              <div className="h-40 sm:h-48 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


