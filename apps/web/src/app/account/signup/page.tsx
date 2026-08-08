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
import { type FormEvent, Suspense, useState } from "react";
import { SocialSignInButtons } from "@/components/SocialSignInButtons";
import { authClient } from "@/lib/auth-client";
import { isDemoAuthUiEnabled } from "@/lib/auth-env";
import { formatAuthError } from "@/lib/auth-error";

function SignUpForm() {
	const searchParams = useSearchParams();
	const callbackUrl = searchParams.get("callbackUrl") || "/";
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const demoMode = isDemoAuthUiEnabled();

	const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			// The server backfills `name` from the email local-part when it's missing,
			// so email + password is enough. Demo mode uses in-memory auth when
			// Supabase / DATABASE_URL env is missing or still a placeholder.
			const { error: signUpError } = await authClient.signUp.email({
				email,
				password,
				name: "",
			});

			if (signUpError) {
				// Prefer the backend's detailed message/code over a generic fallback.
				setError(formatAuthError(signUpError, "Sign up failed"));
				setLoading(false);
				return;
			}

			if (typeof window !== "undefined") {
				window.location.href = callbackUrl;
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
				<h1 className="font-display text-2xl font-extrabold text-[#2c3340]">Create account</h1>

				{demoMode && (
					<div className="rounded-[8px] border border-amber-300 bg-amber-50 p-[10px] text-[13px] text-amber-900">
						<strong>Demo-läge:</strong> Supabase-miljövariabler saknas eller är
						placeholders. Registrering körs mot in-memory auth för lokal test —
						konton sparas inte permanent.
					</div>
				)}

				<label className="flex flex-col gap-[4px] text-[14px]">
					Email
					<input
						type="email"
						required
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="rounded-2xl border border-[#d5dce8] bg-white/70 p-3 text-[16px] outline-none focus:border-[var(--nc-coral)] focus:ring-2 focus:ring-[#f2eeff]"
					/>
				</label>

				<label className="flex flex-col gap-[4px] text-[14px]">
					Password
					<input
						type="password"
						required
						minLength={8}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="rounded-2xl border border-[#d5dce8] bg-white/70 p-3 text-[16px] outline-none focus:border-[var(--nc-coral)] focus:ring-2 focus:ring-[#f2eeff]"
					/>
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
					{loading ? "Creating account…" : "Sign Up"}
				</button>

				<SocialSignInButtons callbackUrl={callbackUrl} />

				<a
					href={`/account/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
					className="text-center text-[14px] text-[var(--nc-coral)] hover:opacity-80"
				>
					Already have an account? Sign in
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
