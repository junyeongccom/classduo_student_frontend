/**
 * @file MisconceptionDefenseGame.tsx
 * @description 오개념 방어전 — 연필을 날려 마디별 HP를 가진 오개념 군체를 격파하고, 보물상자 마디에서
 *              퀴즈를 맞혀 학습도구 무기를 강화·획득하는 슈팅 학습 게임 (세포특공대 방식)
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, /public/game7 에셋(히어로=서비스 캐릭터, 무기=학용품)
 *
 * 학습 접목:
 * 1) 무기는 전부 학습도구 — 기본탄 연필, 보조무기 지우개 폭탄·형광펜 빔·자 부메랑.
 * 2) 강화는 "보물상자 마디 격파 → 용어 퀴즈 정답"으로만 얻는다. 뒤쪽 마디 HP가 급격히 커지므로
 *    퀴즈를 맞혀 강화하지 않으면 클리어가 불가능하다 → 이기려면 반드시 용어를 학습해야 한다.
 *
 * 구현 구조: 모든 좌표 계산은 가상 좌표계(VW×VH)에서 하고, 렌더는 % 로 변환해 DOM 을 직접 갱신한다.
 * 탄·데미지숫자·이펙트는 고정 크기 풀(pool)로 미리 렌더해두고 활성/비활성만 토글하므로 프레임마다
 * 리렌더가 발생하지 않는다. React state 는 HUD·페이즈 전환용으로만 쓴다.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Heart, Sparkles, Crosshair } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GameWord {
  keyword: string
  description: string
}

interface MisconceptionDefenseGameProps {
  words: GameWord[]
  onClose: (score: number | null) => void
}

/* ── 가상 좌표계 ── */
const VW = 1344
const VH = 768
/** 플레이어(=나선의 중심) */
const CX = VW / 2
const CY = VH / 2
/** x 반지름 배수 — 보드가 가로로 넓으므로 나선을 타원으로 그린다 */
const RING_ASPECT = 1.5
/**
 * 나선 구조: 머리는 t(=나선 각도)가 클수록 안쪽, 꼬리는 t 가 작아 바깥에 있다.
 *   r(t) = SPIRAL_OUT - SPIRAL_B * t
 * 머리의 t 가 시간에 따라 커지므로, 긴 몬스터가 원을 그리며 중심(캐릭터)으로 감겨 들어온다.
 */
const SPIRAL_OUT = 360
/** 한 바퀴(2π)당 반지름 감소량 — 나선 바퀴 간격 */
const SPIRAL_GAP = 142
const SPIRAL_B = SPIRAL_GAP / (2 * Math.PI)
/** 머리가 이 반지름 안으로 들어오면 방어막 손실 */
const DANGER_R = 118
/** 머리 각속도 (rad/s) */
const ROT_PER_SEC = 0.28
/** 마디 사이의 호 길이 — 각도 대신 호 길이를 고정해 종이 띠가 끊기지 않게 한다 */
const SEG_ARC = 128
/** 마디 충돌 반경 */
const SEG_R = 46
/** 마디 렌더 폭 (가상 단위) — SEG_ARC 보다 커야 띠가 이어져 보인다 */
const SEG_W = 164
const TOTAL_SEGMENTS = 22
/** 마디 하나 격파 시 몬스터가 되돌려지는 나선 각도 */
const PUSHBACK_RAD = 0.95
/** 피격 시 되돌려지는 나선 각도 */
const KNOCKBACK_RAD = 3.2
const START_HP = 3
/** 연필 기본 속도 (가상 단위/초) */
const PENCIL_SPEED = 660

/** 풀 크기 */
const BULLET_POOL = 64
const SPECIAL_POOL = 14
const DMG_POOL = 24
const SPARK_POOL = 12
const BURST_POOL = 6

type WeaponId = 'eraser' | 'highlighter' | 'ruler'

/** 보조 무기(학습도구) 스펙 — 레벨업하면 피해량↑ 쿨다운↓ */
const WEAPON_SPEC: Record<WeaponId, {
  cd: number; dmg: number; speed: number; r: number; splash: number; pierce: number; w: number; sprite: string
}> = {
  // 지우개 폭탄 — 느리지만 광역으로 오개념을 "지운다"
  eraser: { cd: 3.4, dmg: 58, speed: 300, r: 1.9, splash: 132, pierce: 0, w: 5.6, sprite: '/game7/wpn_eraser.png' },
  // 형광펜 빔 — 초고속 관통, 지나가는 마디 전부에 밑줄을 긋는다
  highlighter: { cd: 4.6, dmg: 36, speed: 1560, r: 1.3, splash: 0, pierce: 99, w: 3.4, sprite: '/game7/wpn_highlighter.png' },
  // 자 부메랑 — 넓은 히트박스로 여러 마디를 훑는다
  ruler: { cd: 2.8, dmg: 40, speed: 540, r: 2.2, splash: 0, pierce: 3, w: 5.2, sprite: '/game7/wpn_ruler.png' },
}

interface Segment {
  id: number
  hp: number
  maxHp: number
  kind: 'head' | 'elite' | 'tough' | 'normal'
  /** 보물상자 등급 (없으면 null) */
  chest: 'blue' | 'purple' | null
  alive: boolean
}

interface Shot {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  dmg: number
  crit: boolean
  pierce: number
  /** 히트박스 배수 */
  r: number
  /** 광역 반경 (0 = 단일 타격) */
  splash: number
  /** 이미 명중한 마디 (관통 시 중복 타격 방지) */
  hit: Set<number>
  /** 보조무기 종류 (연필은 null) */
  kind: WeaponId | null
}

