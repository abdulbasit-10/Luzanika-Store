"use client";

import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { profileButtonClass } from "@/features/account/profile-fields";
import {
  AuthError,
  isSessionEnded,
  removeAvatar,
  uploadAvatar,
  type AuthUser,
} from "@/features/auth/auth-service";
import {
  useHandleSessionExpired,
  useSetUser,
} from "@/features/auth/use-session";
import { AVATAR_ACCEPTED_TYPES, AVATAR_MAX_BYTES } from "@/utils/avatar-image";

function getInitials({ firstName, lastName }: AuthUser) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

const photoClass =
  "size-[clamp(2.5rem,8.4dvh,4.5rem)] rounded-full object-cover";

export function PhotoSection({ user }: { user: AuthUser }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setUser = useSetUser();
  const handleSessionExpired = useHandleSessionExpired();

  const upload = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (updated) => {
      setUser(updated);
      toast.success("Profile photo updated");
    },
    onError: (failure) => {
      if (handleSessionExpired(failure)) return;
      // The server checks the picture itself and says what is wrong with it.
      const detail =
        failure instanceof AuthError ? failure.fields?.photo : undefined;
      toast.error(detail ?? "Couldn't update your photo. Please try again.");
    },
  });

  const remove = useMutation({
    mutationFn: removeAvatar,
    onSuccess: (updated) => {
      setUser(updated);
      toast.success("Profile photo removed");
    },
    onError: (failure) => {
      if (isSessionEnded(failure)) {
        handleSessionExpired(failure);
        return;
      }
      toast.error("Couldn't remove your photo. Please try again.");
    },
  });

  const busy = upload.isPending || remove.isPending;

  function handleFile(file: File) {
    // Quick checks so an obvious mistake does not wait for an upload; the server checks again.
    if (!AVATAR_ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error("That image is too large. Please choose one under 5 MB.");
      return;
    }
    upload.mutate(file);
  }

  return (
    <section aria-labelledby="profile-photo-title">
      <h2 id="profile-photo-title" className="text-sm font-semibold">
        Photo Profile
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        {user.avatarUrl ? (
          // A plain <img>: it is already a 256px WebP made by our server, so Next's image optimiser adds nothing.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={`${user.firstName} ${user.lastName}`}
            width={72}
            height={72}
            className={photoClass}
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
            if (file) handleFile(file);
          }}
        />
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className={`${profileButtonClass} rounded-md border-blue-600 px-4 text-sm font-medium text-blue-600 hover:bg-blue-50`}
          >
            {upload.isPending ? "Uploading…" : "Upload new picture"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || !user.avatarUrl}
            onClick={() => remove.mutate()}
            className={`${profileButtonClass} rounded-md border-0 bg-black/[0.06] px-4 text-sm font-medium hover:bg-black/10`}
          >
            Delete
          </Button>
        </div>
      </div>
    </section>
  );
}
