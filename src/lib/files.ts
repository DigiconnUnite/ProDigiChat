import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedBy: string;
  organizationId: string;
  createdAt: Date;
}

export async function getFileMetadata(fileId: string): Promise<FileMetadata | null> {
  try {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    if (!file) {
      return null;
    }

    return {
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      url: file.url,
      uploadedBy: file.uploadedBy,
      organizationId: file.organizationId,
      createdAt: file.createdAt,
    };
  } catch (error) {
    console.error('Error fetching file metadata:', error);
    return null;
  }
}

export async function saveFileMetadata(
  file: {
    filename: string;
    originalname: string;
    size: number;
    mimetype: string;
    url: string;
    key: string;
  },
  request: Request
): Promise<string> {
  try {
    // Get user and organization from token
    const token = await getToken({ req: request as any });
    if (!token?.sub || !token?.organizationId) {
      throw new Error('Unauthorized');
    }

    const savedFile = await prisma.file.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: file.url,
        key: file.key,
        uploadedBy: token.sub,
        organizationId: token.organizationId,
      },
    });

    return savedFile.id;
  } catch (error) {
    console.error('Error saving file metadata:', error);
    throw error;
  }
}
