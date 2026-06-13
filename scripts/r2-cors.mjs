// One-off: set the R2 bucket CORS policy so the browser can PUT directly via presigned URLs.
// Run: node --env-file=.env scripts/r2-cors.mjs   (add your deployed origin to ORIGINS for prod)
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const bucket = process.env.R2_BUCKET;
if (!accountId || !bucket) throw new Error("R2_ACCOUNT_ID and R2_BUCKET required");

const ORIGINS = [
  ...new Set([process.env.APP_URL, "http://localhost:3000"].filter(Boolean)),
];

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

await client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedMethods: ["PUT", "GET", "HEAD"],
          AllowedOrigins: ORIGINS,
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
console.log("R2 CORS set for:", ORIGINS);
console.log(JSON.stringify(current.CORSRules, null, 2));
