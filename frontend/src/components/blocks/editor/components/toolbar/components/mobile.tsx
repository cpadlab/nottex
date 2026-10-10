import { Select, SelectContent, SelectTrigger, SelectItem, SelectSeparator } from '@/components/ui/select'
import {
    AlignLeftIcon,
    AlignRightIcon,
    BaselineIcon,
    CodeXmlIcon,
    EllipsisIcon,
    ImageIcon,
    LinkIcon,
    PaintRollerIcon,
    QuoteIcon,
    SubscriptIcon,
    SuperscriptIcon,
    TextAlignCenterIcon,
    TextAlignJustifyIcon,
    VideoIcon,
    type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fragment } from 'react/jsx-runtime'
import { useEditorContext } from '@/contexts/editor-context'
import { cn } from 'cn'

export interface SelectItemConfig {
    label: string
    icon: LucideIcon
    value: string
    isActive?: boolean
    onClick: () => void
}

export const MobileSelect = () => {
    
    const { t: translation } = useTranslation()
    const {
        isQuote,
        onQuote,
        isCodeXml,
        onCodeXml,
        isAlignLeft,
        onAlignLeft,
        isAlignCenter,
        onAlignCenter,
        isAlignRight,
        onAlignRight,
        isAlignJustify,
        onAlignJustify,
        isSuperscript,
        onSuperscript,
        isSubscript,
        onSubscript,
        isBaseline,
        onBaseline,
        isPaintRoller,
        onPaintRoller,
        onLink,
        onImage,
        onVideo,
        isCompact,
    } = useEditorContext()

    const items: SelectItemConfig[] = [
        { 
            icon: LinkIcon, 
            label: "editor.toolbar.link",
            value: "link",
            onClick: () => onLink(),
        },
        { 
            icon: ImageIcon, 
            label: "editor.toolbar.image",
            value: "image",
            onClick: () => onImage(),
        },
        { 
            icon: VideoIcon, 
            label: "editor.toolbar.video",
            value: "video",
            onClick: () => onVideo(),
        },
        { 
            icon: QuoteIcon, 
            label: "editor.toolbar.quote",
            value: "quote",
            isActive: isQuote,
            onClick: onQuote,
        },
        { 
            icon: CodeXmlIcon, 
            label: "editor.toolbar.code",
            value: "code",
            isActive: isCodeXml,
            onClick: onCodeXml,
        },
        { 
            icon: AlignLeftIcon,
            label: "editor.toolbar.alignleft", 
            value: "align_left",
            isActive: isAlignLeft,
            onClick: onAlignLeft,
        },
        { 
            icon: TextAlignCenterIcon,
            label: "editor.toolbar.aligncenter", 
            value: "align_center",
            isActive: isAlignCenter,
            onClick: onAlignCenter,
        },
        { 
            icon: AlignRightIcon,
            label: "editor.toolbar.alignright", 
            value: "align_right",
            isActive: isAlignRight,
            onClick: onAlignRight,
        },
        { 
            icon: TextAlignJustifyIcon,
            label: "editor.toolbar.alignjustify", 
            value: "align_justify",
            isActive: isAlignJustify,
            onClick: onAlignJustify,
        },
        { 
            icon: SuperscriptIcon, 
            label: "editor.toolbar.superscript",
            value: "superscript",
            isActive: isSuperscript,
            onClick: onSuperscript,
        },
        { 
            icon: SubscriptIcon, 
            label: "editor.toolbar.subscript",
            value: "subscript",
            isActive: isSubscript,
            onClick: onSubscript,
        },
        { 
            icon: PaintRollerIcon, 
            label: "editor.toolbar.paintroller",
            value: "paintroller",
            isActive: isPaintRoller,
            onClick: () => onPaintRoller(),
        },
        {
            icon: BaselineIcon, 
            label: "editor.toolbar.baseline",
            value: "baseline",
            isActive: isBaseline,
            onClick: () => onBaseline(),
        },
    ]

    const isAnyActive = Boolean(
        isQuote ||
        isCodeXml ||
        isSuperscript ||
        isSubscript ||
        isPaintRoller ||
        isBaseline
    )

    const handleValueChange = (val: string | null) => {
        if (!val) return
        const selected = items.find((item) => item.value === val)
        selected?.onClick()
    }

    return (    
        <Select onValueChange={handleValueChange}>
            
            <SelectTrigger size="sm" className={cn("w-auto gap-2 flex",!isCompact && "md:hidden", isAnyActive && "bg-secondary text-secondary-foreground")} data-active={isAnyActive} aria-pressed={isAnyActive}>
                <EllipsisIcon />
            </SelectTrigger>
        
            <SelectContent className="w-auto">
                {items.map((item, index) => {
                    return (
                        <Fragment key={item.value}>
                            {(index === 3 || index === 5 || index === 9 || index === 11) && (
                                <SelectSeparator />
                            )}
                            <SelectItem
                                className={cn("cursor-pointer flex items-center gap-2", item.isActive && "bg-secondary/70 text-secondary-foreground font-medium" )} value={item.value}>
                                <item.icon />
                                <span>{translation(item.label)}</span>
                            </SelectItem>
                        </Fragment>
                    )
                })}
            </SelectContent>

        </Select>
    )
}