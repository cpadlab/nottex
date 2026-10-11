import {
    NotepadTextIcon,
    FolderIcon,
    PinIcon,
    UsersIcon,
    Trash2Icon,
    SettingsIcon,
    SparklesIcon,
} from "lucide-react";
import { GithubIcon } from "@/assets/github-icon";
import type { ComponentType } from "react";

export interface NavigationItem {
    label: string;
    path: string;
    icon: ComponentType<{ className?: string }>;
    isExternal?: boolean;
}

export interface NavigationGroup {
    id: string;
    label?: string;
    items: NavigationItem[];
}

export const NAVIGATION_GROUPS: NavigationGroup[] = [
    {
        id: "workspace",
        label: "layout.sidebar.workspace",
        items: [
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
            {
                label: "layout.sidebar.shared",
                path: "/notes/shared",
                icon: UsersIcon,
            },
        ],
    },
    {
        id: "trash",
        label: "layout.sidebar.trash_group",
        items: [
            {
                label: "layout.sidebar.trash",
                path: "/notes/trash",
                icon: Trash2Icon,
            },
        ],
    },
    {
        id: "settings",
        label: "layout.sidebar.settings_group",
        items: [
            {
                label: "layout.sidebar.settings",
                path: "/settings",
                icon: SettingsIcon,
            },
            {
                label: "layout.sidebar.changelog",
                path: "/changelog",
                icon: SparklesIcon,
            },
            {
                label: "layout.sidebar.github",
                path: "https://github.com/cpadlab/nottex",
                icon: GithubIcon,
                isExternal: true,
            },
        ],
    },
];

export const NAVIGATION_ITEMS = NAVIGATION_GROUPS[0].items;