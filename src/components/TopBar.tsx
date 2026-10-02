"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, UserPen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/profile-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PasswordDialog, ProfileDialog } from "@/components/AccountDialogs";

export function TopBar() {
  const profile = useProfile();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = profile.name.charAt(0).toUpperCase();

  return (
    <div className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-border bg-card px-4 pt-5 pb-4 sm:px-6 md:px-8 md:pt-7 lg:px-10">
      <div className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo, same plain <img> approach as the rest of the app */}
        <img src="/logo.png" alt="Motorell" className="size-9 rounded-[11px]" />
        <div className="flex flex-col leading-[1.15]">
          <span className="text-[15px] font-extrabold">Motorell</span>
          <span className="text-[11px] font-semibold text-muted-foreground">Garage</span>
        </div>
      </div>

      {/* Tapping the avatar opens this menu — it used to sign you out
          immediately, which was easy to hit by accident. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Menu akun"
          className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Avatar className="size-[38px]">
            {profile.profile_photo_url && <AvatarImage src={profile.profile_photo_url} alt={profile.name} />}
            <AvatarFallback className="bg-[linear-gradient(135deg,#4A2A63,#E4715A)] text-sm font-extrabold text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <div className="px-1.5 py-1.5">
            <div className="truncate text-sm font-semibold">{profile.name}</div>
            <div className="truncate text-xs text-muted-foreground">{profile.position}</div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            <UserPen />
            Edit profil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <KeyRound />
            Ganti password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
            <LogOut />
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <PasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  );
}
