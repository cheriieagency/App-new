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
import { formatAuthError, ACCOUNT_CREATED_VERIFY_EMAIL } from "@/lib/auth-error";
import { useLanguage } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import {
	clearRememberedAuth,
	hasRememberedAuth,
	loadRememberedAuth,
	saveRememberedAuth,
} from "@/lib/remember-auth";
import type { PlatformRole } from "@/lib/platform-role";
import { toast } from "sonner";

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
	const [created, setCreated] = useState(false);
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
				callbackURL: "/account/signin?verified=1",
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

			try {
				await authClient.signOut();
			} catch {
				/* ignore */
			}

			toast.success(ACCOUNT_CREATED_VERIFY_EMAIL);
			setCreated(true);
			setLoading(false);
		} catch (err) {
			setError(formatAuthError(err, "Sign up failed"));
			setLoading(false);
		}
	};

	return (
		<main className="flex min-h-screen w-full items-center justify-center bg-[#F9F8F6] text-[#2C2621] p-4 relative z-10">
			<div className="w-full max-w-[420px]">
				{created ? (
					<div className="rounded-xl border border-[#E6E3DB] bg-white p-7 flex flex-col gap-4">
						<h1 className="font-playfair text-2xl font-medium text-[#2C2621] tracking-tight">
							Check your email
						</h1>
						<p className="text-sm font-medium text-[#8A857D] leading-relaxed">
							{ACCOUNT_CREATED_VERIFY_EMAIL}
						</p>
						<a
							href={`/account/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
							className="min-h-12 rounded-xl bg-[#2C3B2E] hover:bg-[#243228] p-3 text-center text-sm font-medium text-[#F9F8F6] transition-colors"
						>
							{t('signInHere', locale)}
						</a>
					</div>
				) : (
					<form
						onSubmit={(e) => {
							void onSubmit(e);
						}}
						className="rounded-xl border border-[#E6E3DB] bg-white p-7 flex flex-col gap-4"
					>
						<div>
							<h1 className="font-playfair text-2xl font-medium text-[#2C2621] tracking-tight">
								{t('createAccount', locale)}
							</h1>
							<p className="text-sm text-[#8A857D] font-medium mt-1">
								{t('alreadyHaveAccount', locale)}{' '}
								<a
									href={`/account/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
									className="text-[#2C3B2E] hover:underline"
								>
									{t('signInHere', locale)}
								</a>
							</p>
						</div>

						{demoMode && (
							<div className="rounded-xl border border-[rgba(184,92,56,0.25)] bg-[rgba(184,92,56,0.08)] px-4 py-2.5 text-xs font-medium text-[#B85C38]">
								Demo mode: Supabase env missing/placeholder — signup uses in-memory auth for local
								testing.
							</div>
						)}

						<label className="flex flex-col gap-1.5 text-[10px] font-medium text-[#8A857D] uppercase tracking-[0.14em]">
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
								className="min-h-11 rounded-xl border border-[#E6E3DB] bg-white px-4 py-3 text-sm text-[#2C2621] font-medium outline-none focus:border-[#2C3B2E] focus:ring-2 focus:ring-[rgba(44,59,46,0.12)] transition-all placeholder:text-[#8A857D]/70"
							/>
						</label>

						<label className="flex flex-col gap-1.5 text-[10px] font-medium text-[#8A857D] uppercase tracking-[0.14em]">
							{t('emailAddress', locale)}
							<input
								type="email"
								required
								name="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								autoComplete="email"
								className="min-h-11 rounded-xl border border-[#E6E3DB] bg-white px-4 py-3 text-sm text-[#2C2621] font-medium outline-none focus:border-[#2C3B2E] focus:ring-2 focus:ring-[rgba(44,59,46,0.12)] transition-all"
							/>
						</label>

						<label className="flex flex-col gap-1.5 text-[10px] font-medium text-[#8A857D] uppercase tracking-[0.14em]">
							{t('password', locale)}
							<input
								type="password"
								required
								minLength={8}
								name="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								autoComplete="new-password"
								className="min-h-11 rounded-xl border border-[#E6E3DB] bg-white px-4 py-3 text-sm text-[#2C2621] font-medium outline-none focus:border-[#2C3B2E] focus:ring-2 focus:ring-[rgba(44,59,46,0.12)] transition-all"
							/>
						</label>

						<label className="inline-flex items-center gap-2.5 min-h-[44px] text-sm font-medium text-[#8A857D] cursor-pointer select-none">
							<input
								type="checkbox"
								checked={rememberMe}
								onChange={(e) => setRememberMe(e.target.checked)}
								className="h-4 w-4 rounded border-[#E6E3DB] text-[#2C3B2E] focus:ring-[#2C3B2E]/30"
							/>
							{t('rememberMe', locale)}
						</label>

						{error && (
							<div className="rounded-xl bg-[rgba(184,92,56,0.08)] border border-[rgba(184,92,56,0.2)] px-4 py-3 text-sm font-medium text-[#B85C38] break-words">
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className="min-h-12 rounded-xl bg-[#2C3B2E] hover:bg-[#243228] p-3 text-sm font-medium text-[#F9F8F6] disabled:opacity-50 transition-colors"
						>
							{loading ? t('loading', locale) : t('signUp', locale)}
						</button>

						<SocialSignInButtons callbackUrl={callbackUrl} />
					</form>
				)}
			</div>
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
