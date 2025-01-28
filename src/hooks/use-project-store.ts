"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProjectState {
    projectName: string | null;
    projectUrl: string | null;
    selectedFile: string | null;
    fileContent: string;
    setProject: (name: string, url: string) => void;
    setFile: (path: string | null, content?: string) => void;
    reset: () => void;
}

export const useProjectStore = create<ProjectState>()(
    persist(
        (set) => ({
            projectName: null,
            projectUrl: null,
            selectedFile: null,
            fileContent: "",
            setProject: (name, url) =>
                set({ projectName: name, projectUrl: url, selectedFile: null, fileContent: "" }),
            setFile: (path, content = "") =>
                set({ selectedFile: path, fileContent: content }),
            reset: () =>
                set({ projectName: null, projectUrl: null, selectedFile: null, fileContent: "" }),
        }),
        {
            name: "project-storage",
        },
    ),
);
