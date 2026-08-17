/**
 * ⚠ ANYTHING PLATFORM — DO NOT REWRITE THIS FILE ⚠
 *
 * Shipped v2 auth scaffolding. The <form onSubmit>, e.preventDefault(), and
 * window.location.href redirect are load-bearing for the mobile WebView auth
 * flow (AuthWebView intercepts the navigation to capture the session). A
 * prior AI rewrite replaced <form onSubmit> with <button onClick> and broke
 * signup platform-wide — "credentials cleared" / "button does nothing" for
 * every user until a human reverted it. DO NOT repeat that mistake.
 *
 *   Safe:   restyle, rewrite copy, add form fields (pass `name` explicitly).
 *   Unsafe: replacing <form>, removing preventDefault, bypassing
 *           authClient.signUp.email, changing the callbackUrl redirect.
 */
"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { SocialSignInButtons } from "@/components/SocialSignInButtons";
import { authClient } from "@/lib/auth-client";
import { isDemoAuthUiEnabled } from "@/lib/auth-env";
import { formatAuthError } from "@/lib/auth-error";
import { useLanguage } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import {
	clearRememberedAuth,
	hasRememberedAuth,
	loadRememberedAuth,
	saveRememberedAuth,
} from "@/lib/remember-auth";
import { persistPlatformRole } from "@/lib/use-platform-role";
import type { PlatformRole } from "@/lib/platform-role";

function SignUpForm() {
	const searchParams = useSearchParams();
	const { locale } = useLanguage();
	const rawCallback = searchParams.get("callbackUrl") || "/dashboard";
	const role: PlatformRole =
		rawCallback.startsWith("/admin") || rawCallback.startsWith("/planner")
			? "creator"
			: "member";
	const callbackUrl = role === "creator" ? "/admin" : "/dashboard";
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [workspaceName, setWorkspaceName] = useState("");
	const [rememberMe, setRememberMe] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const demoMode = isDemoAuthUiEnabled();

	// Prefill email/password when Remember Me was used previously.
	useEffect(() => {
		const saved = loadRememberedAuth();
		if (!saved) return;
		setEmail(saved.email);
		setPassword(saved.password);
		setRememberMe(true);
	}, []);

	const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const trimmedWorkspace = workspaceName.trim();
			if (trimmedWorkspace.length < 2) {
				setError("Workspace name is required");
				setLoading(false);
				return;
			}

			const { stashPendingWorkspaceName } = await import(
				'@/lib/workspace-naming'
			);
			stashPendingWorkspaceName(trimmedWorkspace);

			// Better Auth stores workspaceName on the user via additionalFields.
			const { error: signUpError } = await authClient.signUp.email({
				email,
				password,
				name: "",
				workspaceName: trimmedWorkspace,
			} as Parameters<typeof authClient.signUp.email>[0] & {
				workspaceName: string;
			});

			if (signUpError) {
				// Prefer the backend's detailed message/code over a generic fallback.
				setError(formatAuthError(signUpError, "Sign up failed"));
				setLoading(false);
				return;
			}

			if (rememberMe) {
				saveRememberedAuth(email, password);
			} else if (hasRememberedAuth()) {
				clearRememberedAuth();
			}

			// Seed the default personal workspace for new accounts.
			try {
				const { ensureDefaultWorkspace } = await import(
					'@/lib/mock-workspace-profiles'
				);
				ensureDefaultWorkspace(trimmedWorkspace);
			} catch {
				/* ignore */
			}

			const home = await persistPlatformRole(role);

			// Creators complete the onboarding questionnaire before admin.
			const next =
				role === 'creator'
					? '/onboarding'
					: home || callbackUrl;

			if (typeof window !== 'undefined') {
				window.location.href = next;
			} else {
				console.warn(
					"signup: window is undefined; cannot redirect to callbackUrl",
				);
			}
		} catch (err) {
			setError(formatAuthError(err, "Sign up failed"));
			setLoading(false);
		}
	};

	return (
		<main className="nc-app nc-app-shell flex min-h-screen w-full items-center justify-center p-4 relative z-10">
			<form
				onSubmit={(e) => {
					void onSubmit(e);
				}}
				className="nc-glass flex w-full max-w-[400px] flex-col gap-4 rounded-[1.5rem] p-7 relative z-10"
			>
				<h1 className="font-display text-2xl font-extrabold text-[#2c3340]">{t('createAccount', locale)}</h1>

				{demoMode && (
					<div className="rounded-[8px] border border-amber-300 bg-amber-50 p-[10px] text-[13px] text-amber-900">
						Demo mode: Supabase env missing/placeholder — signup uses in-memory auth for local testing.
					</div>
				)}

				<label className="flex flex-col gap-[4px] text-[14px]">
					Workspace name
					<input
						type="text"
						required
						name="workspaceName"
						minLength={2}
						maxLength={80}
						value={workspaceName}
						onChange={(e) => setWorkspaceName(e.target.value)}
						autoComplete="organization"
						placeholder="e.g. Ebba Creator Lab"
						className="rounded-2xl border border-[#d5dce8] bg-white/70 p-3 text-[16px] outline-none focus:border-[var(--nc-coral)] focus:ring-2 focus:ring-[#f2eeff]"
					/>
				</label>

				<label className="flex flex-col gap-[4px] text-[14px]">
					{t('emailAddress', locale)}
					<input
						type="email"
						required
						name="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						autoComplete="email"
						className="rounded-2xl border border-[#d5dce8] bg-white/70 p-3 text-[16px] outline-none focus:border-[var(--nc-coral)] focus:ring-2 focus:ring-[#f2eeff]"
					/>
				</label>

				<label className="flex flex-col gap-[4px] text-[14px]">
					{t('password', locale)}
					<input
						type="password"
						required
						minLength={8}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						autoComplete="new-password"
						className="rounded-2xl border border-[#d5dce8] bg-white/70 p-3 text-[16px] outline-none focus:border-[var(--nc-coral)] focus:ring-2 focus:ring-[#f2eeff]"
					/>
				</label>

				<label className="inline-flex items-center gap-2.5 min-h-[44px] text-sm font-bold text-zinc-600 cursor-pointer select-none">
					<input
						type="checkbox"
						checked={rememberMe}
						onChange={(e) => setRememberMe(e.target.checked)}
						className="h-4 w-4 rounded border-zinc-300 text-[var(--nc-coral)] focus:ring-[var(--nc-coral)]"
					/>
					{t('rememberMe', locale)}
				</label>

				{error && (
					<div className="rounded-[8px] bg-red-50 p-[10px] text-[14px] text-red-600 break-words">
						{error}
					</div>
				)}

				<button
					type="submit"
					disabled={loading}
					className="rounded-full bg-[var(--nc-coral)] p-3 text-[16px] font-extrabold text-white disabled:opacity-50 hover:opacity-90 transition-all"
				>
					{loading ? t('loading', locale) : t('signUp', locale)}
				</button>

				<SocialSignInButtons callbackUrl={callbackUrl} />

				<a
					href={`/account/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
					className="text-center text-[14px] text-[var(--nc-coral)] hover:opacity-80"
				>
					{t('alreadyHaveAccount', locale)} {t('signInHere', locale)}
				</a>
			</form>
		</main>
	);
}

export default function SignUpPage() {
	return (
		<Suspense>
			<SignUpForm />
		</Suspense>
	);
}
