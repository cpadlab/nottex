import { SidebarTrigger } from "@/components/ui/sidebar"
import { NoteBreadcrumb } from "./breadcrumb"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    CopyIcon,
    EllipsisVerticalIcon,
    PaletteIcon,
    PinIcon,
    SearchIcon,
    TagIcon,
    type LucideIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNoteContext } from "@/contexts/note-context"

export interface ActionItemConfig {
    icon: LucideIcon
    label: string
    value: string
    onClick: () => void
}

export const NoteActions = () => {
    const { t: translation } = useTranslation()
    const {
        isPinned,
        onTogglePin,
        onCreateCopy,
        onSearchInText,
        onBackgroundOptions,
        onTags,
    } = useNoteContext()

    const actions: ActionItemConfig[] = [
        {
            icon: CopyIcon,
            label: "note.actions.copy",
            value: "copy",
            onClick: onCreateCopy,
        },
        {
            icon: SearchIcon,
            label: "note.actions.search",
            value: "search",
            onClick: onSearchInText,
        },
        {
            icon: PaletteIcon,
            label: "note.actions.background",
            value: "background",
            onClick: onBackgroundOptions,
        },
        {
            icon: TagIcon,
            label: "note.actions.tags",
            value: "tags",
            onClick: onTags,
        },
    ]

    return (
        <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-2">
                <div className="-ml-2.5 md:hidden flex">
                    <SidebarTrigger />
                </div>            
                <NoteBreadcrumb />
            </div>

            <div className="flex items-center gap-2">
                
                <Button size="icon" variant={isPinned ? "default" : "outline"} onClick={onTogglePin}>
                    <PinIcon />
                </Button>
                
                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button size="icon" variant="outline" className="cursor-pointer" />}>
                        <EllipsisVerticalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {actions.map((item) => (
                            <DropdownMenuItem key={item.value} onClick={item.onClick} className="cursor-pointer flex items-center gap-2">
                                <item.icon />
                                <span>{translation(item.label)}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

            </div>

        </div>
    )
}
