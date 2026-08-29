'use client'

import { useEffect } from 'react'
import { boot } from '@/lib/store'

/** Seeds the sample load once and loads it into memory before anything reads
 *  it. Rendered in the layout so every page gets it without repeating. */
export function Boot() {
  useEffect(() => {
    boot().catch((err) => console.error('[mgao] could not open the book', err))
  }, [])
  return null
}
