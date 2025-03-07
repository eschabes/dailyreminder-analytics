
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Set initial value
    checkMobile()
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile)
    
    // Clean up event listener
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile === undefined ? false : isMobile
}
