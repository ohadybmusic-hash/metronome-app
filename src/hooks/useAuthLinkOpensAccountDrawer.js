import { useEffect, useRef } from 'react'

/** After a bad auth redirect, open the account drawer once so the user can recover. */
export function useAuthLinkOpensAccountDrawer(authLinkError, user, setAccountDrawerOpen) {
  const openedForLinkErrRef = useRef(false)

  useEffect(() => {
    if (!authLinkError) {
      openedForLinkErrRef.current = false
      return
    }
    if (user || openedForLinkErrRef.current) return
    openedForLinkErrRef.current = true
    setAccountDrawerOpen(true)
  }, [authLinkError, user, setAccountDrawerOpen])
}
