import { useState, useCallback, useEffect } from 'react'
import { CodeBlock } from '@/components/ui/code-block'

export interface CodeBlockItemProps {
    container: HTMLElement
}

export const CodeBlockItem = ({ container }: CodeBlockItemProps) => {
    
    const [code, setCode] = useState(
        () => container.getAttribute('data-code') ?? container.querySelector('pre[data-raw-code]')?.textContent ?? ''
    )

    useEffect(() => {
        if (container.getAttribute('contenteditable') !== 'false') {
            container.setAttribute('contenteditable', 'false')
        }
    }, [container])

    const handleChange = useCallback((newCode: string) => {
        setCode(newCode)
        container.setAttribute('data-code', newCode)

        let rawPre = container.querySelector('pre[data-raw-code]')
        if (!rawPre) {
            rawPre = document.createElement('pre')
            rawPre.setAttribute('data-raw-code', '')
            rawPre.setAttribute('style', 'display:none;')
            container.appendChild(rawPre)
        }
        rawPre.textContent = newCode

        const editor = container.closest('[contenteditable=true]') as HTMLElement | null
        if (editor) {
            editor.dispatchEvent(new Event('input', { bubbles: true }))
        }
    }, [container])

    const handleDelete = useCallback(() => {
        const editor = container.closest('[contenteditable=true]') as HTMLElement | null
        container.remove()
        if (editor) {
            editor.dispatchEvent(new Event('input', { bubbles: true }))
        }
    }, [container])

    return (
        <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className="my-3 select-none">
            <CodeBlock code={code} showLineNumbers editable onChange={handleChange} onDelete={handleDelete} />
        </div>
    )
}
