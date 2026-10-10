import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from '@/components/ui/select'
import { TextAlignCenterIcon, TextAlignJustifyIcon, AlignLeftIcon, AlignRightIcon, type LucideIcon } from "lucide-react"
import { useTranslation } from 'react-i18next'
import { useEditorContext } from '@/contexts/editor-context'
import type { TextAlignment } from '@/hooks/use-editor'

export interface SelectItem {
    label: string
    value: TextAlignment
    icon: LucideIcon
}

const SELECT_ITEMS: SelectItem[] = [
    { 
        label: "editor.toolbar.alignleft", 
        value: "align_left",
        icon: AlignLeftIcon
    },
    { 
        label: "editor.toolbar.aligncenter", 
        value: "align_center",
        icon: TextAlignCenterIcon
    },
    { 
        label: "editor.toolbar.alignright", 
        value: "align_right",
        icon: AlignRightIcon
    },
    { 
        label: "editor.toolbar.alignjustify", 
        value: "align_justify",
        icon: TextAlignJustifyIcon
    },
]

export const AlignSelect = () => {
    
    const { t: translation } = useTranslation()
    const { textAlign, onSetTextAlign } = useEditorContext()

    return (    
        <Select value={textAlign} onValueChange={(val) => {if (val) {onSetTextAlign(val as TextAlignment)}}}>
            
            <SelectTrigger size="sm" className="w-auto md:flex hidden gap-2">
                <SelectValue>
                    {(value: string | null) => {
                        const activeValue = value ?? textAlign
                        const item = SELECT_ITEMS.find((i) => i.value === activeValue) ?? SELECT_ITEMS[0]
                        const Icon = item.icon
                        return <Icon />
                    }}
                </SelectValue>
            </SelectTrigger>
        
            <SelectContent className="w-full">
                {SELECT_ITEMS.map((item) => (
                    <SelectItem className="cursor-pointer flex items-center gap-2" key={item.value} value={item.value}>
                        <item.icon />
                        <span>{translation(item.label)}</span>
                    </SelectItem>
                ))}
            </SelectContent>

        </Select>
    )
}