type UpgradeId =
  | 'pencilCount' | 'pencilDamage' | 'pencilSpeed' | 'pencilRate' | 'pencilPierce' | 'pencilCrit'
  | 'wpnEraser' | 'wpnHighlighter' | 'wpnRuler'

interface Upgrade {
  id: UpgradeId
  icon: string
  tier: 'common' | 'rare'
  /** 보조무기 획득 카드면 해당 무기 id */
  weapon?: WeaponId
}

const UPGRADES: Upgrade[] = [
  // 연필 강화 (일반)
  { id: 'pencilCount', icon: '/game7/upg_pencil_count.png', tier: 'common' },
  { id: 'pencilDamage', icon: '/game7/upg_pencil_damage.png', tier: 'common' },
  { id: 'pencilSpeed', icon: '/game7/upg_pencil_speed.png', tier: 'common' },
  { id: 'pencilRate', icon: '/game7/upg_pencil_rate.png', tier: 'common' },
  // 연필 강화 (희귀)
  { id: 'pencilPierce', icon: '/game7/upg_pencil_pierce.png', tier: 'rare' },
  { id: 'pencilCrit', icon: '/game7/upg_crit.png', tier: 'rare' },
  // 학습도구 보조무기 (희귀)
  { id: 'wpnEraser', icon: '/game7/wpn_eraser.png', tier: 'rare', weapon: 'eraser' },
  { id: 'wpnHighlighter', icon: '/game7/wpn_highlighter.png', tier: 'rare', weapon: 'highlighter' },
  { id: 'wpnRuler', icon: '/game7/wpn_ruler.png', tier: 'rare', weapon: 'ruler' },
]

interface QuizSet {
  answer: GameWord
  options: GameWord[]
  /** 이 퀴즈를 띄운 상자 등급 — 희귀 상자는 희귀 강화만 제시 */
  tier: 'blue' | 'purple'
}

interface Stats {
  damage: number
  fireRate: number
  bullets: number
  pierce: number
  speedMul: number
  crit: number
}

const BASE_STATS: Stats = { damage: 9, fireRate: 1.1, bullets: 1, pierce: 0, speedMul: 1, crit: 0 }
const BASE_WEAPONS: Record<WeaponId, number> = { eraser: 0, highlighter: 0, ruler: 0 }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 나선 각도 t 에서의 반지름 (t 가 클수록 중심에 가깝다) */
function spiralR(t: number) {
  return SPIRAL_OUT - SPIRAL_B * t
}

/** 나선 각도 t 의 화면 좌표 */
function spiralPoint(t: number) {
  const r = spiralR(t)
  return { x: CX + r * RING_ASPECT * Math.cos(t), y: CY + r * Math.sin(t), th: t, r }
}

/**
 * 한 마디 뒤(바깥)로 물러날 각도 폭.
 * 각도를 균등 분할하면 장축과 바깥쪽에서 마디가 벌어지므로, 그 지점의 호 미분 길이로 나눠
 * "호 길이 균등" 배치를 만든다 → 몸통이 하나의 띠로 이어진다.
 */
function spiralStep(t: number) {
  const r = spiralR(t)
  const dl = Math.hypot(r * RING_ASPECT * Math.sin(t), r * Math.cos(t))
  return SEG_ARC / Math.max(50, dl)
}

