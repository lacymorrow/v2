import { exec } from "child_process";
import { NextResponse } from "next/server";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: Request) {
    try {
        const { components } = await request.json();

        // Run the shadcn-ui add command
        const { stdout } = await execAsync(
            `pnpm dlx shadcn-ui@latest add ${components.join(" ")}`,
            {
                cwd: process.cwd(),
            },
        );

        return NextResponse.json({ success: true, output: stdout });
    } catch (error) {
        console.error("Failed to install components:", error);
        return NextResponse.json(
            { error: "Failed to install components" },
            { status: 500 },
        );
    }
}
