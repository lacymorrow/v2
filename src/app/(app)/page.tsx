"use client";

import { DeployToVercelButton } from "@/components/buttons/vercel-deploy-button";
import { Link } from "@/components/primitives/link-with-transition";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/primitives/page-header";
import { Attribution } from "@/components/ui/attribution";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";
import { IconBrandGithub } from "@tabler/icons-react";
import type { WebContainer } from "@webcontainer/api";
import { Space_Grotesk } from "next/font/google";
import { useEffect, useRef, useState } from "react";

const font = Space_Grotesk({
  weight: ["400"],
  style: ["normal"],
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export default function Page() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<string>("Loading...");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installOutput, setInstallOutput] = useState<string>("");

  useEffect(() => {
    let webcontainerInstance: WebContainer | null = null;

    async function startDevServer() {
      try {
        setStatus("Booting WebContainer...");
        const { WebContainer } = await import("@webcontainer/api");
        webcontainerInstance = await WebContainer.boot();

        setStatus("Installing dependencies...");
        // First install Vite and its plugin
        const installViteProcess = await webcontainerInstance.spawn("pnpm", [
          "add",
          "-D",
          "vite@latest",
          "@vitejs/plugin-react@latest",
        ]);

        // Stream install output
        installViteProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log("Vite install output:", data);
              setInstallOutput((prev) => prev + data);
            },
          })
        );

        const viteInstallExitCode = await installViteProcess.exit;
        if (viteInstallExitCode !== 0) {
          throw new Error("Vite installation failed");
        }

        // Then install project dependencies
        const installProcess = await webcontainerInstance.spawn("pnpm", [
          "install",
        ]);

        // Stream install output
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log("Install output:", data);
              setInstallOutput((prev) => prev + data);
            },
          })
        );

        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
          throw new Error("Installation failed");
        }

        setStatus("Starting dev server...");
        const serverProcess = await webcontainerInstance.spawn("pnpm", [
          "dev",
          "--host",
        ]);

        // Wait for server to be ready
        webcontainerInstance.on("server-ready", (port, url) => {
          setStatus("Server ready!");
          setUrl(url);
          if (iframeRef.current) {
            iframeRef.current.src = url;
          }
        });

        // Stream server output
        serverProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log("Server output:", data);
              setInstallOutput((prev) => prev + data);
            },
          })
        );

        // Handle server exit
        serverProcess.exit.then((code) => {
          if (code !== 0) {
            setError(`Server exited with code ${code}`);
            setStatus("Server crashed");
          }
        });
      } catch (err) {
        console.error("Error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setStatus("Failed");
      }
    }

    startDevServer();

    return () => {
      if (webcontainerInstance) {
        webcontainerInstance.teardown();
      }
    };
  }, []);

  return (
    <>
      <div className="container flex flex-col items-center justify-start gap-2xl p-16 text-center">
        <PageHeader className="flex flex-col items-center justify-center">
          <PageHeaderHeading
            className={cn("font-bold md:text-[8rem]", font.className)}
          >
            Bones
          </PageHeaderHeading>
          <PageHeaderDescription className="text-xl">
            The Next.js stack for Shadcn/UI.
          </PageHeaderDescription>
          <PageHeaderDescription className="text-lg text-muted-foreground">
            Next.js v15, Auth.JS v5, Tailwind v4 (soon), and a built-in
            interface for installing UI components.
          </PageHeaderDescription>
        </PageHeader>

        <div className="mb-10 flex flex-col gap-md md:flex-row">
          <Link
            href={"https://github.com/shipkit-io/bones"}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <IconBrandGithub className="mr-2 h-5 w-5" /> View on GitHub
          </Link>
          <DeployToVercelButton href={routes.external.vercelDeployBones} />
        </div>

        <div className="mt-4 w-full space-y-4">
          <div className="rounded border p-4">
            <p>Status: {status}</p>
            {url && (
              <p>
                Server URL:{" "}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {url}
                </a>
              </p>
            )}
            {error && <p className="text-red-500">Error: {error}</p>}
          </div>

          <div className="rounded border bg-black p-4 font-mono text-sm text-white">
            <pre className="whitespace-pre-wrap">{installOutput}</pre>
          </div>

          <div className="h-[500px] rounded border">
            <iframe
              ref={iframeRef}
              className="h-full w-full border-none"
              title="WebContainer Preview"
            />
          </div>
        </div>

        <div className="mt-auto flex flex-col items-center gap-md text-sm md:flex-row">
          <Link
            href={"https://log.bones.sh"}
            className={buttonVariants({ variant: "link", size: "sm" })}
          >
            See user errors in real-time with Bones Log
          </Link>
        </div>
      </div>
      <Attribution
        variant="popover"
        title="Build with Cursor + v0"
        description="Get full-stack superpowers with Shipkit"
        href="https://shipkit.io"
      />
    </>
  );
}
