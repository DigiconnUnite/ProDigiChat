import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// S3 client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const S3_BUCKET = process.env.AWS_S3_BUCKET || '';
const S3_BASE_URL = process.env.AWS_S3_BASE_URL || `https://${S3_BUCKET}.s3.amazonaws.com`;

// Allowed file types
const ALLOWED_FILE_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  csv: ["text/csv", "application/vnd.ms-excel"],
  document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadOptions {
  organizationId?: string;
  userId?: string;
}

export async function uploadFileToS3(
  file: File,
  type: string = "media",
  options?: UploadOptions
): Promise<{
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  key: string;
}> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds the limit of 10MB");
  }

  // Validate file type based on upload type
  const allowedTypes = type === "csv" 
    ? ALLOWED_FILE_TYPES.csv 
    : ALLOWED_FILE_TYPES.image.concat(ALLOWED_FILE_TYPES.document);
    
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`);
  }

  // Generate unique filename with organization prefix if available
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const orgPrefix = options?.organizationId ? `${options.organizationId}/` : '';
  const fileName = `${orgPrefix}${randomUUID()}.${fileExtension}`;
  const key = fileName;

  // Convert file to buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type,
    Metadata: {
      originalName: file.name,
      uploadedBy: options?.userId || 'unknown',
      organizationId: options?.organizationId || 'unknown',
    },
  });

  try {
    await s3Client.send(command);
    
    const url = `${S3_BASE_URL}/${key}`;
    
    return {
      id: randomUUID(), // Generate a unique ID for the database record
      filename: fileName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url,
      key,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
}

export async function deleteFileFromS3(key: string): Promise<void> {
  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    
    await s3Client.send(command);
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete file from S3');
  }
}

export function getS3Url(key: string): string {
  return `${S3_BASE_URL}/${key}`;
}

export function validateFileForUpload(file: File, type: string = "media"): void {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds the limit of 10MB");
  }

  // Validate file type based on upload type
  const allowedTypes = type === "csv" 
    ? ALLOWED_FILE_TYPES.csv 
    : ALLOWED_FILE_TYPES.image.concat(ALLOWED_FILE_TYPES.document);
    
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`);
  }
}
