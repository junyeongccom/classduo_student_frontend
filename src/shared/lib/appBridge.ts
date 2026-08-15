/**
 * @file appBridge.ts
 * @description 모바일 앱(RN WebView) 인증 브리지 — 앱 감지 / 토큰 갱신 수신 / 토큰 요청 발신
 * @module shared/lib
 * @dependencies utils(TOKEN_KEY), react(useIsAppWebView)
 */
'use client'

import { useEffect, useState } from 'react'
import { TOKEN_KEY } from './utils'

declare global {
  interface Window {
    /** 앱이 콘텐츠 로드 전에 주입하는 WebView 모드 플래그 */
    __CLASSDUO_APP__?: boolean
    /** RN WebView가 제공하는 웹→앱 메시지 채널 */
    ReactNativeWebView?: { postMessage: (data: string) => void }
  }
}

/** 앱→웹 토큰 갱신 푸시 메시지 타입 */
const MSG_TOKEN_REFRESHED = 'CLASSDUO_TOKEN_REFRESHED'
/** 웹→앱 토큰 요청 메시지 타입 */
const MSG_NEED_TOKEN = 'CLASSDUO_NEED_TOKEN'

/**
 * 앱 WebView 안에서 실행 중인지 여부 (SSR 안전)
 * 앱은 콘텐츠 로드 전에 window.__CLASSDUO_APP__ = true 를 주입한다.
 */
export function isAppWebView(): boolean {
  return typeof window !== 'undefined' && window.__CLASSDUO_APP__ === true
}

/**
 * 앱 WebView 여부를 React 상태로 노출하는 훅.
 * SSR/hydration 동안은 false → 마운트 후 실제 값으로 갱신 (hydration mismatch 방지).
 */
export function useIsAppWebView(): boolean {
  const [isApp, setIsApp] = useState(false)
  useEffect(() => {
    if (isAppWebView()) setIsApp(true)
  }, [])
  return isApp
}

/**
 * NEED_TOKEN 중복 발사 방지 플래그
 * 새 토큰(CLASSDUO_TOKEN_REFRESHED)을 수신하면 리셋된다.
 */
let needTokenRequested = false

/**
 * 앱에 새 access token을 요청한다 (웹→앱, 1회 발사).
 * 앱 WebView 모드가 아니면 아무 것도 하지 않는다. 자체 refresh는 시도하지 않는다.
 */
export function requestTokenFromApp(): void {
  if (!isAppWebView()) return
  if (needTokenRequested) return
  needTokenRequested = true
  try {
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: MSG_NEED_TOKEN }))
  } catch (error) {
    console.error('[appBridge] NEED_TOKEN 발사 실패:', error)
  }
}

/**
 * 앱→웹 토큰 갱신 푸시 수신 핸들러
 * payload: JSON 문자열 {type:'CLASSDUO_TOKEN_REFRESHED', accessToken: string}
 * 수신 시 localStorage 갱신만 한다 (계약 고정).
 */
function handleBridgeMessage(event: Event): void {
  // 앱 WebView 모드가 아니면 무시 — 일반 브라우저에서의 메시지 스푸핑 방어
  if (!isAppWebView()) return

  const data = (event as MessageEvent).data
  if (typeof data !== 'string') return

  try {
    const parsed = JSON.parse(data)
    if (
      parsed?.type === MSG_TOKEN_REFRESHED &&
      typeof parsed.accessToken === 'string' &&
      parsed.accessToken.length > 0
    ) {
      localStorage.setItem(TOKEN_KEY, parsed.accessToken)
      needTokenRequested = false
    }
  } catch {
    // JSON이 아닌 메시지 (GTM 등 타 스크립트) — 무시
  }
}

/**
 * 브리지 메시지 리스너 등록 (클라이언트 진입점에서 1회 호출).
 * iOS는 window, Android WebView는 document로 message 이벤트가 오므로 양쪽 모두 등록.
 * 앱 플래그가 없으면 리스너만 등록되고 아무 동작도 하지 않는다.
 * @returns 리스너 해제 cleanup 함수
 */
export function initAppBridge(): () => void {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener('message', handleBridgeMessage)
  document.addEventListener('message', handleBridgeMessage as EventListener)

  return () => {
    window.removeEventListener('message', handleBridgeMessage)
    document.removeEventListener('message', handleBridgeMessage as EventListener)
  }
}
