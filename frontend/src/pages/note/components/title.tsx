import { useTranslation } from 'react-i18next'
import { useNoteContext } from '@/contexts/note-context'

export const NoteTitle = () => {

    const { t: translation } = useTranslation()
    const { title, setTitle } = useNoteContext()

    return (
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="text-2xl font-bold outline-0" placeholder={translation('note.untitled')} />
    )
}
