"use client";

import Image from "next/image";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { profileButtonClass } from "@/features/account/profile-fields";
import { useUpdateProfile } from "@/features/account/use-update-profile";
import type { AuthUser } from "@/features/auth/auth-service";
import {
  AVATAR_ACCEPTED_TYPES,
  AVATAR_MAX_BYTES,
  imageToAvatarDataUrl,
} from "@/utils/avatar-image";

function getInitials({ firstName, lastName }: AuthUser) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function PhotoSection({ user }: { user: AuthUser }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending } = useUpdateProfile();

  async function handleFile(file: File) {
    if (!AVATAR_ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error("That image is too large. Please choose one under 5 MB.");
      return;
    }

    let avatar: string;
    try {
      avatar = await imageToAvatarDataUrl(file);
    } catch {
      toast.error("We couldn't read that image. Please try another one.");
      return;
    }

    mutate(
      { avatar },
      {
        onSuccess: () => toast.success("Profile photo updated"),
        onError: () =>
          toast.error("Couldn't update your photo. Please try again."),
      },
    );
  }

  function removePhoto() {
    mutate(
      { avatar: null },
      {
        onSuccess: () => toast.success("Profile photo removed"),
        onError: () =>
          toast.error("Couldn't remove your photo. Please try again."),
      },
    );
  }

  return (
    <section aria-labelledby="profile-photo-title">
      <h2 id="profile-photo-title" className="text-sm font-semibold">
        Photo Profile
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        {user.avatar ? (
          <Image
            src={user.avatar}
            alt={`${user.firstName} ${user.lastName}`}
            width={72}
            height={72}
            unoptimized
            className="size-[clamp(2.5rem,8.4dvh,4.5rem)] rounded-full object-cover"
          />
        ) : (
          <span
            role="img"
            aria-label={`${user.firstName} ${user.lastName}`}
            className="flex size-[clamp(2.5rem,8.4dvh,4.5rem)] items-center justify-center rounded-full bg-panel font-heading text-xl text-accent"
          >
            {getInitials(user)}
          </span>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ACCEPTED_TYPES.join(",")}
          aria-label="Upload a profile picture"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFile(file);
          }}
        />
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
            className={`${profileButtonClass} rounded-md border-blue-600 px-4 text-sm font-medium text-blue-600 hover:bg-blue-50`}
          >
            Upload new picture
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending || !user.avatar}
            onClick={removePhoto}
            className={`${profileButtonClass} rounded-md border-0 bg-black/[0.06] px-4 text-sm font-medium hover:bg-black/10`}
          >
            Delete
          </Button>
        </div>
      </div>
    </section>
  );
}
