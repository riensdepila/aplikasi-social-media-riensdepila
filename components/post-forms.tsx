"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import { api, displayError, unwrap, userShape } from "@/lib/api";
import { syncUserAvatarInCache, useMyProfile } from "@/lib/queries";
import { qk } from "@/lib/queries";
import { trackEvent } from "@/lib/analytics";
import { setSession, useAppDispatch, useAppSelector } from "@/lib/store";
import { Avatar, Alert, Button, Field, Input, PageHeading, Textarea } from "@/components/ui";

const captionSchema = z.object({ caption: z.string().max(2200, "Caption must be 2,200 characters or fewer.") });
type CaptionValues = z.infer<typeof captionSchema>;
const accept = ["image/jpeg", "image/png", "image/webp"];
const validateFile = (file: File) => !accept.includes(file.type) ? "Use a JPG, PNG, or WEBP image." : file.size > 5 * 1024 * 1024 ? "Image size must be 5 MB or less." : "";

export function CreatePostForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const token = useAppSelector((s) => s.auth.token);
  const sessionUser = useAppSelector((s) => s.auth.user) as any;
  const profile = useMyProfile(Boolean(token));
  const author = (profile.data ?? sessionUser) as any;
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const form = useForm<CaptionValues>({ resolver: zodResolver(captionSchema), defaultValues: { caption: "" } });
  useEffect(() => { if (!file) { setPreview(""); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  const mutation = useMutation({
    mutationFn: (body: FormData) => api<any>("/posts", { method: "POST", body }),
    onSuccess: async (result) => {
      const data = unwrap(result);
      const id = data?.post?.id ?? data?.post?._id ?? data?.id ?? data?._id;
      const username = String(author?.username ?? "").replace(/^@/, "");
      const currentStats = author?.stats ?? author?.counts ?? {};
      const reportedCount = [author?.postsCount, author?.posts_count, author?.postCount, author?.post_count, author?.totalPosts, author?.total_posts, currentStats.posts, currentStats.postsCount, currentStats.posts_count, currentStats.totalPosts, currentStats.total_posts].map((value) => Number(value)).filter(Number.isFinite).reduce((highest, value) => Math.max(highest, value), 0);
      const expectedCount = (Number.isFinite(reportedCount) ? Math.max(0, reportedCount) : 0) + 1;
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.feed }),
        qc.invalidateQueries({ queryKey: qk.myPosts }),
        qc.invalidateQueries({ queryKey: ["posts", "profile"] }),
        qc.invalidateQueries({ queryKey: ["profile"] }),
      ]);
      const keepPostCountAtLeastNewPost = (cached: any) => {
        if (!cached) return cached;
        const stats = cached.stats ?? cached.counts ?? {};
        const cachedCounts = [cached.postsCount, cached.posts_count, cached.postCount, cached.post_count, cached.totalPosts, cached.total_posts, stats.posts, stats.postsCount, stats.posts_count, stats.totalPosts, stats.total_posts].map((value) => Number(value)).filter(Number.isFinite);
        const count = Math.max(expectedCount, ...cachedCounts);
        return { ...cached, postsCount: count, postCount: count, stats: { ...stats, posts: count, postsCount: count } };
      };
      qc.setQueryData(["profile", "me"], keepPostCountAtLeastNewPost);
      if (username) qc.setQueryData(["profile", username], keepPostCountAtLeastNewPost);
      trackEvent("post_create", { postId: id });
      router.replace(id ? `/posts/${id}` : "/feed");
    },
    onError: () => {},
  });
  const chooseFile = (candidate?: File) => { if (!candidate) return; const error = validateFile(candidate); setFileError(error); if (error) setFile(null); else setFile(candidate); };
  const submit = form.handleSubmit((values) => { if (!file || fileError) { setFileError(fileError || "Choose an image for this post."); return; } const body = new FormData(); body.append("image", file); body.append("caption", values.caption); setFileError(""); mutation.mutate(body); });
  return <><Link href="/feed" className="mb-5 inline-flex items-center gap-2 text-sm text-[#9ca1ad] hover:text-white"><ArrowLeft className="size-4"/>Back to home</Link><PageHeading eyebrow="Share a moment" title="Create post" description="Choose a photo and tell us a little about the moment."/>
    <form onSubmit={submit} className="rounded-2xl border border-white/[.06] bg-[#0b0d12] p-4 sm:p-6">
      <div className="mb-5 flex items-center gap-3"><Avatar src={author?.avatarUrl ?? author?.avatar_url ?? author?.avatar ?? author?.profileImage ?? author?.profilePicture} name={author?.name ?? "You"} size="sm"/><div><p className="text-sm font-semibold">New post</p><p className="mt-1 text-xs text-[#868b97]">Your photo will appear in your feed and profile.</p></div></div>
      <div className="grid gap-2 text-xs font-semibold text-[#e9eaf0]"><span>Photo</span><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a post photo" className="sr-only" onChange={(event) => { chooseFile(event.target.files?.[0]); event.currentTarget.value = ""; }}/><div role={preview ? undefined : "button"} tabIndex={preview ? undefined : 0} aria-label="Choose an image for your post" onKeyDown={(event) => { if (!preview && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); inputRef.current?.click(); } }} onClick={() => { if (!preview) inputRef.current?.click(); }} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }} className={`relative grid min-h-[250px] cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed ${fileError ? "border-rose-500/70" : dragging ? "border-[#9d73ff] bg-[#7138f5]/10" : "border-[#30333d] bg-[#0a0c11] hover:border-[#7253af]"}`}>
        {preview ? <><img src={preview} alt="Post image preview" className="absolute inset-0 size-full object-contain"/><div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12"><Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}><Upload className="size-3.5"/>Change photo</Button><Button type="button" size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = ""; }}><Trash2 className="size-3.5"/>Delete</Button></div></> : <div className="flex flex-col items-center px-6 text-center"><span className="mb-4 grid size-12 place-items-center rounded-xl border border-white/[.08] bg-white/[.035] text-[#b294ff]"><ImagePlus className="size-5"/></span><p className="text-sm font-semibold"><span className="text-[#b294ff]">Click to upload</span> or drag and drop</p><p className="mt-2 text-xs text-[#777c88]">Choose an image to share.</p></div>}
      </div>{fileError ? <span className="font-normal text-[#ec3a78]">{fileError}</span> : <span className="font-normal text-[#737987]">JPG, PNG, WEBP · maximum 5 MB</span>}</div>
      <div className="mt-5"><Field label="Caption" error={form.formState.errors.caption?.message}><Textarea placeholder="Tell us about this moment…" maxLength={2200} {...form.register("caption")}/></Field><div className="mt-1.5 text-right text-[11px] text-[#757a87]">{form.watch("caption").length}/2200</div></div>
      {mutation.error && <div className="mt-4"><Alert>{displayError(mutation.error)}</Alert></div>}
      <Button type="submit" busy={mutation.isPending} className="mt-5 w-full"><Upload className="size-4"/>Share post</Button>
    </form>
  </>;
}

const profileSchema = z.object({ name: z.string().min(2, "Name must be at least 2 characters."), username: z.string().min(3, "Username must be at least 3 characters.").regex(/^[a-zA-Z0-9_.]+$/, "Use letters, numbers, periods, or underscores."), phone: z.string().optional(), bio: z.string().max(500, "Bio must be 500 characters or fewer.") });
type ProfileValues = z.infer<typeof profileSchema>;
export function EditProfileForm() {
  const router = useRouter(); const qc = useQueryClient(); const inputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch(); const token = useAppSelector((s) => s.auth.token); const sessionUser = useAppSelector((s) => s.auth.user) as any;
  const profile = useMyProfile();
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState("");
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { name: "", username: "", phone: "", bio: "" } });
  const resetForm = form.reset;
  useEffect(() => { if (profile.data) resetForm({ name: profile.data.name === "User Sociality" ? "" : profile.data.name, username: profile.data.username === "unknown" ? "" : profile.data.username, phone: (profile.data as any).phone ?? "", bio: profile.data.bio }); }, [profile.data, resetForm]);
  useEffect(() => { if (!file) { setPreview(""); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  const mutation = useMutation({ mutationFn: async (values: ProfileValues) => { const body = new FormData(); body.append("name", values.name); body.append("username", values.username); if (values.phone) body.append("phone", values.phone); body.append("bio", values.bio); if (file) body.append("avatar", file); return api<any>("/me", { method: "PATCH", body }); }, onSuccess: async (result, values) => { const response = unwrap(result); const returnedUser = response?.user ?? response?.profile ?? response?.data?.user ?? response?.data?.profile ?? {}; const updatedUser = returnedUser && typeof returnedUser === "object" ? returnedUser : {}; const refreshed = await profile.refetch(); const freshProfile = refreshed.data ?? {}; const nextUser = { ...sessionUser, ...values, ...updatedUser, ...freshProfile }; const avatar = updatedUser.avatarUrl || updatedUser.avatar_url || updatedUser.avatar || updatedUser.profileImage || updatedUser.profile_image || updatedUser.profilePicture || updatedUser.profile_picture || freshProfile.avatar || sessionUser?.avatarUrl || sessionUser?.avatar || ""; if (avatar) { nextUser.avatar = avatar; nextUser.avatarUrl = avatar; nextUser.avatar_url = avatar; } if (token) { localStorage.setItem("sociality_user", JSON.stringify(nextUser)); dispatch(setSession({ token, user: nextUser })); } const normalizedUser = userShape(nextUser); qc.setQueryData(["profile", "me"], normalizedUser); syncUserAvatarInCache(qc, normalizedUser, sessionUser); await Promise.all([qc.invalidateQueries({ queryKey: ["profile"] }), qc.invalidateQueries({ queryKey: ["users", "search"] })]); router.replace("/me"); }, onError: () => {} });
  const choose = (candidate?: File) => { if (!candidate) return; const issue = validateFile(candidate); if (issue) { form.setError("root", { message: issue }); setFile(null); } else { form.clearErrors("root"); setFile(candidate); } };
  if (profile.isLoading) return <div className="py-8"><div className="mx-auto h-60 max-w-2xl animate-pulse rounded-2xl bg-white/[.04]"/></div>;
  if (profile.error || !profile.data) return <div className="py-8"><Alert>{displayError(profile.error)}</Alert><Button variant="outline" className="mt-3" onClick={() => profile.refetch()}>Try again</Button></div>;
  return <><Link href="/me" className="mb-5 inline-flex items-center gap-2 text-sm text-[#9ca1ad] hover:text-white"><ArrowLeft className="size-4"/>Back to profile</Link><PageHeading eyebrow="Account settings" title="Edit profile" description="Update the information your friends see."/>
    <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="rounded-2xl border border-white/[.06] bg-[#0b0d12] p-5 sm:p-7"><div className="mb-6 flex items-center gap-4"><Avatar src={preview || profile.data.avatar} name={profile.data.name} size="lg"/><div><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { choose(e.target.files?.[0]); e.currentTarget.value = ""; }}/><Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}><Upload className="size-3.5"/>Change photo</Button><p className="mt-2 text-[11px] text-[#7f8490]">Profile photo JPG, PNG, WEBP · max 5 MB</p></div></div>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="Name" error={form.formState.errors.name?.message}><Input placeholder="Display name" {...form.register("name")}/></Field><Field label="Username" error={form.formState.errors.username?.message}><Input placeholder="username" {...form.register("username")}/></Field><Field label="Email" hint="Email is managed by the server"><Input disabled value={(profile.data as any).email ?? ""} placeholder="Account email" className="cursor-not-allowed opacity-60"/></Field><Field label="Phone number"><Input type="tel" placeholder="08xxxxxxxxxx" {...form.register("phone")}/></Field><div className="sm:col-span-2"><Field label="Bio" error={form.formState.errors.bio?.message}><Textarea placeholder="Tell us a little about yourself…" maxLength={500} {...form.register("bio")}/></Field></div></div>
      {form.formState.errors.root?.message && <p className="mt-4 text-sm text-rose-300">{form.formState.errors.root.message}</p>}{mutation.error && <div className="mt-4"><Alert>{displayError(mutation.error)}</Alert></div>}<Button type="submit" busy={mutation.isPending} className="mt-6 w-full sm:w-auto">Save changes</Button>
    </form></>;
}
