"use client"

import Image from 'next/image'

interface ExamPrepLoadingStateProps {
  message: string
}

export function ExamPrepLoadingState({ message }: ExamPrepLoadingStateProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 py-10 text-center text-sm text-gray-500">
      <Image src="/KUI.png" alt="KUI" width={120} height={120} />
      <p>{message}</p>
    </div>
  )
}

