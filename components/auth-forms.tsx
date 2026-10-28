"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, displayError, unwrap } from "@/lib/api";
import { setSession, useAppDispatch } from "@/lib/store";
import { Alert, Button, Field, Input, Logo } from "@/components/ui";

const loginSchema = z.object({ email: z.string().email("Enter a valid email address."), password: z.string().min(6, "Password must be at least 6 characters.") });
const registerSchema = z.object({ name: z.string().min(2, "Name must be at least 2 characters."), username: z.string().min(3, "Username must be at least 3 characters.").regex(/^[a-zA-Z0-9_.]+$/, "Use letters, numbers, periods, or underscores."), email: z.string().email("Enter a valid email address."), phone: z.string().optional(), password: z.string().min(6, "Password must be at least 6 characters."), confirmPassword: z.string() }).refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });
type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
const value = (data: any) => unwrap(data);
const tokenFrom = (data: any) => { const root = value(data); return root?.token ?? root?.accessToken ?? root?.access_token ?? root?.data?.token ?? root?.data?.accessToken ?? ""; };
const userFrom = (data: any) => { const root = value(data); return root?.user ?? root?.profile ?? root?.data?.user ?? null; };

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { name: "", username: "", email: "", phone: "", password: "", confirmPassword: "" } });

  const saveSession = (auth: any) => {
    const token = tokenFrom(auth);
    if (!token) throw new Error("The server did not return a session token. Please sign in again.");
    const user = userFrom(auth);
    localStorage.setItem("sociality_token", token);
    if (user) localStorage.setItem("sociality_user", JSON.stringify(user));
    dispatch(setSession({ token, user }));
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    router.replace(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/feed");
  };

  const onLogin = loginForm.handleSubmit(async (form) => {
    setError(""); setBusy(true);
    try { saveSession(await api("/auth/login", { method: "POST", body: JSON.stringify(form) })); }
    catch (err) { setError(displayError(err)); }
    finally { setBusy(false); }
  });
  const onRegister = registerForm.handleSubmit(async ({ confirmPassword, ...form }) => {
    setError(""); setBusy(true);
    try {
      await api("/auth/register", { method: "POST", body: JSON.stringify({ ...form, phone: form.phone || undefined }) });
      const auth = await api("/auth/login", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password }) });
      saveSession(auth);
    } catch (err) { setError(displayError(err)); }
    finally { setBusy(false); }
  });

  const registerFields = [
    { label: "Name", name: "name" as const, placeholder: "Name shown on your profile" },
    { label: "Username", name: "username" as const, placeholder: "username" },
    { label: "Email", name: "email" as const, placeholder: "nama@email.com", type: "email" },
    { label: "Phone number", name: "phone" as const, placeholder: "08xxxxxxxxxx" },
  ];
  const loginErrors = loginForm.formState.errors;
  const registerErrors = registerForm.formState.errors;

  return <main className="auth-backdrop flex min-h-screen items-center justify-center overflow-y-auto px-4 py-10 sm:py-14"><div className="w-full max-w-[460px] rounded-[28px] border border-[#26222e] bg-black/65 p-6 shadow-[0_25px_90px_rgba(0,0,0,.5)] backdrop-blur-xl sm:p-10">
    <div className="mb-7 flex flex-col items-center"><Logo /><h1 className="mt-6 text-[24px] font-bold">{isLogin ? "Welcome back" : "Create your Sociality account"}</h1><p className="mt-2 text-center text-sm text-[#999daa]">{isLogin ? "Sign in to continue your story." : "Join and start sharing moments."}</p></div>
    {error && <div className="mb-5"><Alert>{error}</Alert></div>}
    {isLogin ? <form onSubmit={onLogin} className="space-y-5" noValidate>
      <Field label="Email" error={loginErrors.email?.message as string}><Input type="email" autoComplete="email" placeholder="nama@email.com" {...loginForm.register("email")} aria-invalid={Boolean(loginErrors.email)} /></Field>
      <Field label="Password" error={loginErrors.password?.message as string}><span className="relative block"><Input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" className="pr-12" {...loginForm.register("password")} aria-invalid={Boolean(loginErrors.password)} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777d89] hover:text-white">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></Field>
      <Button type="submit" busy={busy} className="w-full">Sign in</Button>
      <p className="pt-1 text-center text-sm text-[#a6a9b4]">Do not have an account? <Link className="font-semibold text-[#aa8cff] hover:text-white" href="/register">Sign up</Link></p>
    </form> : <form onSubmit={onRegister} className="space-y-4" noValidate>
      {registerFields.map((field) => <Field key={field.name} label={field.label} error={(registerErrors as any)[field.name]?.message}><Input type={field.type || "text"} autoComplete={field.name === "email" ? "email" : field.name === "phone" ? "tel" : "off"} placeholder={field.placeholder} {...registerForm.register(field.name)} aria-invalid={Boolean((registerErrors as any)[field.name])} /></Field>)}
      <Field label="Password" error={registerErrors.password?.message}><span className="relative block"><Input type={showPassword ? "text" : "password"} placeholder="At least 6 characters" autoComplete="new-password" className="pr-12" {...registerForm.register("password")} aria-invalid={Boolean(registerErrors.password)} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Show or hide password" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777d89]"><Eye className="size-4" /></button></span></Field>
      <Field label="Confirm password" error={registerErrors.confirmPassword?.message}><Input type={showPassword ? "text" : "password"} placeholder="Re-enter your password" autoComplete="new-password" {...registerForm.register("confirmPassword")} aria-invalid={Boolean(registerErrors.confirmPassword)} /></Field>
      <Button type="submit" busy={busy} className="mt-2 w-full">Sign up</Button>
      <p className="pt-1 text-center text-sm text-[#a6a9b4]">Already have an account? <Link className="font-semibold text-[#aa8cff] hover:text-white" href="/login">Sign in</Link></p>
    </form>}
  </div></main>;
}
