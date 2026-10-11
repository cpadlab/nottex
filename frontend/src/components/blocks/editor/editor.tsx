import { useState, useContext } from 'react'
import { Toolbar } from './components/toolbar/toolbar'
import { EditorTextarea } from './components/textarea/textarea'
import { EditorProvider } from '@/contexts/editor-context'
import { NoteContext } from '@/contexts/note-context'
import type { UseEditorOptions } from '@/hooks/use-editor'

export interface EditorProps {
    options?: UseEditorOptions
}

const Editor = ({ options }: EditorProps) => {
    const note = useContext(NoteContext)
    const [localContent, setLocalContent] = useState('')

    const content = note ? note.content : localContent
    const handleContentChange = (val: string) => {
        if (note) {
            note.setContent(val)
        } else {
            setLocalContent(val)
        }
    }

    return (
        <EditorProvider options={{ ...options, value: content, onChange: handleContentChange }}>
            <div className='flex flex-col gap-4 flex-1 min-h-0'>
                <Toolbar />
                <EditorTextarea className='pb-8 md:pb-0' />
            </div>
        </EditorProvider>
    )
}

export default Editor