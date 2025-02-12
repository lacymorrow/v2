import { siteConfig } from "@/config/site";
import type { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

export const providers: NextAuthConfig["providers"] = [
	// Magic Link Provider
	process.env.AUTH_RESEND_KEY &&
		process.env.DATABASE_URL &&
		Resend({
			from: siteConfig.email.support,
		}),
	// Credentials({
	// 	name: "credentials", // Used by Oauth buttons to determine the active sign-in options
	// 	credentials: {
	// 		email: { label: "Email", type: "email" },
	// 		password: { label: "Password", type: "password" },
	// 	},
	// 	async authorize(credentials, request) {
	// 		// TODO: Implement credentials auth
	// 		// return await AuthService.validateCredentials(credentials);
	// 		return null;
	// 	},
	// }),
	Discord({
		clientId: process.env.AUTH_DISCORD_ID ?? "",
		clientSecret: process.env.AUTH_DISCORD_SECRET ?? "",
		allowDangerousEmailAccountLinking: true,
	}),
	GitHub({
		clientId: process.env.AUTH_GITHUB_ID ?? "",
		clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
		authorization: {
			params: {
				scope: "read:user user:email repo",
			},
		},
		profile(profile) {
			return {
				id: profile.login,
				name: profile.name ?? profile.login,
				email: profile.email,
				emailVerified: null,
				image: profile.avatar_url,
				githubUsername: profile.login,
			};
		},
		allowDangerousEmailAccountLinking: true,
	}),
	Google({
		clientId: process.env.AUTH_GOOGLE_ID ?? "",
		clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
		allowDangerousEmailAccountLinking: true,
	}),
].filter(Boolean) as NextAuthConfig["providers"];

export const authProviders = providers.map((provider: NextAuthConfig["providers"][number]) => {
	if (typeof provider === "function") {
		const providerData = provider as () => { id: string; name: string };
		return providerData();
	}

	return { id: provider.id, name: provider.name };
});

export const authProvidersArray = authProviders.map(
	(provider) => provider.id ?? provider.name.toLowerCase()
);
