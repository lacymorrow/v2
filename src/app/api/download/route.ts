import { APP_STORAGE_PATH } from "@/server/services/app-generator";
import archiver from "archiver";
import { NextResponse } from "next/server";
import { join } from "path";

export async function POST(request: Request) {
	try {
		const { name } = await request.json();
		const projectPath = join(APP_STORAGE_PATH, name);

		// Create a zip archive
		const archive = archiver("zip", {
			zlib: { level: 9 }, // Maximum compression
		});

		// Create a buffer to store the zip
		const chunks: Uint8Array[] = [];
		archive.on("data", (chunk) => chunks.push(chunk));

		// Add the project directory to the archive
		archive.directory(projectPath, false);

		// Wait for the archive to finalize
		await new Promise((resolve, reject) => {
			archive.on("end", resolve);
			archive.on("error", reject);
			archive.finalize();
		});

		// Combine chunks into a single buffer
		const buffer = Buffer.concat(chunks);

		// Return the zip file
		return new NextResponse(buffer, {
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": `attachment; filename="${name}.zip"`,
			},
		});
	} catch (error) {
		console.error("Failed to download project:", error);
		return NextResponse.json(
			{ error: "Failed to download project" },
			{ status: 500 },
		);
	}
}
