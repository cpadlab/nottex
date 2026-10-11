import { useEffect, useState } from 'react'

export function useKeyboardOffset() {
    
    const [keyboardOffset, setKeyboardOffset] = useState(0)

    useEffect(() => {

        if (typeof window === 'undefined' || !window.visualViewport) {
            return
        }

        const handleViewportChange = () => {
            const vv = window.visualViewport
            if (!vv) return
            const offset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
            setKeyboardOffset(offset)
        }

        const vv = window.visualViewport
        vv.addEventListener('resize', handleViewportChange)
        vv.addEventListener('scroll', handleViewportChange)

        return () => {
            vv.removeEventListener('resize', handleViewportChange)
            vv.removeEventListener('scroll', handleViewportChange)
        }

    }, [])

    return keyboardOffset

}

