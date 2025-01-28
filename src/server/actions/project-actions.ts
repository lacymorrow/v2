"use server";

import { generateApp } from "@/server/services/app-generator";
import { generateRandomName } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function generateProject() {
	const name = generateRandomName();
	const app = await generateApp({
		prompt: "Basic React app",
		name,
		template: "react",
	});
	revalidatePath("/");
	return { name, publicUrl: app.publicUrl };
}