export function MisconceptionDefenseGame({ words, onClose }: MisconceptionDefenseGameProps) {
  const t = useTranslations('lectureStudy.game.play')

  const pool = useMemo(() => {
    const seen = new Set<string>()
    return words.filter(w => {
      if (!w.keyword || !w.description || seen.has(w.keyword)) return false
      seen.add(w.keyword)
      return true
    })
  }, [words])

  const [hero, setHero] = useState<'boy' | 'girl'>('boy')
  const [started, setStarted] = useState(false)
  const [hp, setHp] = useState(START_HP)
  const [score, setScore] = useState(0)
  const [killed, setKilled] = useState(0)
  const [left, setLeft] = useState(TOTAL_SEGMENTS)
  const [phase, setPhase] = useState<'battle' | 'quiz' | 'reward' | 'finished'>('battle')
  const [quiz, setQuiz] = useState<QuizSet | null>(null)
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null)
  const [rewardChoices, setRewardChoices] = useState<Upgrade[]>([])
  const [stats, setStats] = useState<Stats>(BASE_STATS)
  const [weapons, setWeapons] = useState<Record<WeaponId, number>>(BASE_WEAPONS)
  const [cleared, setCleared] = useState(false)

  const statsRef = useRef(stats)
  const weaponsRef = useRef(weapons)
  useEffect(() => { statsRef.current = stats }, [stats])
  useEffect(() => { weaponsRef.current = weapons }, [weapons])

  /* ── 게임 상태 (ref 가 권위) ── */
  const segsRef = useRef<Segment[]>([])
  /** 머리의 나선 각도 — 커질수록 몬스터가 중심(플레이어)으로 감겨 들어온다 */
  const headTRef = useRef(0)
  /** 프레임마다 계산한 마디 좌표 캐시 (충돌 판정과 렌더가 같은 값을 쓴다) */
  const posRef = useRef<({ x: number; y: number; th: number } | null)[]>([])
  /** 조준 지점 — null 이면 선두 마디를 자동 조준 */
  const aimRef = useRef<{ x: number; y: number } | null>(null)
  const shotsRef = useRef<Shot[]>([])
  const specialsRef = useRef<Shot[]>([])
  const wpnCdRef = useRef<Record<WeaponId, number>>({ eraser: 0, highlighter: 0, ruler: 0 })
  const pausedRef = useRef(false)
  const lastFrameRef = useRef(0)
  const lastShotRef = useRef(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  /* ── DOM 참조 ── */
  const boardRef = useRef<HTMLDivElement>(null)
  const segElsRef = useRef<(HTMLDivElement | null)[]>([])
  const segHpElsRef = useRef<(HTMLSpanElement | null)[]>([])
  const segImgElsRef = useRef<(HTMLImageElement | null)[]>([])
  const bulletElsRef = useRef<(HTMLDivElement | null)[]>([])
  const specialElsRef = useRef<(HTMLDivElement | null)[]>([])
  const dmgElsRef = useRef<(HTMLDivElement | null)[]>([])
  const sparkElsRef = useRef<(HTMLDivElement | null)[]>([])
  const burstElsRef = useRef<(HTMLDivElement | null)[]>([])
  const playerElRef = useRef<HTMLDivElement>(null)
  const gunElRef = useRef<HTMLDivElement>(null)
  const dmgCursor = useRef(0)
  const sparkCursor = useRef(0)
  const burstCursor = useRef(0)

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  /** 마디 생성 — 뒤로 갈수록 HP 급증, 4번째마다 보물상자(8번째는 희귀) */
  const buildSegments = useCallback((): Segment[] => {
    return Array.from({ length: TOTAL_SEGMENTS }, (_, i) => {
      const hp = Math.round(18 * Math.pow(1.15, i))   // 18 → 약 345 (총합 ≈ 2,240)
      const kind: Segment['kind'] =
        i === 0 ? 'head' : i >= TOTAL_SEGMENTS * 0.75 ? 'elite' : i >= TOTAL_SEGMENTS * 0.4 ? 'tough' : 'normal'
      const chest: Segment['chest'] = i > 0 && i % 4 === 3 ? (i % 8 === 7 ? 'purple' : 'blue') : null
      return { id: i, hp, maxHp: hp, kind, chest, alive: true }
    })
  }, [])

  const newShot = (): Shot => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, dmg: 0, crit: false,
    pierce: 0, r: 1, splash: 0, hit: new Set<number>(), kind: null,
  })

  const resetWorld = useCallback(() => {
    segsRef.current = buildSegments()
    headTRef.current = 0
    posRef.current = []
    aimRef.current = null
    shotsRef.current = Array.from({ length: BULLET_POOL }, newShot)
    specialsRef.current = Array.from({ length: SPECIAL_POOL }, newShot)
    wpnCdRef.current = { eraser: 0, highlighter: 0, ruler: 0 }
    bulletElsRef.current.forEach(el => { if (el) el.style.display = 'none' })
    specialElsRef.current.forEach(el => { if (el) el.style.display = 'none' })
    segElsRef.current.forEach(el => { if (el) el.style.display = '' })
    segsRef.current.forEach((s, i) => {
      const hpEl = segHpElsRef.current[i]
      if (hpEl) hpEl.textContent = String(s.hp)
    })
  }, [buildSegments])

  useEffect(() => {
    resetWorld()
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const beginGame = useCallback(() => {
    setStarted(true)
    pausedRef.current = false
    lastFrameRef.current = performance.now()
    lastShotRef.current = performance.now()
  }, [])

  /* ── 이펙트 재생 (풀 재사용 — 애니메이션 재시작 트릭) ── */
  const playFx = (
    refs: React.MutableRefObject<(HTMLDivElement | null)[]>,
    cursor: React.MutableRefObject<number>,
    size: number,
    x: number,
    y: number,
    anim: string,
    opts?: { text?: string; color?: string; scale?: number },
  ) => {
    const idx = cursor.current % size
    cursor.current += 1
    const el = refs.current[idx]
    if (!el) return
    el.style.left = `${(x / VW) * 100}%`
    el.style.top = `${(y / VH) * 100}%`
    el.style.display = 'block'
    if (opts?.text !== undefined) el.textContent = opts.text
    if (opts?.color) el.style.color = opts.color
    if (opts?.scale) el.style.width = `${opts.scale}%`
    el.style.animation = 'none'
    void el.offsetWidth
    el.style.animation = anim
  }

  /** 전투 일시정지 시 날아가던 발사체를 모두 회수한다 (화면에 정지 잔상이 남지 않게) */
  const clearShots = useCallback(() => {
    for (const arr of [shotsRef.current, specialsRef.current]) arr.forEach(b => { b.active = false })
    bulletElsRef.current.forEach(el => { if (el) el.style.display = 'none' })
    specialElsRef.current.forEach(el => { if (el) el.style.display = 'none' })
  }, [])

  /** 보물상자 격파 → 퀴즈 출제 (정답만 강화 획득) */
  const openChestQuiz = useCallback((tier: 'blue' | 'purple') => {
    if (pool.length < 2) return
    const answer = pool[Math.floor(Math.random() * pool.length)]
    const distractors = shuffle(pool.filter(w => w.keyword !== answer.keyword)).slice(0, 3)
    pausedRef.current = true
    clearShots()
    setQuiz({ answer, options: shuffle([answer, ...distractors]), tier })
    setQuizResult(null)
    setPhase('quiz')
  }, [pool, clearShots])

  const resumeBattle = useCallback(() => {
    setQuiz(null)
    setRewardChoices([])
    setPhase('battle')
    pausedRef.current = false
    lastFrameRef.current = performance.now()
    lastShotRef.current = performance.now()
  }, [])

  const answerQuiz = useCallback((picked: GameWord) => {
    if (!quiz || quizResult) return
    const ok = picked.keyword === quiz.answer.keyword
    setQuizResult(ok ? 'correct' : 'wrong')
    if (ok) {
      setScore(s => s + 150)
      const tier = quiz.tier
      const timer = setTimeout(() => {
        // 희귀 상자 → 희귀 강화(관통·치명타·학습도구 무기) 3택, 일반 상자 → 전체에서 3택
        const src = tier === 'purple' ? UPGRADES.filter(u => u.tier === 'rare') : UPGRADES
        setRewardChoices(shuffle(src).slice(0, 3))
        setPhase('reward')
      }, 800)
      timersRef.current.push(timer)
    } else {
      const timer = setTimeout(resumeBattle, 1500)
      timersRef.current.push(timer)
    }
  }, [quiz, quizResult, resumeBattle])

  const pickUpgrade = useCallback((u: Upgrade) => {
    if (u.weapon) {
      const w = u.weapon
      setWeapons(prev => ({ ...prev, [w]: prev[w] + 1 }))
    } else {
      setStats(prev => {
        switch (u.id) {
          case 'pencilDamage': return { ...prev, damage: Math.round(prev.damage * 1.7) }
          case 'pencilRate': return { ...prev, fireRate: Math.round((prev.fireRate + 0.7) * 10) / 10 }
          case 'pencilSpeed': return { ...prev, speedMul: Math.round(prev.speedMul * 1.35 * 100) / 100 }
          case 'pencilCount': return { ...prev, bullets: prev.bullets + 1 }
          case 'pencilPierce': return { ...prev, pierce: prev.pierce + 1 }
          case 'pencilCrit': return { ...prev, crit: Math.min(0.75, prev.crit + 0.2) }
          default: return prev
        }
      })
    }
    resumeBattle()
  }, [resumeBattle])

  /* ── 포인터 조준 ── */
  const handlePointer = useCallback((e: React.PointerEvent) => {
    const r = boardRef.current?.getBoundingClientRect()
    if (!r || r.width === 0) return
    aimRef.current = {
      x: ((e.clientX - r.left) / r.width) * VW,
      y: ((e.clientY - r.top) / r.height) * VH,
    }
  }, [])

  /** 루프에서 참조할 최신 퀴즈 오픈 함수 (의존성으로 넣으면 rAF 가 매번 재시작된다) */
  const openChestQuizRef = useRef(openChestQuiz)
  useEffect(() => { openChestQuizRef.current = openChestQuiz }, [openChestQuiz])

  /* ── 메인 루프 ── */
  useEffect(() => {
    if (!started || phase === 'finished') return
    let raf = 0

    const loop = () => {
      try {
      const now = performance.now()
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000)
      lastFrameRef.current = now

      if (!pausedRef.current) {
        const st = statsRef.current
        const wpn = weaponsRef.current
        const segs = segsRef.current

        // 1) 몬스터가 나선을 그리며 중심으로 다가온다 + 마디 배치
        //    머리(가장 앞 살아있는 마디)부터 뒤로 가며 t 를 줄이면 꼬리가 바깥에 놓인다
        headTRef.current += ROT_PER_SEC * dt
        let th = headTRef.current
        for (let i = 0; i < segs.length; i++) {
          if (!segs[i].alive) { posRef.current[i] = null; continue }
          const p = spiralPoint(th)
          th -= spiralStep(th)
          posRef.current[i] = p
          const el = segElsRef.current[i]
          if (el) {
            el.style.left = `${(p.x / VW) * 100}%`
            el.style.top = `${(p.y / VH) * 100}%`
          }
          // 이미지만 접선 방향으로 회전 — HP 숫자는 똑바로 유지된다
          const img = segImgElsRef.current[i]
          if (img) img.style.transform = `rotate(${p.th + Math.PI / 2}rad)`
        }

        // 2) 조준 방향 — 포인터가 없으면 가장 가까운 마디를 자동 조준. 플레이어는 링 중심에 고정
        let tx: number, ty: number
        if (aimRef.current) {
          tx = aimRef.current.x; ty = aimRef.current.y
        } else {
          let best: { x: number; y: number } | null = null
          let bestD = Infinity
          for (let i = 0; i < segs.length; i++) {
            const p = posRef.current[i]
            if (!p) continue
            const d = (p.x - CX) ** 2 + (p.y - CY) ** 2
            if (d < bestD) { bestD = d; best = p }
          }
          tx = best ? best.x : CX
          ty = best ? best.y : CY - 100
        }
        // 링 중심에서 360° 어느 방향으로든 쏜다
        const ang = Math.atan2(ty - CY, tx - CX) || 0
        if (gunElRef.current) gunElRef.current.style.transform = `translate(-50%,-50%) rotate(${ang + Math.PI / 2}rad)`

        /** 발사체 하나 생성 */
        const spawn = (
          arr: Shot[], a: number, cfg: Partial<Shot> & { speed: number },
        ) => {
          const b = arr.find(x => !x.active)
          if (!b) return
          b.active = true
          b.x = CX + Math.cos(a) * 46
          b.y = CY + Math.sin(a) * 46
          b.vx = Math.cos(a) * cfg.speed
          b.vy = Math.sin(a) * cfg.speed
          b.dmg = cfg.dmg ?? 0
          b.crit = cfg.crit ?? false
          b.pierce = cfg.pierce ?? 0
          b.r = cfg.r ?? 1
          b.splash = cfg.splash ?? 0
          b.kind = cfg.kind ?? null
          b.hit.clear()
        }

        // 3) 연필 발사
        if (now - lastShotRef.current >= 1000 / st.fireRate) {
          lastShotRef.current = now
          const n = st.bullets
          for (let k = 0; k < n; k++) {
            const crit = Math.random() < st.crit
            spawn(shotsRef.current, ang + (k - (n - 1) / 2) * 0.13, {
              speed: PENCIL_SPEED * st.speedMul,
              dmg: crit ? Math.round(st.damage * 2.5) : st.damage,
              crit, pierce: st.pierce, r: 1,
            })
          }
        }

        // 4) 보조 무기(학습도구) 자동 발사
        for (const id of Object.keys(WEAPON_SPEC) as WeaponId[]) {
          const lvl = wpn[id]
          if (lvl <= 0) continue
          const sp = WEAPON_SPEC[id]
          const cd = sp.cd * Math.max(0.5, 1 - 0.12 * (lvl - 1)) * 1000
          if (now - wpnCdRef.current[id] < cd) continue
          wpnCdRef.current[id] = now
          spawn(specialsRef.current, ang, {
            speed: sp.speed, dmg: Math.round(sp.dmg * lvl), pierce: sp.pierce,
            r: sp.r, splash: sp.splash, kind: id,
          })
        }

        // 5) 발사체 이동 + 충돌
        let deaths = 0
        let gained = 0
        let chestHit: 'blue' | 'purple' | null = null

        const step = (arr: Shot[], els: React.MutableRefObject<(HTMLDivElement | null)[]>) => {
          for (let bi = 0; bi < arr.length; bi++) {
            const b = arr[bi]
            const el = els.current[bi]
            if (!b.active) continue
            b.x += b.vx * dt
            b.y += b.vy * dt
            if (b.x < -60 || b.x > VW + 60 || b.y < -12 || b.y > VH + 60) {
              b.active = false
              if (el) el.style.display = 'none'
              continue
            }
            const reach = SEG_R * b.r
            for (let i = 0; i < segs.length; i++) {
              const s = segs[i]
              if (!s.alive || b.hit.has(s.id)) continue
              const p = posRef.current[i]
              if (!p) continue
              const dx = b.x - p.x
              const dy = b.y - p.y
              if (dx * dx + dy * dy > reach * reach) continue

              // 명중 — 광역이면 반경 내 다른 마디에도 60% 피해
              const targets: { idx: number; dmg: number; pos: { x: number; y: number } }[] =
                [{ idx: i, dmg: b.dmg, pos: p }]
              if (b.splash > 0) {
                for (let j = 0; j < segs.length; j++) {
                  if (j === i || !segs[j].alive) continue
                  const q = posRef.current[j]
                  if (!q) continue
                  const qx = q.x - p.x, qy = q.y - p.y
                  if (qx * qx + qy * qy <= b.splash * b.splash) {
                    targets.push({ idx: j, dmg: Math.round(b.dmg * 0.6), pos: q })
                  }
                }
              }

              for (const tg of targets) {
                const seg = segs[tg.idx]
                b.hit.add(seg.id)
                seg.hp -= tg.dmg
                playFx(dmgElsRef, dmgCursor, DMG_POOL, tg.pos.x + 10, tg.pos.y - 20,
                       `dmgfloat ${b.crit ? 820 : 640}ms ease-out forwards`,
                       { text: String(tg.dmg), color: b.crit ? '#fde047' : b.kind ? '#7dd3fc' : '#ffffff' })
                if (seg.hp <= 0) {
                  seg.alive = false
                  deaths += 1
                  gained += 20
                  if (seg.chest) chestHit = seg.chest
                  const segEl = segElsRef.current[tg.idx]
                  if (segEl) segEl.style.display = 'none'
                  playFx(burstElsRef, burstCursor, BURST_POOL, tg.pos.x, tg.pos.y, 'burstpop 420ms ease-out forwards')
                  headTRef.current = Math.max(0, headTRef.current - PUSHBACK_RAD)
                } else {
                  const hpEl = segHpElsRef.current[tg.idx]
                  if (hpEl) hpEl.textContent = String(seg.hp)
                }
              }
              playFx(sparkElsRef, sparkCursor, SPARK_POOL, b.x, b.y,
                     'sparkpop 260ms ease-out forwards', { scale: b.splash > 0 ? 9 : 3.4 })

              if (b.pierce > 0) b.pierce -= 1
              else {
                b.active = false
                if (el) el.style.display = 'none'
              }
              break
            }
            if (b.active && el) {
              if (el.style.display === 'none') {
                el.style.display = 'block'
                // 보조무기 풀은 스프라이트 3종을 모두 품고 있다 — 해당 종류만 보인다
                if (b.kind) {
                  el.style.width = `${b.kind ? WEAPON_SPEC[b.kind].w : 5}%`
                  const imgs = el.querySelectorAll<HTMLImageElement>('img[data-w]')
                  imgs.forEach(img => { img.style.display = img.dataset.w === b.kind ? 'block' : 'none' })
                }
              }
              el.style.left = `${(b.x / VW) * 100}%`
              el.style.top = `${(b.y / VH) * 100}%`
              const rot = b.kind === 'ruler'
                ? (now / 90) % (Math.PI * 2)                       // 자는 회전
                : Math.atan2(b.vy, b.vx) + Math.PI / 2
              el.style.transform = `translate(-50%,-50%) rotate(${rot}rad)`
              el.style.filter = b.crit ? 'saturate(1.7) brightness(1.2) drop-shadow(0 0 5px #fde047)' : ''
            }
          }
        }

        step(shotsRef.current, bulletElsRef)
        step(specialsRef.current, specialElsRef)

        if (deaths > 0) {
          setScore(s => s + gained)
          setKilled(k => k + deaths)
          const remain = segs.filter(s => s.alive).length
          setLeft(remain)
          if (remain === 0) {
            clearTimers()
            pausedRef.current = true
            setCleared(true)
            setPhase('finished')
            return
          }
          if (chestHit) openChestQuizRef.current(chestHit)
        }

        // 6) 머리가 위험 반경 안으로 들어오면 방어막 손실 + 몬스터를 밀어낸다
        if (spiralR(headTRef.current) <= DANGER_R) {
          headTRef.current = Math.max(0, headTRef.current - KNOCKBACK_RAD)
          setHp(h => Math.max(0, h - 1))
        }
      }
      } catch (err) {
        // 한 프레임의 예외로 게임이 정지하지 않도록 방어 (원인은 콘솔로 노출)
        console.error('[defense] frame error', err)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [started, phase])

  // HP 소진 → 종료
  useEffect(() => {
    if (started && hp <= 0) {
      clearTimers()
      pausedRef.current = true
      setPhase('finished')
    }
  }, [hp, started])

  const handleReplay = useCallback(() => {
    clearTimers()
    resetWorld()
    setStats(BASE_STATS)
    setWeapons(BASE_WEAPONS)
    setHp(START_HP); setScore(0); setKilled(0); setLeft(TOTAL_SEGMENTS); setCleared(false)
    setQuiz(null); setRewardChoices([]); setQuizResult(null)
    setPhase('battle')
    pausedRef.current = false
    lastFrameRef.current = performance.now()
    lastShotRef.current = performance.now()
  }, [resetWorld])

  const upgradeLabel = (id: UpgradeId) => ({
    pencilCount: { title: t('upgPencilCountTitle'), effect: t('upgPencilCountEffect') },
    pencilDamage: { title: t('upgPencilDamageTitle'), effect: t('upgPencilDamageEffect') },
    pencilSpeed: { title: t('upgPencilSpeedTitle'), effect: t('upgPencilSpeedEffect') },
    pencilRate: { title: t('upgPencilRateTitle'), effect: t('upgPencilRateEffect') },
    pencilPierce: { title: t('upgPencilPierceTitle'), effect: t('upgPencilPierceEffect') },
    pencilCrit: { title: t('upgPencilCritTitle'), effect: t('upgPencilCritEffect') },
    wpnEraser: { title: t('wpnEraserTitle'), effect: t('wpnEraserEffect') },
    wpnHighlighter: { title: t('wpnHighlighterTitle'), effect: t('wpnHighlighterEffect') },
    wpnRuler: { title: t('wpnRulerTitle'), effect: t('wpnRulerEffect') },
  }[id])

  const segSprite = (kind: Segment['kind']) => ({
    head: '/game7/paper_head.png',
    elite: '/game7/paper_seg_elite.png',
    tough: '/game7/paper_seg_tough.png',
    normal: '/game7/paper_seg.png',
  }[kind])

  const segPct = (SEG_W / VW) * 100
  const ownedWeapons = (Object.keys(WEAPON_SPEC) as WeaponId[]).filter(w => weapons[w] > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="relative isolate w-full max-w-4xl">
        {/* HUD */}
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg">
          <span className="shrink-0 rounded-lg bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
            {t('segmentsLeft', { n: left })}
          </span>
          <span className="hidden shrink-0 items-center gap-2 text-[11px] font-semibold text-gray-500 sm:flex">
            <span>{t('statDamage', { n: stats.damage })}</span>
            <span>{t('statBullets', { n: stats.bullets })}</span>
            {stats.pierce > 0 && <span className="text-fuchsia-500">{t('statPierce', { n: stats.pierce })}</span>}
            {stats.crit > 0 && <span className="text-amber-500">{t('statCrit', { n: Math.round(stats.crit * 100) })}</span>}
          </span>
          {/* 보유 학습도구 무기 */}
          {ownedWeapons.length > 0 && (
            <span className="hidden shrink-0 items-center gap-1 sm:flex">
              {ownedWeapons.map(w => (
                <span key={w} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={WEAPON_SPEC[w].sprite} alt="" className="h-5 w-auto" draggable={false} />
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-fuchsia-500 px-1 text-[8px] font-extrabold text-white">
                    {weapons[w]}
                  </span>
                </span>
              ))}
            </span>
          )}
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-800">
            {started ? t('defenseIntro2') : t('defenseIntro')}
          </p>
          <span className="flex shrink-0 items-center gap-0.5">
            {Array.from({ length: START_HP }).map((_, i) => (
              <Heart key={i} className={`h-3.5 w-3.5 ${i < hp ? 'fill-rose-500 text-rose-500' : 'text-gray-300'}`} />
            ))}
          </span>
          <span className="shrink-0 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
            {score}{t('scoreSuffix')}
          </span>
          <button
            onClick={() => onClose(phase === 'finished' ? score : null)}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 보드 */}
        <div
          ref={boardRef}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          className="relative w-full cursor-crosshair select-none overflow-hidden rounded-2xl shadow-2xl"
          style={{
            aspectRatio: `${VW}/${VH}`,
            backgroundImage: 'url(/game7/school_bg.png)',
            backgroundSize: 'cover',
            touchAction: 'none',
          }}
        >
          {/* 위험 반경 — 링이 이 안까지 조여들면 방어막을 잃는다 */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-rose-400/50"
            style={{
              width: `${(DANGER_R * RING_ASPECT * 2 / VW) * 100}%`,
              height: `${(DANGER_R * 2 / VH) * 100}%`,
            }}
          />

          {/* 오개념 군체 — 위치는 루프에서 DOM 직접 갱신 */}
          {segsRef.current.map((seg, i) => (
            <div
              key={seg.id}
              ref={el => { segElsRef.current[i] = el }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ width: `${segPct}%`, zIndex: 40 - i }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={el => { segImgElsRef.current[i] = el }}
                src={segSprite(seg.kind)}
                alt=""
                className="w-full drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)]"
                draggable={false}
              />
              {/* HP — 마디 스프라이트 밝기가 제각각이므로 어두운 pill 을 깔아 대비를 고정한다 */}
              <span className="absolute inset-0 flex items-center justify-center">
                <span
                  ref={el => { segHpElsRef.current[i] = el }}
                  className="rounded-full bg-black/55 px-1.5 py-[1px] text-[10px] font-extrabold leading-tight text-white sm:text-[13px]"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
                >
                  {seg.hp}
                </span>
              </span>
              {seg.chest && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={seg.chest === 'purple' ? '/game7/chest_purple.png' : '/game7/chest_blue.png'}
                  alt=""
                  className="absolute -top-[44%] left-1/2 w-[62%] -translate-x-1/2 animate-bounce"
                  draggable={false}
                />
              )}
            </div>
          ))}

          {/* 연필 탄 풀 */}
          {Array.from({ length: BULLET_POOL }).map((_, i) => (
            <div
              key={`b${i}`}
              ref={el => { bulletElsRef.current[i] = el }}
              className="pointer-events-none absolute"
              style={{ width: '2.6%', display: 'none', zIndex: 60 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game7/pencil_shot.png" alt="" className="w-full" draggable={false} />
              <span className="absolute left-1/2 top-full h-4 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-300/80 to-transparent" />
            </div>
          ))}

          {/* 보조 무기(학습도구) 발사체 풀 — kind 에 따라 스프라이트 토글 */}
          {Array.from({ length: SPECIAL_POOL }).map((_, i) => (
            <div
              key={`sp${i}`}
              ref={el => { specialElsRef.current[i] = el }}
              className="pointer-events-none absolute"
              style={{ width: '5%', display: 'none', zIndex: 61 }}
            >
              {(Object.keys(WEAPON_SPEC) as WeaponId[]).map(w => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={w}
                  src={WEAPON_SPEC[w].sprite}
                  alt=""
                  data-w={w}
                  className="w-full"
                  style={{ display: 'none' }}
                  draggable={false}
                />
              ))}
            </div>
          ))}

          {/* 플레이어 (조준 x 를 추종) */}
          {started && (
            <div
              ref={playerElRef}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: '50%', top: '50%', width: '7.5%', zIndex: 55 }}
            >
              {/* 조준 방향으로 회전하는 연필(총구) */}
              <div ref={gunElRef} className="absolute left-1/2 w-[34%]" style={{ top: '-14%', transform: 'translate(-50%,-50%)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/game7/pencil_shot.png" alt="" className="w-full" draggable={false} />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/game7/hero_${hero}.png`} alt="" className="w-full drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)]" draggable={false} />
            </div>
          )}

          {/* 데미지 숫자 풀 */}
          {Array.from({ length: DMG_POOL }).map((_, i) => (
            <div
              key={`d${i}`}
              ref={el => { dmgElsRef.current[i] = el }}
              className="pointer-events-none absolute text-[11px] font-extrabold sm:text-sm"
              style={{ display: 'none', zIndex: 70, textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
            />
          ))}

          {/* 스파크 풀 */}
          {Array.from({ length: SPARK_POOL }).map((_, i) => (
            <div
              key={`s${i}`}
              ref={el => { sparkElsRef.current[i] = el }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ width: '3.4%', display: 'none', zIndex: 65 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game7/hit_spark.png" alt="" className="w-full" draggable={false} />
            </div>
          ))}

          {/* 폭발 풀 */}
          {Array.from({ length: BURST_POOL }).map((_, i) => (
            <div
              key={`e${i}`}
              ref={el => { burstElsRef.current[i] = el }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ width: '9%', display: 'none', zIndex: 66 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game7/pop_burst.png" alt="" className="w-full" draggable={false} />
            </div>
          ))}

          {/* 시작 화면 */}
          {!started && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-[2px]">
              <p className="text-lg font-bold text-white drop-shadow">{t('pickHero')}</p>
              <div className="flex items-end gap-6">
                {(['girl', 'boy'] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => setHero(h)}
                    className={`rounded-2xl border-4 bg-white/85 p-2 transition-all ${
                      hero === h ? 'border-purple-400 scale-105 shadow-xl' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/game7/hero_${h}.png`} alt={h} className="h-24 w-auto sm:h-28" draggable={false} />
                  </button>
                ))}
              </div>
              <button onClick={beginGame} className="rounded-xl bg-purple-500 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-purple-600">
                {t('startGame')}
              </button>
              <p className="max-w-md text-center text-xs text-white/85">{t('defenseHint2')}</p>
            </div>
          )}

          {/* 종료 화면 */}
          {phase === 'finished' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-black/70 backdrop-blur-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cleared ? '/game7/shield_tower.png' : '/game7/paper_head.png'}
                alt=""
                className="w-20 animate-bounce"
                draggable={false}
              />
              <p className="text-xl font-extrabold text-white drop-shadow">
                {cleared ? t('defenseWin') : t('defenseLose')}
              </p>
              <p className="text-3xl font-extrabold text-white drop-shadow">{score}{t('scoreSuffix')}</p>
              <p className="text-sm text-white/90">{t('segmentsKilled', { n: killed, total: TOTAL_SEGMENTS })}</p>
              <div className="mt-1 flex gap-2">
                <button onClick={handleReplay} className="rounded-xl bg-purple-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-purple-600">
                  {t('playAgain')}
                </button>
                <button onClick={() => onClose(score)} className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow hover:bg-gray-100">
                  {t('exit')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 퀴즈 — 보드 밖 최상위 레이어 (보드 안에 두면 aspect-ratio 높이에 잘린다) */}
      {phase === 'quiz' && quiz && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-center gap-2 text-amber-600">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={quiz.tier === 'purple' ? '/game7/chest_purple.png' : '/game7/chest_blue.png'}
                alt=""
                className="h-8 w-auto"
                draggable={false}
              />
              <span className="text-sm font-bold">{t('chestQuizTitle')}</span>
              {quiz.tier === 'purple' && (
                <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-extrabold text-fuchsia-600">
                  {t('rareBadge')}
                </span>
              )}
            </div>
            <p className="mb-4 max-h-40 overflow-y-auto rounded-xl bg-gray-50 p-3 text-center text-sm leading-relaxed text-gray-700">
              {quiz.answer.description}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {quiz.options.map(opt => {
                const isAnswer = opt.keyword === quiz.answer.keyword
                const showResult = quizResult !== null
                return (
                  <button
                    key={opt.keyword}
                    onClick={() => answerQuiz(opt)}
                    disabled={showResult}
                    className={`break-keep rounded-xl border-2 px-3 py-3 text-sm font-bold transition-all ${
                      showResult
                        ? isAnswer
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-gray-50 text-gray-400'
                        : 'border-purple-200 bg-white text-gray-800 hover:border-purple-400 hover:bg-purple-50'
                    }`}
                  >
                    {opt.keyword}
                  </button>
                )
              })}
            </div>
            {quizResult && (
              <p className={`mt-3 text-center text-sm font-bold ${quizResult === 'correct' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {quizResult === 'correct' ? t('quizCorrect') : t('quizWrong')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 강화 3택 — 세로 배너 카드 (보드 밖 최상위) */}
      {phase === 'reward' && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 overflow-y-auto bg-black/85 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-1.5 shadow-lg">
            <Sparkles className="h-4 w-4 text-white" />
            <span className="text-sm font-extrabold text-white drop-shadow">{t('rewardTitle')}</span>
          </div>
          <div className="flex w-full max-w-2xl items-stretch justify-center gap-2 sm:gap-4">
            {rewardChoices.map(u => {
              const label = upgradeLabel(u.id)
              const rare = u.tier === 'rare'
              const owned = u.weapon ? weapons[u.weapon] : 0
              return (
                <button
                  key={u.id}
                  onClick={() => pickUpgrade(u)}
                  className="group relative flex-1 transition-transform hover:-translate-y-2"
                  style={{ maxWidth: 168 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={rare ? '/game7/card_frame_rare.png' : '/game7/card_frame_common.png'}
                    alt=""
                    className={`w-full ${rare ? 'drop-shadow-[0_0_18px_rgba(232,121,249,0.75)]' : 'drop-shadow-[0_0_14px_rgba(52,211,153,0.6)]'}`}
                    draggable={false}
                  />
                  {/* 프레임 위 오버레이 — 상단 메달리온에 아이콘, 패널에 이름·효과 */}
                  <div className="absolute inset-0 flex flex-col items-center px-[14%]">
                    <div className="flex h-[17%] w-full items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u.icon} alt="" className="max-h-[74%] w-auto drop-shadow" draggable={false} />
                    </div>
                    <p className={`mt-[4%] text-center text-[11px] font-extrabold leading-tight drop-shadow sm:text-[13px] ${rare ? 'text-fuchsia-50' : 'text-emerald-50'}`}>
                      {label.title}
                    </p>
                    <p className={`mt-[6%] text-center text-[10px] font-bold leading-snug sm:text-[11px] ${rare ? 'text-yellow-200' : 'text-lime-100'}`}>
                      {label.effect}
                    </p>
                    <div className="mt-auto mb-[13%] flex flex-col items-center gap-1">
                      {owned > 0 && (
                        <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-extrabold text-amber-950">
                          {t('wpnLevelUp', { n: owned + 1 })}
                        </span>
                      )}
                      {rare && (
                        <span className="rounded-full bg-fuchsia-500/90 px-2 py-0.5 text-[9px] font-extrabold text-white">
                          {t('rareBadge')}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <p className="flex items-center gap-1.5 text-center text-xs text-white/80">
            <Crosshair className="h-3.5 w-3.5 shrink-0" />
            {t('rewardHint')}
          </p>
        </div>
      )}

      <style jsx global>{`
        @keyframes dmgfloat {
          0%   { transform: translate(-50%, 0) scale(1.25); opacity: 1; }
          100% { transform: translate(-50%, -42px) scale(0.95); opacity: 0; }
        }
        @keyframes sparkpop {
          0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes burstpop {
          0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
          60%  { transform: translate(-50%, -50%) scale(1.15); opacity: 0.95; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
