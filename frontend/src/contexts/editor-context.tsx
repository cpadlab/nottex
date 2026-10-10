import { createContext, useContext, type ReactNode } from "react"
import { useEditor, type UseEditorOptions } from "@/hooks/use-editor"

export type EditorContextValue = ReturnType<typeof useEditor>

export const EditorContext = createContext<EditorContextValue | null>(null)

export interface EditorProviderProps {
    children: ReactNode
    options?: UseEditorOptions
}

export const EditorProvider = ({ children, options }: EditorProviderProps) => {
    
    const editor = useEditor(options)

    return (
        <EditorContext.Provider value={editor}>
            {children}
        </EditorContext.Provider>
    )

}

export const useEditorContext = () => {
    
    const context = useContext(EditorContext)
    
    if (!context) {
        throw new Error("useEditorContext must be used within an EditorProvider")
    }
    
    return context

}
