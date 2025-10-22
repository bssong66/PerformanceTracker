import { Response } from "express";
import { supabaseAdmin } from "./supabase";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

type SupabaseObject = {
  bucket: string;
  objectPath: string;
  name: string;
};

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || ""; // e.g. attachments/public,assets
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    return paths;
  }

  getPrivateObjectDir(): string {
    // e.g. attachments/.private
    return process.env.PRIVATE_OBJECT_DIR || `${process.env.SUPABASE_BUCKET || "attachments"}/.private`;
  }

  async searchPublicObject(filePath: string): Promise<SupabaseObject | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseSupabasePath(fullPath);
      const { data, error } = await supabaseAdmin.storage
        .from(bucketName)
        .createSignedUrl(objectName, 60);
      if (!error && data?.signedUrl) {
        return { bucket: bucketName, objectPath: objectName, name: objectName };
      }
    }
    return null;
  }

  async downloadObject(obj: SupabaseObject, res: Response, cacheTtlSec: number = 3600) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(obj.bucket)
        .createSignedUrl(obj.objectPath, 60);
      if (error || !data?.signedUrl) {
        throw error || new Error("Failed to create signed URL");
      }
      res.set({ "Cache-Control": `private, max-age=${cacheTtlSec}` });
      return res.redirect(data.signedUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    // Not supported with Supabase in this flow. Use upload-direct endpoint.
    throw new Error("Presigned upload URL is not supported. Use /upload-direct endpoint.");
  }

  async getObjectEntityFile(objectPath: string): Promise<SupabaseObject> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const entityId = objectPath.replace("/objects/", "");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const full = `${entityDir}${entityId}`; // e.g. attachments/.private/xxx
    const { bucketName, objectName } = parseSupabasePath(full);
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(objectName, 60);
    if (error || !data?.signedUrl) {
      throw new ObjectNotFoundError();
    }
    return { bucket: bucketName, objectPath: objectName, name: objectName };
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith("/objects/")) return rawPath;
    // Convert Supabase public URL to internal object path if possible
    // Expected format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    try {
      const url = new URL(rawPath);
      const idx = url.pathname.indexOf("/object/");
      if (idx >= 0) {
        const after = url.pathname.slice(idx + "/object/".length);
        // remove leading "public/" if present
        const cleaned = after.replace(/^public\//, "");
        // If within private dir, convert to /objects/* form
        const privateDir = this.getPrivateObjectDir();
        const { bucketName, objectName } = parseSupabasePath(cleaned);
        if (cleaned.startsWith(privateDir)) {
          const entityId = objectName.slice(privateDir.split("/").slice(1).join("/").length + 1);
          return `/objects/${entityId}`;
        }
        return cleaned;
      }
    } catch {}
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(rawPath: string, _aclPolicy: any): Promise<string> {
    // Supabase Storage uses bucket policies; per-object custom ACL is not applied here.
    // We just normalize the path and return it.
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: SupabaseObject;
    requestedPermission?: string;
  }): Promise<boolean> {
    // Basic check; detailed ACL is enforced at route-level (ownership checks)
    return Boolean(userId) && (requestedPermission ? requestedPermission === "read" : true);
  }
}

function parseSupabasePath(pathStr: string): { bucketName: string; objectName: string } {
  let p = pathStr;
  if (p.startsWith("/")) p = p.slice(1);
  const parts = p.split("/");
  if (parts.length < 2) throw new Error("Invalid path for Supabase object");
  const bucketName = parts[0];
  const objectName = parts.slice(1).join("/");
  return { bucketName, objectName };
}