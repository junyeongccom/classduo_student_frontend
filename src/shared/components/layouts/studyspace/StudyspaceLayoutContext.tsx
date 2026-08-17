'use client'

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react'

interface StudyspaceLayoutContextValue {
  topbar: ReactNode | null
  setTopbar: Dispatch<SetStateAction<ReactNode | null>>
}

const StudyspaceLayoutContext = createContext<StudyspaceLayoutContextValue | null>(null)

export function StudyspaceLayoutProvider({ children }: { children: ReactNode }) {
  const [topbar, setTopbar] = useState<ReactNode | null>(null)

  const value = useMemo(
    () => ({
      topbar,
      setTopbar,
    }),
    [topbar]
  )

  return (
    <StudyspaceLayoutContext.Provider value={value}>
      {children}
    </StudyspaceLayoutContext.Provider>
  )
}

export function useStudyspaceLayoutSlots() {
  const context = useContext(StudyspaceLayoutContext)

  if (!context) {
    throw new Error('useStudyspaceLayoutSlots must be used within StudyspaceLayoutProvider')
  }

  return context
}

export function StudyspaceTopbarSlot({ children }: { children: ReactNode }) {
  const { setTopbar } = useStudyspaceLayoutSlots()
  useEffect(() => {
    setTopbar(children)
  }, [children, setTopbar])
  useEffect(() => () => setTopbar(null), [setTopbar])

  return null
}


