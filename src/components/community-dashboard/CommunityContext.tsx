"use client"

import React, { createContext, useContext } from 'react'

type CommunityContextValue = {
  brandColor: string | null
}

const CommunityContext = createContext<CommunityContextValue>({ brandColor: null })

export function CommunityProvider({ value, children }: { value: CommunityContextValue; children: React.ReactNode }) {
  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>
}

export function useCommunityContext() {
  return useContext(CommunityContext)
}


