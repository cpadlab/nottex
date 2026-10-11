import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'

export interface TodoCheckboxItemProps {
    container: HTMLElement
}

export const TodoCheckboxItem = ({ container }: TodoCheckboxItemProps) => {
    
    const li = container.closest("li[data-type=todo-item]") as HTMLElement | null
    const [checked, setChecked] = useState(() => li?.getAttribute("data-checked") === "true")

    const handleCheckedChange = (isChecked: boolean) => {
        setChecked(isChecked)
        if (li) {
            li.setAttribute("data-checked", isChecked ? "true" : "false")
            const editor = container.closest("[contenteditable=true]") as HTMLElement | null
            if (editor) {
                const event = new Event("input", { bubbles: true })
                editor.dispatchEvent(event)
            }
        }
    }

    return (
        <span onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center size-5 select-none">
            <Checkbox checked={checked} onCheckedChange={handleCheckedChange} className="cursor-pointer" />
        </span>
    )
}
