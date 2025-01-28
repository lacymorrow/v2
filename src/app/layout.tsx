import type { Metadata } from "next";
import type React from "react";

import { RootLayout } from "@/components/layouts/root-layout";
import { ThemeToggle } from "@/components/ui/theme";
import { metadata as defaultMetadata } from "@/config/metadata";
import { initializeServer } from "@/server/init";
import { Toaster } from "sonner";
// import "./globals.css";

// Initialize server-side services
initializeServer().catch(console.error);

export const metadata: Metadata = defaultMetadata;

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<RootLayout>
			{children}
			<ThemeToggle />
			<Toaster />
		</RootLayout>
	);
}
