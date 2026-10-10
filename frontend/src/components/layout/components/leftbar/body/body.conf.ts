import { NotepadTextIcon, FolderIcon, PinIcon } from "lucide-react";

export const NAVIGATION_ITEMS = [
    {
        label: "layout.sidebar.notes",
        path: "/notes",
        icon: NotepadTextIcon,
    },
    {
        label: "layout.sidebar.workspaces",
        path: "/workspaces",
        icon: FolderIcon,
    },
    {
        label: "layout.sidebar.pinned",
        path: "/pinned",
        icon: PinIcon,
    },
] as const;