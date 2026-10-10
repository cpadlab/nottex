import { Toolbar } from './components/toolbar/toolbar'
import { EditorProvider } from '@/contexts/editor-context'
import type { UseEditorOptions } from '@/hooks/use-editor'

export interface EditorProps {
    options?: UseEditorOptions
}

const Editor = ({ options }: EditorProps) => {
    return (
        <EditorProvider options={options}>
            <div>
                <Toolbar />
            </div>
        </EditorProvider>
    )
}

export default Editor