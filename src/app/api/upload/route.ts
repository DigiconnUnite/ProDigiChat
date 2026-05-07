import { NextRequest, NextResponse } from "next/server";
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { saveFileMetadata } from '@/lib/files'
import { uploadFileToS3, validateFileForUpload } from '@/lib/s3-upload'

// Note: File validation constants moved to s3-upload.ts

async function validateSession(request: NextRequest) {
  const token = await getToken({ req: request })
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  return null
}

export async function POST(req: NextRequest) {
  const unauthorizedResponse = await validateSession(req)
  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  try {
    const token = await getToken({ req: req })
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string || "media"; // "media" or "csv"

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file using S3 upload validation
    try {
      validateFileForUpload(file, type);
    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : 'Validation failed';
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Upload to S3 with organization context
    const uploadedFile = await uploadFileToS3(file, type, {
      organizationId: token?.organizationId,
      userId: token?.sub,
    });

    // Save file metadata to database
    const fileId = await saveFileMetadata({
      filename: uploadedFile.filename,
      originalname: uploadedFile.originalName,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimeType,
      url: uploadedFile.url,
      key: uploadedFile.key,
    }, req);

    const fileRecord = {
      id: fileId,
      filename: uploadedFile.filename,
      originalName: uploadedFile.originalName,
      mimeType: uploadedFile.mimeType,
      size: uploadedFile.size,
      url: uploadedFile.url,
      key: uploadedFile.key,
    };

    // If CSV, process contacts
    if (type === "csv" && file.type === "text/csv") {
      try {
        // Read file content for CSV processing
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const csvContent = buffer.toString('utf-8');
        const contacts = await processCSVContacts(csvContent, fileRecord.id);

        return NextResponse.json({
          success: true,
          fileId: fileRecord.id,
          fileUrl: fileRecord.url,
          contactsImported: contacts.length,
          message: `Successfully imported ${contacts.length} contacts`
        });
      } catch (csvError) {
        console.error("CSV processing error:", csvError);
        return NextResponse.json({
          success: true,
          fileId: fileRecord.id,
          fileUrl: fileRecord.url,
          message: "File uploaded but CSV processing failed. Please check the file format."
        });
      }
    }

    return NextResponse.json({
      success: true,
      fileId: fileRecord.id,
      fileUrl: fileRecord.url,
      message: "File uploaded successfully to S3"
    });

  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json({
      error: "Failed to upload file to S3"
    }, { status: 500 });
  }
}

// Process CSV contacts
async function processCSVContacts(csvContent: string, fileId: string) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  // Expected headers
  const expectedHeaders = ['name', 'phone', 'email'];
  const headerMap: Record<string, number> = {};

  expectedHeaders.forEach(expected => {
    const index = headers.findIndex(h => h.includes(expected) || h === expected);
    if (index !== -1) headerMap[expected] = index;
  });

  if (!headerMap.phone) {
    throw new Error("CSV must contain a 'phone' column");
  }

  const contacts: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));

    if (values.length < headers.length) continue;

    const contactData: any = {
      phoneNumber: values[headerMap.phone],
      optInStatus: 'pending',
      tags: '[]',
      attributes: '{}',
    };

    if (headerMap.name !== undefined && values[headerMap.name]) {
      const nameParts = values[headerMap.name].split(' ');
      contactData.firstName = nameParts[0];
      contactData.lastName = nameParts.slice(1).join(' ');
    }

    if (headerMap.email !== undefined && values[headerMap.email]) {
      contactData.email = values[headerMap.email];
    }

    // Validate phone number format (basic check)
    if (!/^\+?[\d\s\-\(\)]{10,}$/.test(contactData.phoneNumber)) {
      console.warn(`Invalid phone number format: ${contactData.phoneNumber}`);
      continue;
    }

    try {
      const contact = await prisma.contact.create({
        data: contactData
      });
      contacts.push(contact);
    } catch (error) {
      console.error(`Failed to create contact:`, error);
      // Continue with next contact
    }
  }

  return contacts;
}
