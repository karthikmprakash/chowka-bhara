import * as React from "react"

const MOBILE_BREAKPOINT = 768
const COMPACT_BREAKPOINT = 700

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

/**
 * True on the narrow layout, where the app is a series of single screens
 * rather than one long page. The breakpoint matches the layout in
 * `app/globals.css`.
 */
export function useIsCompact() {
  const [compact, setCompact] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT}px)`)
    const onChange = () => setCompact(mql.matches)
    mql.addEventListener("change", onChange)
    setCompact(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!compact
}
