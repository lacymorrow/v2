import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { OAuthButtons } from "@/app/(app)/(authentication)/_components/oauth-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";
import { authProvidersArray } from "@/server/auth.providers";
import { Link } from "@/components/primitives/link-with-transition";

interface AuthFormProps extends ComponentPropsWithoutRef<"div"> {
	mode: "sign-in" | "sign-up";
	children: ReactNode;
	title?: string;
	description?: string;
}

export function AuthForm({
	mode = "sign-in",
	className,
	children,
	title,
	description,
	...props
}: AuthFormProps) {
	const isSignIn = mode === "sign-in";
	const cardTitle = typeof title === "string" ? title : (isSignIn ? "Welcome to Shipkit" : "Create an account");
	const cardDescription = typeof description === "string" ? description : isSignIn
		? "Login to get started"
		: "Sign up to get started";
	const alternateLink = isSignIn
		? { text: "Don't have an account?", href: routes.auth.signUp, label: "Sign up" }
		: { text: "Already have an account?", href: routes.auth.signIn, label: "Sign in" };

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-xl">{cardTitle}</CardTitle>
					<CardDescription>{cardDescription}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-6">
						<OAuthButtons />
						{/* Only show email sign-in if credentials provider is enabled */}
						{authProvidersArray.includes("credentials") && (
							<>
								<div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
									<span className="relative z-10 bg-background px-2 text-muted-foreground">
										Or continue with email
									</span>
								</div>
								{children}
							</>
						)}
						<div className="text-center text-sm">
							{alternateLink.text}{" "}
							<Link href={alternateLink.href} className="underline underline-offset-4">
								{alternateLink.label}
							</Link>
						</div>
					</div>
				</CardContent>
			</Card>
			<div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
				By clicking continue, you agree to our <Link href={routes.terms}>Terms of Service</Link> and{" "}
				<Link href={routes.privacy}>Privacy Policy</Link>.
			</div>
		</div>
	);
}
