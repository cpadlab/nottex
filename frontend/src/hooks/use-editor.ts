import { useCallback } from "react"

export type TextFormat = "normal" | "heading_1" | "heading_2" | "heading_3"
export type TextAlignment = "align_left" | "align_center" | "align_right" | "align_justify"
export type ListType = "list" | "listodo" | "listorder"

export interface UseEditorOptions {
    onSetTextFormatting?: (format: TextFormat) => void
    onIndentDecrease?: () => void
    onIndentIncrease?: () => void
    onToggleBulletList?: () => void
    onToggleTodoList?: () => void
    onToggleOrderedList?: () => void
    onAlignLeft?: () => void
    onAlignCenter?: () => void
    onAlignRight?: () => void
    onAlignJustify?: () => void
    onSetTextAlign?: (alignment: TextAlignment) => void
    onToggleQuote?: () => void
    onToggleCodeXml?: () => void
    onSetTextColor?: (color?: string) => void
    onSetHighlight?: (color?: string) => void
    onInsertLink?: (url?: string) => void
    onInsertImage?: (src?: string) => void
    onInsertVideo?: (src?: string) => void
    onToggleBold?: () => void
    onToggleItalic?: () => void
    onToggleUnderline?: () => void
    onToggleStrikethrough?: () => void
    onToggleSuperscript?: () => void
    onToggleSubscript?: () => void
}

export const useEditor = (options?: UseEditorOptions) => {
    
    const onSetTextFormatting = useCallback((format: TextFormat) => {
        options?.onSetTextFormatting?.(format)
    }, [options])

    const onSetNormal = useCallback(() => {
        onSetTextFormatting("normal")
    }, [onSetTextFormatting])

    const onSetHeading1 = useCallback(() => {
        onSetTextFormatting("heading_1")
    }, [onSetTextFormatting])

    const onSetHeading2 = useCallback(() => {
        onSetTextFormatting("heading_2")
    }, [onSetTextFormatting])

    const onSetHeading3 = useCallback(() => {
        onSetTextFormatting("heading_3")
    }, [onSetTextFormatting])

    const onListIndentDecrease = useCallback(() => {
        options?.onIndentDecrease?.()
    }, [options])

    const onListIndentIncrease = useCallback(() => {
        options?.onIndentIncrease?.()
    }, [options])

    const onList = useCallback(() => {
        options?.onToggleBulletList?.()
    }, [options])

    const onListTodo = useCallback(() => {
        options?.onToggleTodoList?.()
    }, [options])

    const onListOrdered = useCallback(() => {
        options?.onToggleOrderedList?.()
    }, [options])

    const onAlignLeft = useCallback(() => {
        options?.onAlignLeft?.()
        options?.onSetTextAlign?.("align_left")
    }, [options])

    const onAlignCenter = useCallback(() => {
        options?.onAlignCenter?.()
        options?.onSetTextAlign?.("align_center")
    }, [options])

    const onAlignRight = useCallback(() => {
        options?.onAlignRight?.()
        options?.onSetTextAlign?.("align_right")
    }, [options])

    const onAlignJustify = useCallback(() => {
        options?.onAlignJustify?.()
        options?.onSetTextAlign?.("align_justify")
    }, [options])

    const onSetTextAlign = useCallback((alignment: TextAlignment) => {
        options?.onSetTextAlign?.(alignment)
    }, [options])

    const onQuote = useCallback(() => {
        options?.onToggleQuote?.()
    }, [options])

    const onCodeXml = useCallback(() => {
        options?.onToggleCodeXml?.()
    }, [options])

    const onBaseline = useCallback((color?: string) => {
        options?.onSetTextColor?.(color)
    }, [options])

    const onPaintRoller = useCallback((color?: string) => {
        options?.onSetHighlight?.(color)
    }, [options])

    const onLink = useCallback((url?: string) => {
        options?.onInsertLink?.(url)
    }, [options])

    const onImage = useCallback((src?: string) => {
        options?.onInsertImage?.(src)
    }, [options])

    const onVideo = useCallback((src?: string) => {
        options?.onInsertVideo?.(src)
    }, [options])

    const onBold = useCallback(() => {
        options?.onToggleBold?.()
    }, [options])

    const onItalic = useCallback(() => {
        options?.onToggleItalic?.()
    }, [options])

    const onUnderline = useCallback(() => {
        options?.onToggleUnderline?.()
    }, [options])

    const onStrikethrough = useCallback(() => {
        options?.onToggleStrikethrough?.()
    }, [options])

    const onSuperscript = useCallback(() => {
        options?.onToggleSuperscript?.()
    }, [options])

    const onSubscript = useCallback(() => {
        options?.onToggleSubscript?.()
    }, [options])

    return {
        onSetTextFormatting,
        onSetNormal,
        onSetHeading1,
        onSetHeading2,
        onSetHeading3,
        onListIndentDecrease,
        onListIndentIncrease,
        onList,
        onListTodo,
        onListOrdered,
        onAlignLeft,
        onAlignCenter,
        onAlignRight,
        onAlignJustify,
        onSetTextAlign,
        onQuote,
        onCodeXml,
        onBaseline,
        onPaintRoller,
        onLink,
        onImage,
        onVideo,
        onBold,
        onItalic,
        onUnderline,
        onStrikethrough,
        onSuperscript,
        onSubscript,
    }
}

