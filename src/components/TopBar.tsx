"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/profile-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const profile = useProfile();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = profile.name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between px-4 pt-5 pb-4 md:px-8 md:pt-7 lg:px-10">
      <div className="flex items-center gap-2.5">
        <div className="size-9 rounded-[11px] bg-[linear-gradient(135deg,#4A2A63,#E4715A)]" />
        <div className="flex flex-col leading-[1.15]">
          <span className="text-[15px] font-extrabold">Motorell</span>
          <span className="text-[11px] font-semibold text-muted-foreground">Garage</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        title="Sign out"
        className="size-[38px] rounded-full p-0 hover:bg-transparent"
      >
        <Avatar className="size-[38px]">
          {profile.profile_photo_url && <AvatarImage src={profile.profile_photo_url} alt={profile.name} />}
          <AvatarFallback className="bg-[linear-gradient(135deg,#4A2A63,#E4715A)] text-sm font-extrabold text-white">
            {initial}
          </AvatarFallback>
        </Avatar>
      </Button>
    </div>
  );
}
