"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import {
  DetailCard,
  FormError,
  inputClass,
  secondaryButton,
} from "@/features/admin-shell/admin-ui";

import {
  removeImage,
  reorderImages,
  updateImage,
  uploadImage,
  type Product,
  type ProductImage,
} from "./admin-products-service";
import { useProductMutation } from "./product-mutation";

const MAX_PHOTOS = 5;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

function PhotoTile({
  product,
  image,
  index,
  canEdit,
}: {
  product: Product;
  image: ProductImage;
  index: number;
  canEdit: boolean;
}) {
  const [alt, setAlt] = useState(image.alt);
  const [confirming, setConfirming] = useState(false);
  const last = product.images.length - 1;

  const move = useProductMutation(
    product.id,
    (to: number) => {
      const ids = product.images.map((item) => item.id);
      ids.splice(index, 1);
      ids.splice(to, 0, image.id);
      return reorderImages(product.id, ids);
    },
    "Photo order saved",
  );
  const saveAlt = useProductMutation(
    product.id,
    () => updateImage(product.id, image.id, { alt: alt.trim() }),
    "Description saved",
  );
  const remove = useProductMutation(
    product.id,
    () => removeImage(product.id, image.id),
    "Photo removed",
    () => setConfirming(false),
  );

  const iconButton =
    "flex size-8 items-center justify-center rounded-lg border border-border bg-white text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40";

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-white p-2">
      <div className="relative aspect-square overflow-hidden rounded-md bg-background">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          unoptimized
          sizes="160px"
          className="object-cover"
          style={
            image.position ? { objectPosition: image.position } : undefined
          }
        />
        {index === 0 ? (
          <span className="absolute top-1.5 left-1.5 rounded-md bg-foreground px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white">
            Main photo
          </span>
        ) : null}
      </div>
      <input
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        onBlur={() => {
          if (canEdit && alt.trim() && alt.trim() !== image.alt) {
            saveAlt.mutate(undefined);
          }
        }}
        maxLength={200}
        disabled={!canEdit}
        aria-label={`Description of photo ${index + 1}`}
        className={`${inputClass} h-8 text-xs`}
      />
      {canEdit ? (
        <div className="flex items-center justify-between gap-1">
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Move photo earlier"
              disabled={index === 0 || move.isPending}
              onClick={() => move.mutate(index - 1)}
              className={iconButton}
            >
              <ArrowLeft aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Move photo later"
              disabled={index === last || move.isPending}
              onClick={() => move.mutate(index + 1)}
              className={iconButton}
            >
              <ArrowRight aria-hidden className="size-4" />
            </button>
          </div>
          <button
            type="button"
            aria-label="Remove photo"
            onClick={() => setConfirming(true)}
            className={`${iconButton} text-danger`}
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        </div>
      ) : null}
      <FormError error={move.error ?? saveAlt.error} />
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => remove.mutate(undefined)}
        title="Remove this photo?"
        description="It disappears from the product page at once. An uploaded file is deleted."
        confirmLabel="Remove photo"
        pendingLabel="Removing…"
        pending={remove.isPending}
      >
        <FormError error={remove.error} />
      </ConfirmDialog>
    </li>
  );
}

/** One main photo and four more (five at most). The first one is the main photo the shop shows in lists. */
export function ProductPhotosCard({
  product,
  canEdit,
}: {
  product: Product;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      let latest: Product | null = null;
      for (const file of files) latest = await uploadImage(product.id, file);
      return latest;
    },
    onSuccess: async (latest, files) => {
      if (latest)
        queryClient.setQueryData(["admin", "product", product.id], latest);
      toast.success(
        files.length === 1 ? "Photo added" : `${files.length} photos added`,
      );
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: async () => {
      // Some of the files may have gone up before one failed.
      await queryClient.invalidateQueries({
        queryKey: ["admin", "product", product.id],
      });
    },
  });

  const room = MAX_PHOTOS - product.images.length;

  function pick(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;
    if (files.length > room) {
      toast.error(
        `There is room for ${room} more photo${room === 1 ? "" : "s"}.`,
      );
      return;
    }
    const tooBig = files.find((file) => file.size > MAX_BYTES);
    if (tooBig) {
      toast.error(`${tooBig.name} is over 8 MB.`);
      return;
    }
    upload.mutate(files);
  }

  return (
    <DetailCard
      title={`Photos (${product.images.length}/${MAX_PHOTOS})`}
      action={
        canEdit ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(event) => pick(event.target.files)}
            />
            <button
              type="button"
              disabled={upload.isPending || room === 0}
              onClick={() => inputRef.current?.click()}
              className={secondaryButton}
            >
              <ImagePlus aria-hidden className="size-4" />
              {upload.isPending ? "Uploading…" : "Add photos"}
            </button>
          </>
        ) : null
      }
    >
      {product.images.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No photos yet. JPG, PNG or WebP up to 8 MB each; they are resized for
          the shop.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {product.images.map((image, index) => (
            <PhotoTile
              key={image.id}
              product={product}
              image={image}
              index={index}
              canEdit={canEdit}
            />
          ))}
        </ul>
      )}
      <FormError error={upload.error} />
    </DetailCard>
  );
}
