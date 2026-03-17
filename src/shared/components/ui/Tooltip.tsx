/**
 * @file Tooltip.tsx
 * @description shadcn/ui 스타일 Tooltip 컴포넌트 (Radix 기반)
 * @module shared/components/ui
 * @dependencies @radix-ui/react-tooltip
 */

'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/shared/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

/**
 * 터치 디바이스에서 탭으로 열리는 Tooltip 래퍼.
 * hover가 없는 환경(태블릿 등)에서 collapsed 사이드바 아이콘에 사용.
 */
function TouchTooltip({ children, ...props }: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) {
  const [open, setOpen] = React.useState(false)
  const isTouch = React.useRef(false)

  React.useEffect(() => {
    isTouch.current = window.matchMedia('(pointer: coarse)').matches
  }, [])

  return (
    <TooltipPrimitive.Root
      {...props}
      open={open}
      onOpenChange={(v) => {
        // hover 디바이스에서는 기본 동작
        if (!isTouch.current) {
          setOpen(v)
        }
      }}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === TooltipTrigger) {
          return React.cloneElement(child as React.ReactElement<any>, {
            onClick: (e: React.MouseEvent) => {
              if (isTouch.current) {
                setOpen((prev) => !prev)
              }
              // 원래 onClick도 호출
              const originalOnClick = (child as React.ReactElement<any>).props.onClick
              if (originalOnClick) originalOnClick(e)
            },
            onBlur: () => {
              if (isTouch.current) setOpen(false)
            },
          })
        }
        return child
      })}
    </TooltipPrimitive.Root>
  )
}

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-md animate-in fade-in-0 zoom-in-95',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className,
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TouchTooltip }
