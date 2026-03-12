/**
 * WhatsApp Disconnect API
 * 
 * Disconnects the WhatsApp Business Account from the organization.
 * Removes all stored credentials and phone numbers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, accountId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // If accountId is provided, delete specific account
    if (accountId) {
      // Delete phone numbers linked to this credential
      await prisma.whatsAppPhoneNumber.deleteMany({
        where: { credentialId: accountId }
      });

      // Delete the credential
      await prisma.whatsAppCredential.deleteMany({
        where: { id: accountId, organizationId }
      });
    } else {
      // Delete all phone numbers for this organization
      const credentials = await prisma.whatsAppCredential.findMany({
        where: { organizationId },
        select: { id: true }
      });
      
      for (const cred of credentials) {
        await prisma.whatsAppPhoneNumber.deleteMany({
          where: { credentialId: cred.id }
        });
      }

      // Delete all credentials
      await prisma.whatsAppCredential.deleteMany({
        where: { organizationId }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'WhatsApp account disconnected successfully' 
    });
  } catch (error: any) {
    console.error('Error disconnecting WhatsApp account:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect WhatsApp account' },
      { status: 500 }
    );
  }
}
