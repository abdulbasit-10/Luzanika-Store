import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import {
  contentTypeForKey,
  isPublicKey,
  isValidStorageKey,
  type FileStorage,
  type StoredFile,
} from "./storage";

export interface CloudinaryOptions {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  /** Folder in the account that holds everything the app uploads. */
  folder: string;
}

/**
 * Keeps files in Cloudinary. Product photos are public (the shop pages load
 * them straight from Cloudinary's CDN); profile photos and payment screenshots
 * use Cloudinary's "authenticated" type, which can only be read with a signed
 * address made here, so they stay private and the app's own routes (which check
 * who is asking) are the only way to see them.
 */
export class CloudinaryStorage implements FileStorage {
  private readonly folder: string;
  private readonly cloudName: string;

  constructor(options: CloudinaryOptions) {
    this.folder = options.folder;
    this.cloudName = options.cloudName;
    // Set on the shared client; CLOUDINARY_URL in the environment is not used.
    cloudinary.config({
      cloud_name: options.cloudName,
      api_key: options.apiKey,
      api_secret: options.apiSecret,
      secure: true,
    });
  }

  /** "products/ab12.webp" -> "<folder>/products/ab12" (Cloudinary names have no extension). */
  private publicId(key: string): string {
    if (!isValidStorageKey(key)) throw new Error("Invalid storage key.");
    return `${this.folder}/${key.slice(0, key.lastIndexOf("."))}`;
  }

  private deliveryType(key: string): "upload" | "authenticated" {
    return isPublicKey(key) ? "upload" : "authenticated";
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    const publicId = this.publicId(key);
    await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          type: this.deliveryType(key),
          resource_type: "image",
          overwrite: true,
          invalidate: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(
              error instanceof Error
                ? error
                : new Error(error?.message ?? "Cloudinary upload failed."),
            );
          } else {
            resolve(result);
          }
        },
      );
      stream.end(bytes);
    });
  }

  async get(key: string): Promise<StoredFile | null> {
    const url = cloudinary.url(this.publicId(key), {
      type: this.deliveryType(key),
      resource_type: "image",
      format: key.slice(key.lastIndexOf(".") + 1),
      secure: true,
      // Private files need a signature; for public ones it is harmless.
      sign_url: !isPublicKey(key),
    });
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Cloudinary answered ${response.status} for a file.`);
    }
    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType: contentTypeForKey(key),
    };
  }

  async delete(key: string): Promise<void> {
    const result = (await cloudinary.uploader.destroy(this.publicId(key), {
      type: this.deliveryType(key),
      resource_type: "image",
      invalidate: true,
    })) as { result?: string };
    // "not found" means it is already gone, which is fine.
    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Cloudinary could not delete a file: ${result.result}`);
    }
  }

  private get publicBase(): string {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/`;
  }

  publicUrl(key: string): string | null {
    if (!isPublicKey(key)) return null;
    return `${this.publicBase}${this.publicId(key)}.${key.slice(key.lastIndexOf(".") + 1)}`;
  }

  keyFromPublicUrl(url: string): string | null {
    // Cloudinary may add a version ("v123/") before the name; ours do not, but accept it.
    const prefix = `${this.publicBase}`;
    if (!url.startsWith(prefix)) return null;
    const rest = url.slice(prefix.length).replace(/^v\d+\//, "");
    if (!rest.startsWith(`${this.folder}/`)) return null;
    const key = rest.slice(this.folder.length + 1);
    return isValidStorageKey(key) && isPublicKey(key) ? key : null;
  }
}
