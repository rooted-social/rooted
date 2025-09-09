"use client"

import { useQuery } from '@tanstack/react-query'
import { getCommunity } from '@/lib/communities'

export function useCommunityBySlug(slug?: string) {
  return useQuery({
    queryKey: ['community', 'by-slug', slug],
    enabled: !!slug,
    queryFn: async () => await getCommunity(slug as string),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 20,
  })
}


