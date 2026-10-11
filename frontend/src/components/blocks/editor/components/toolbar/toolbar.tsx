import { AlignSelect } from "./components/align"
import { BlockInsertionButtons } from "./components/block-insertion"
import { ColorStyleButtons } from "./components/color-style"
import { FormatSelect } from "./components/format"
import { ListsIndentButtons } from "./components/lists/indent"
import { ListSelect } from "./components/lists/mobile"
import { ListsTypeButtons } from "./components/lists/type"
import { MediaButtons } from "./components/media"
import { MobileSelect } from "./components/mobile"
import { RichTextButtons } from "./components/rich-text"
import { ScriptStyleButtons } from "./components/script-style"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useEditorContext } from "@/contexts/editor-context"

export const Toolbar = () => {
    
    const { t: translation } = useTranslation()
    const { isCompact, onToggleCompact } = useEditorContext()

    return (
        <div className='flex z-9999 items-center gap-2 sticky top-4 bottom-4 md:justify-start justify-center'>
            
            <FormatSelect />
            <RichTextButtons />
            <ColorStyleButtons />

            {!isCompact && (
                <>
                    <BlockInsertionButtons />
                    <ListsTypeButtons />
                    <ListsIndentButtons />
                    <AlignSelect />
                    <MediaButtons />
                    <ScriptStyleButtons />
                </>
            )}

            <ListSelect />
            <MobileSelect />

            <Tooltip>
                <TooltipTrigger
                    render={ <Button size="icon-sm" variant="outline" className="hidden md:flex cursor-pointer" onClick={onToggleCompact} />}>
                    {isCompact ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </TooltipTrigger>
                <TooltipContent>
                    <p>{translation(isCompact ? "editor.toolbar.expand" : "editor.toolbar.collapse")}</p>
                </TooltipContent>
            </Tooltip>

        </div>
    )
}
