import type { ComponentProps } from 'react'
import { cn } from 'cn'
import { useTranslation } from 'react-i18next'

export interface EditorTextareaProps extends ComponentProps<'textarea'> {}

export const EditorTextarea = ({ className, placeholder, ...props }: EditorTextareaProps) => {
    
    const { t: translation } = useTranslation()
    const defaultPlaceholder = translation('editor.placeholder')

    return (
        <textarea placeholder={placeholder ?? defaultPlaceholder} className={cn("w-full scroll-fade flex-1 min-w-full outline-none resize-none scrollbar-none placeholder:text-muted-foreground", className)} {...props} />
    )
}

