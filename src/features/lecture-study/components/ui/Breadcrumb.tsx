/**
 * @file Breadcrumb.tsx
 * @description 회차별 학습 Breadcrumb 네비게이션
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react
 */

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
          {item.href ? (
            <Link href={item.href} className="max-w-[200px] truncate hover:text-gray-900 transition-colors" title={item.label}>
              {item.label}
            </Link>
          ) : (
            <span className="max-w-[200px] truncate text-gray-900 font-medium" title={item.label}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
