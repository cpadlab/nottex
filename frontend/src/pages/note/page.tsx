import Editor from "@/components/blocks/editor/editor"
import { useParams } from "react-router-dom"
import { NoteProvider } from "@/contexts/note-context"
import { NoteTitle } from "./components/title"
import { NoteActions } from "./components/actions"

interface RouteParams {
    id: string
    [key: string]: string | undefined
}

const NotePage = () => {

    const { id } = useParams<RouteParams>()
    
    return (
        <NoteProvider options={{ id }}>
            <div className="px-6 md:py-8 py-6 h-dvh max-h-dvh min-h-dvh relative">
                <div className="max-w-[867.15px] mx-auto h-full flex flex-col gap-4 min-h-0">
                    <NoteActions />
                    <NoteTitle />
                    <Editor />
                </div>
            </div>
        </NoteProvider>
    )
}

export default NotePage