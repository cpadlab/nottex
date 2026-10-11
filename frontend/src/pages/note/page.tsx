import Editor from "@/components/blocks/editor/editor"
import { useParams } from "react-router-dom"
import { NoteProvider } from "@/contexts/note-context"

interface RouteParams {
    id: string
    [key: string]: string | undefined
}

const NotePage = () => {

    const { id } = useParams<RouteParams>()
    
    return (
        <NoteProvider options={{ id }}>
            <div className="p-4 h-dvh max-h-dvh min-h-dvh relative">
                <div className="max-w-[867.15px] mx-auto h-full flex flex-col gap-4">
                    <Editor />
                </div>
            </div>
        </NoteProvider>
    )
}

export default NotePage