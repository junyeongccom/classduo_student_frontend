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
  rightbar: ReactNode | null
  overlay: ReactNode | null
  setTopbar: Dispatch<SetStateAction<ReactNode | null>>
  setRightbar: Dispatch<SetStateAction<ReactNode | null>>
  setOverlay: Dispatch<SetStateAction<ReactNode | null>>
}

const StudyspaceLayoutContext = createContext<StudyspaceLayoutContextValue | null>(null)

export function StudyspaceLayoutProvider({ children }: { children: ReactNode }) {
  const [topbar, setTopbar] = useState<ReactNode | null>(null)
  const [rightbar, setRightbar] = useState<ReactNode | null>(null)
  const [overlay, setOverlay] = useState<ReactNode | null>(null)

  const value = useMemo(
    () => ({
      topbar,
      rightbar,
      overlay,
      setTopbar,
      setRightbar,
      setOverlay,
    }),
    [topbar, rightbar, overlay]
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

function createSlotSetter(
  setter: Dispatch<SetStateAction<ReactNode | null>>,
  node: ReactNode | null
) {
  setter(node)
  return () => setter(prev => (prev === node ? null : prev))
}

export function StudyspaceTopbarSlot({ children }: { children: ReactNode }) {
  const { setTopbar } = useStudyspaceLayoutSlots()

  useEffect(() => createSlotSetter(setTopbar, children), [children, setTopbar])

  return null
}

export function StudyspaceRightbarSlot({ children }: { children: ReactNode }) {
  const { setRightbar } = useStudyspaceLayoutSlots()

  useEffect(() => createSlotSetter(setRightbar, children), [children, setRightbar])

  return null
}

export function StudyspaceOverlaySlot({ children }: { children: ReactNode }) {
  const { setOverlay } = useStudyspaceLayoutSlots()

  useEffect(() => createSlotSetter(setOverlay, children), [children, setOverlay])

  return null
}


