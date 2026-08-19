export interface PresignedUrlResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export async function getPresignedUploadUrl(fileType: string, memberId: string): Promise<PresignedUrlResult> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME || "agrawal-member-photos";
  const cdnDomain = process.env.NEXT_PUBLIC_CDN_DOMAIN || "https://photos.agrawal-directory.org";
  
  const key = `profiles/${memberId}-${Date.now()}.webp`;

  if (!accountId) {
    // Development local path simulation
    return {
      uploadUrl: `/api/upload-mock?key=${key}`,
      publicUrl: `/images/demo-avatar.png`,
      key,
    };
  }

  // In production with R2 credentials, generates signed AWS S3/R2 PUT URL
  return {
    uploadUrl: `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}?signed=demo`,
    publicUrl: `${cdnDomain}/${key}`,
    key,
  };
}