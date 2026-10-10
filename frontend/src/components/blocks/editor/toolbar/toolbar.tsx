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


export const Toolbar = () => {

    return (
        <div className='flex z-9999 items-center gap-2 fixed bottom-4 justify-center left-1/2 -translate-x-1/2'>
            <FormatSelect />
            <RichTextButtons />
            <ColorStyleButtons />
            <BlockInsertionButtons />
            <ListsTypeButtons />
            <ListsIndentButtons />
            <ListSelect />
            <AlignSelect />
            <MediaButtons />
            <ScriptStyleButtons />
            <MobileSelect />
        </div>
    )
}
