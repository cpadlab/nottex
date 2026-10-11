import { useCallback, useMemo, useState } from 'react'

export interface UseNoteOptions {
    id?: string
    path?: string
    initialTitle?: string
    initialContent?: string
    onIdChange?: (id?: string) => void
    onPathChange?: (path: string) => void
    onTitleChange?: (title: string) => void
    onContentChange?: (content: string) => void
}

export const useNote = (options?: UseNoteOptions) => {
    
    const [id, setIdState] = useState<string | undefined>(options?.id)
    const [path, setPathState] = useState<string>(options?.path ?? '/')
    const [title, setTitleState] = useState(options?.initialTitle ?? '')
    const [content, setContentState] = useState(options?.initialContent ?? '')

    const setId = useCallback(
        (newId: string | undefined | ((prev: string | undefined) => string | undefined)) => {
            setIdState((prev) => {
                const next = typeof newId === 'function' ? newId(prev) : newId
                options?.onIdChange?.(next)
                return next
            })
        },
        [options]
    )

    const setPath = useCallback(
        (newPath: string | ((prev: string) => string)) => {
            setPathState((prev) => {
                const raw = typeof newPath === 'function' ? newPath(prev) : newPath
                const normalized = raw.startsWith('/') ? raw : `/${raw}`
                options?.onPathChange?.(normalized)
                return normalized
            })
        },
        [options]
    )

    const setTitle = useCallback(
        (newTitle: string | ((prev: string) => string)) => {
            setTitleState((prev) => {
                const next = typeof newTitle === 'function' ? newTitle(prev) : newTitle
                options?.onTitleChange?.(next)
                return next
            })
        },
        [options]
    )

    const setContent = useCallback(
        (newContent: string | ((prev: string) => string)) => {
            setContentState((prev) => {
                const next = typeof newContent === 'function' ? newContent(prev) : newContent
                options?.onContentChange?.(next)
                return next
            })
        },
        [options]
    )

    const pathSegments = useMemo(() => {
        return path.split('/').filter(Boolean)
    }, [path])

    const isRoot = path === '/' || path === ''

    return {
        id,
        setId,
        path,
        setPath,
        pathSegments,
        isRoot,
        title,
        setTitle,
        content,
        setContent,
    }
}


