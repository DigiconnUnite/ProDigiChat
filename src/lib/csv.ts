// CSV processing for contacts
import csv from "csv-parser";
import fs from "fs";
import { prisma } from "@/lib/prisma";

export async function processCSV(filePath: string): Promise<Record<string, any>[]> {
  const contacts: Record<string, any>[] = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data: Record<string, any>) => contacts.push(data))
      .on("end", () => resolve(contacts))
      .on("error", (err) => reject(err));
  });
}

export async function storeContacts(contacts: Record<string, any>[]) {
  for (const contact of contacts) {
    try {
      await validateContact(contact);
      await saveContactToDatabase(contact);
      console.log(`Contact saved successfully: ${contact.name}`);
    } catch (error) {
      console.error(`Error processing contact ${contact.name}:`, error);
      throw error;
    }
  }
}

async function validateContact(contact: any) {
  if (!contact.phone || !contact.firstName) {
    throw new Error("Contact must have a first name and phone number");
  }
  // Add more validation as needed
}

async function saveContactToDatabase(contact: any) {
  // Split name into firstName and lastName if it's a full name
  const nameParts = (contact.name || contact.firstName || '').split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
  
  await prisma.contact.create({
    data: {
      firstName: firstName,
      lastName: lastName,
      phoneNumber: contact.phone,
      email: contact.email || null,
      tags: '[]',
      attributes: '{}',
    },
  });
}