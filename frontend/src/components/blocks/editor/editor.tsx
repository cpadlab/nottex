import { useState } from 'react'
import { Toolbar } from './components/toolbar/toolbar'
import { EditorTextarea } from './components/textarea/textarea'
import { EditorProvider } from '@/contexts/editor-context'
import type { UseEditorOptions } from '@/hooks/use-editor'

export interface EditorProps {
    options?: UseEditorOptions
}

const Editor = ({ options }: EditorProps) => {
    const [content, setContent] = useState('')

    return (
        <EditorProvider options={options}>
            <div className='flex flex-col gap-4 flex-1'>
                <Toolbar />
                <EditorTextarea value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
        </EditorProvider>
    )
}

export default Editor