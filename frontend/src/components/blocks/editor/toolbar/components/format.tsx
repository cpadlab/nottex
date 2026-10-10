import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue, SelectSeparator } from '@/components/ui/select'
import { ALargeSmallIcon, Heading1Icon, Heading2Icon, Heading3Icon, type LucideIcon } from "lucide-react"
import { useTranslation } from 'react-i18next'
import { Fragment } from 'react/jsx-runtime'
import { useEditorContext } from '@/contexts/editor-context'
import type { TextFormat } from '@/hooks/use-editor'

export interface SelectItemConfig {
    label: string
    value: TextFormat
    icon: LucideIcon
}

const SELECT_ITEMS: SelectItemConfig[] = [
    { 
        label: "editor.toolbar.normal", 
        value: "normal",
        icon: ALargeSmallIcon
    },
    { 
        label: "editor.toolbar.heading", 
        value: "heading_1",
        icon: Heading1Icon
    },
    { 
        label: "editor.toolbar.heading", 
        value: "heading_2",
        icon: Heading2Icon
    },
    { 
        label: "editor.toolbar.heading", 
        value: "heading_3",
        icon: Heading3Icon
    },
]

export const FormatSelect = () => {
    
    const { t: translation } = useTranslation()
    const { textFormatting, onSetTextFormatting } = useEditorContext()

    return (    
        <Select value={textFormatting} onValueChange={(val) => {if (val) {onSetTextFormatting(val as TextFormat)}}}>
            
            <SelectTrigger size="sm" className="w-auto gap-2">
                <SelectValue>
                    {(value: string | null) => {
                        const activeValue = value ?? textFormatting
                        const item = SELECT_ITEMS.find((i) => i.value === activeValue) ?? SELECT_ITEMS[0]
                        const Icon = item.icon
                        const index = SELECT_ITEMS.findIndex((i) => i.value === item.value)
                        const headingLevel = index > 0 ? ` ${index}` : ""
                        return (
                            <span className="flex items-center gap-2">
                                <Icon />
                                <span className="hidden md:inline">
                                    {translation(item.label)}{headingLevel}
                                </span>
                            </span>
                        )
                    }}
                </SelectValue>
            </SelectTrigger>
        
            <SelectContent>
                {SELECT_ITEMS.map((item, index) => {
                    const headingLevel = index > 0 ? ` ${index}` : ""
                    return (
                        <Fragment key={item.value}>
                            {index === 1 && <SelectSeparator />}
                            <SelectItem className="cursor-pointer flex items-center gap-2" value={item.value}>
                                <item.icon />
                                <span>{translation(item.label)}{headingLevel}</span>
                            </SelectItem>
                        </Fragment>
                    )
                })}
            </SelectContent>

        </Select>
    )
}