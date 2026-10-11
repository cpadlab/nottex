import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from '@/components/ui/select'
import { TextAlignCenterIcon, TextAlignJustifyIcon, AlignLeftIcon, AlignRightIcon, type LucideIcon } from "lucide-react"
import { useTranslation } from 'react-i18next'
import { useEditorContext } from '@/contexts/editor-context'
import type { TextAlignment } from '@/hooks/use-editor'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { getModifierKey } from '@/hooks/use-keybindings'

export interface AlignOption {
    label: string
    value: TextAlignment
    icon: LucideIcon
    shortcut: string[]
}

export const AlignSelect = () => {
    
    const { t: translation } = useTranslation()
    const { textAlign, onSetTextAlign } = useEditorContext()
    const mod = getModifierKey()

    const selectItems: AlignOption[] = [
        { 
            label: "editor.toolbar.alignleft", 
            value: "align_left",
            icon: AlignLeftIcon,
            shortcut: [mod, "Shift", "L"],
        },
        { 
            label: "editor.toolbar.aligncenter", 
            value: "align_center",
            icon: TextAlignCenterIcon,
            shortcut: [mod, "Shift", "E"],
        },
        { 
            label: "editor.toolbar.alignright", 
            value: "align_right",
            icon: AlignRightIcon,
            shortcut: [mod, "Shift", "R"],
        },
        { 
            label: "editor.toolbar.alignjustify", 
            value: "align_justify",
            icon: TextAlignJustifyIcon,
            shortcut: [mod, "Shift", "J"],
        },
    ]

    return (    
        <Select value={textAlign} onValueChange={(val) => {if (val) {onSetTextAlign(val as TextAlignment)}}}>
            
            <SelectTrigger size="sm" className="w-auto md:flex hidden gap-2">
                <SelectValue>
                    {(value: string | null) => {
                        const activeValue = value ?? textAlign
                        const item = selectItems.find((i) => i.value === activeValue) ?? selectItems[0]
                        const Icon = item.icon
                        return <Icon />
                    }}
                </SelectValue>
            </SelectTrigger>
        
            <SelectContent className="w-auto min-w-[240px]">
                {selectItems.map((item) => (
                    <SelectItem className="cursor-pointer" key={item.value} value={item.value}>
                        <div className="flex items-center justify-between w-full gap-4">
                            <div className="flex items-center gap-2">
                                <item.icon />
                                <span>{translation(item.label)}</span>
                            </div>
                            <KbdGroup>
                                {item.shortcut.map((key) => (
                                    <Kbd key={key}>{key}</Kbd>
                                ))}
                            </KbdGroup>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>

        </Select>
    )
}