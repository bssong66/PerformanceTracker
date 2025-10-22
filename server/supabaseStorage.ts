import path from "path";
import { supabaseAdmin } from "./supabase";

const DEFAULT_BUCKET = process.env.SUPABASE_BUCKET || "attachments";

export async function uploadFileToSupabase(options: {
  bucket?: string;
  filePath: string;
  contentType: string;
  data: Buffer | ArrayBuffer;
}) {
  const bucket = options.bucket || DEFAULT_BUCKET;
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(options.filePath, options.data, {
      contentType: options.contentType,
      upsert: false,
    });
  if (error) {
    throw error;
  }
  return { bucket, path: data.path, fullPath: `${bucket}/${data.path}` };
}

export function buildProjectFilePath(params: {
  userId: string;
  projectId: number;
  originalFileName: string;
}) {
  const safeName = path.basename(params.originalFileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `projects/${params.projectId}/${params.userId}/${y}/${m}/${d}/${Date.now()}-${safeName}`;
}



