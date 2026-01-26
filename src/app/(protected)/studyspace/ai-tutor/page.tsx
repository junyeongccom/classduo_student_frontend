'use client'

import { Suspense } from 'react'
import { AITutorContainer } from '@/features/ai-tutor/components/containers/AITutorContainer'
import { Loader2 } from 'lucide-react'

export default function AITutorPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
        </div>
      }
    >
      <AITutorContainer />
    </Suspense>
  )
}
