"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changeMyPassword, updateMyName, updateMyPhoto } from "@/app/(app)/account-actions";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/profile-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Same bucket as unit and inspection photos; profile photos live under
// profiles/<user id>/ — updateMyPhoto() only accepts URLs inside that folder.
const PHOTO_BUCKET = "unit-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const profile = useProfile();
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile.profile_photo_url);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Start from the saved values each time the dialog opens, so a cancelled
  // edit doesn't linger.
  useEffect(() => {
    if (open) {
      setName(profile.name);
      setPhotoUrl(profile.profile_photo_url);
    }
  }, [open, profile.name, profile.profile_photo_url]);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Foto maksimal 5MB.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `profiles/${profile.id}/${Date.now()}.${ext || "jpg"}`;
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: true });
      if (error) throw error;
      setPhotoUrl(supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl);
    } catch (err) {
      toast.error(err instanceof Error ? `Upload foto gagal: ${err.message}` : "Upload foto gagal.");
    } finally {
      setUploading(false);
    }
  }

  function save() {
    startTransition(async () => {
      try {
        if (name.trim() !== profile.name) await updateMyName(name);
        if (photoUrl !== profile.profile_photo_url) await updateMyPhoto(photoUrl);
        toast.success("Profil diperbarui.");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menyimpan profil.");
      }
    });
  }

  const changed = name.trim() !== profile.name || photoUrl !== profile.profile_photo_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profil</DialogTitle>
          <DialogDescription>Ganti foto profil dan nama kamu.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <Avatar className="size-20">
            {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
            <AvatarFallback className="bg-[linear-gradient(135deg,#4A2A63,#E4715A)] text-2xl font-extrabold text-white">
              {name.trim().charAt(0).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            <label
              className={`inline-flex h-8 cursor-pointer items-center rounded-lg bg-secondary px-3 text-sm font-medium ${
                uploading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {uploading ? "Mengunggah…" : "Pilih foto"}
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} disabled={uploading} />
            </label>
            {photoUrl && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setPhotoUrl(null)}>
                Hapus foto
              </Button>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="profile-name" className="mb-1.5 text-xs text-muted-foreground">
            Nama
          </Label>
          <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary text-sm" />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={isPending || uploading || !changed || name.trim().length < 2} onClick={save}>
            {isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  }, [open]);

  function save() {
    if (next.length < 8) return void toast.error("Password baru minimal 8 karakter.");
    if (next !== confirm) return void toast.error("Konfirmasi password tidak sama.");
    startTransition(async () => {
      try {
        await changeMyPassword(current, next);
        toast.success("Password diganti.");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal mengganti password.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ganti password</DialogTitle>
          <DialogDescription>Masukkan password saat ini, lalu password baru (minimal 8 karakter).</DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {[
            { id: "pw-current", label: "Password saat ini", value: current, set: setCurrent, auto: "current-password" },
            { id: "pw-new", label: "Password baru", value: next, set: setNext, auto: "new-password" },
            { id: "pw-confirm", label: "Ulangi password baru", value: confirm, set: setConfirm, auto: "new-password" },
          ].map((f) => (
            <div key={f.id}>
              <Label htmlFor={f.id} className="mb-1.5 text-xs text-muted-foreground">
                {f.label}
              </Label>
              <Input
                id={f.id}
                type="password"
                autoComplete={f.auto}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                className="bg-secondary text-sm"
              />
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending || !current || !next || !confirm}>
              {isPending ? "Menyimpan…" : "Ganti password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
