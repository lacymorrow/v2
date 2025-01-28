import { useTheme } from "./components/theme-provider";
import { ThemeToggle } from "./components/theme-toggle";
import { Button } from "./components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./components/ui/card";

export default function App() {
	const { theme } = useTheme();

	return (
		<div className="min-h-screen bg-background p-8 antialiased">
			<div className="mx-auto max-w-2xl">
				<div className="flex items-center justify-between">
					<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
						Welcome to Vite
					</h1>
					<ThemeToggle />
				</div>

				<div className="mt-8 grid gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Getting Started</CardTitle>
							<CardDescription>
								Edit{" "}
								<code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
									src/App.tsx
								</code>{" "}
								and save to test HMR
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="leading-7 [&:not(:first-child)]:mt-6">
								This template provides a minimal setup to get React working in
								Vite with HMR and some ESLint rules.
							</p>
						</CardContent>
						<CardFooter>
							<div className="flex gap-4">
								<Button variant="default" asChild>
									<a href="https://vitejs.dev" target="_blank">
										Vite Docs
									</a>
								</Button>
								<Button variant="outline" asChild>
									<a href="https://react.dev" target="_blank">
										React Docs
									</a>
								</Button>
							</div>
						</CardFooter>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Features</CardTitle>
							<CardDescription>
								Built with modern tools and best practices
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="my-6 ml-6 list-disc [&>li]:mt-2">
								<li>React 18 with TypeScript</li>
								<li>Vite for fast builds and HMR</li>
								<li>Shadcn/UI components</li>
								<li>Dark mode support</li>
								<li>Tailwind CSS for styling</li>
								<li>ESLint for code quality</li>
							</ul>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
