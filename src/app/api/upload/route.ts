import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

// Allowed file types
const ALLOWED_FILE_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  csv: ["text/csv", "application/vnd.ms-excel"],
  document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_DIR = join(process.cwd(), "uploads");

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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string || "media"; // "media" or "csv"

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds the limit of 10MB" }, { status: 400 });
    }

    // Validate file type based on upload type
    const allowedTypes = type === "csv" ? ALLOWED_FILE_TYPES.csv : ALLOWED_FILE_TYPES.image.concat(ALLOWED_FILE_TYPES.document);
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}`
      }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const fileName = `${randomUUID()}.${fileExtension}`;
    const filePath = join(UPLOAD_DIR, fileName);

    // Ensure upload directory exists
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
      console.error("Failed to create upload directory:", error);
    }

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return success response without saving to database (File model not in schema)
    const fileRecord = {
      id: fileName,
      filename: fileName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      path: filePath,
      url: `/uploads/${fileName}`,
    };

    // If CSV, process contacts
    if (type === "csv" && file.type === "text/csv") {
      try {
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
      message: "File uploaded successfully"
    });

  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json({
      error: "Failed to upload file"
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
