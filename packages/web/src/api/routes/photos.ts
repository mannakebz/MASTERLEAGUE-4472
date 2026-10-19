import { z } from "zod";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { admin } from "../middleware/admin";
import { photo } from "../lib/squad";
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});
export async function photoUrl(key: string) {
  return key
    ? getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }), {
        expiresIn: 3600,
      })
    : "";
}
export const photos = {
  presign: admin
    .input(
      z.object({
        contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        size: z
          .number()
          .int()
          .min(1)
          .max(5 * 1024 * 1024),
      }),
    )
    .handler(async ({ input }) => {
      const extension =
        input.contentType === "image/jpeg"
          ? "jpg"
          : input.contentType === "image/png"
            ? "png"
            : "webp";
      const key = `league-images/${crypto.randomUUID()}.${extension}`;
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          ContentType: input.contentType,
          ContentLength: input.size,
        }),
        { expiresIn: 600 },
      );
      return { key, url };
    }),
  preview: admin
    .input(z.object({ key: photo }))
    .handler(async ({ input }) => ({ url: await photoUrl(input.key) })),
};
