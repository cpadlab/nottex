import type { ComponentProps } from 'react'
import { cn } from 'cn'

export interface EditorTextareaProps extends ComponentProps<'textarea'> {}

export const EditorTextarea = ({ className, ...props }: EditorTextareaProps) => {
    return (
        <textarea className={cn("w-full scroll-fade flex-1 min-w-full outline-none resize-none scrollbar-none", className)} {...props} />
    )
}
