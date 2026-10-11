import { createContext, useContext, type ReactNode } from 'react'
import { useNote, type UseNoteOptions } from '@/hooks/use-note'

export type NoteContextValue = ReturnType<typeof useNote>

export const NoteContext = createContext<NoteContextValue | null>(null)

export interface NoteProviderProps {
    children: ReactNode
    options?: UseNoteOptions
}

export const NoteProvider = ({ children, options }: NoteProviderProps) => {
    
    const note = useNote(options)

    return (
        <NoteContext.Provider value={note}>
            {children}
        </NoteContext.Provider>
    )

}

export const useNoteContext = () => {
    
    const context = useContext(NoteContext)

    if (!context) {
        throw new Error('useNoteContext must be used within a NoteProvider')
    }

    return context

}

