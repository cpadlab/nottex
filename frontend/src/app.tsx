import { Route, Routes } from "react-router-dom"

import NotePage from "@/pages/note/page"

import Layout from "@/components/layout/layout"

function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/notes/:id" element={<NotePage />} />
            </Route>
        </Routes>
    )
}

export default App
