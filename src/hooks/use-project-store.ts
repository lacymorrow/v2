"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProjectState {
    projectName: string | null;
    projectUrl: string | null;
    selectedFile: string | null;
    fileContent: string;
    isLoading: boolean;
    generationStatus: {
        step: string;
        progress: number;
    } | null;
    setProject: (name: string, url: string) => void;
    setFile: (path: string | null, content?: string) => void;
    setLoading: (loading: boolean) => void;
    setGenerationStatus: (status: { step: string; progress: number } | null) => void;
    reset: () => void;
}

export const useProjectStore = create<ProjectState>()(
    persist(
        (set) => ({
            projectName: null,
            projectUrl: null,
            selectedFile: null,
            fileContent: "",
            isLoading: false,
            generationStatus: null,
            setProject: (name, url) =>
                set({ projectName: name, projectUrl: url, selectedFile: null, fileContent: "" }),
            setFile: (path, content = "") =>
                set({ selectedFile: path, fileContent: content }),
            setLoading: (loading) => set({ isLoading: loading }),
            setGenerationStatus: (status) => set({ generationStatus: status }),
            reset: () =>
                set({
                    projectName: null,
                    projectUrl: null,
                    selectedFile: null,
                    fileContent: "",
                    isLoading: false,
                    generationStatus: null
                }),
        }),
        {
            name: "project-storage",
        },
    ),
);
