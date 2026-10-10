import { Route, Routes } from "react-router-dom"

import NotePage from "@/pages/note/page"

function App() {
    return (
        <Routes>
            <Route path="/notes/:id" element={<NotePage />} />
        </Routes>
    )
}

export default App
