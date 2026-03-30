import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidations = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    }

    const isPasswordValid = Object.values(passwordValidations).every(Boolean)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Password does not meet requirements" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user, organization, membership, and settings in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "user",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      })

      // Generate unique slug for the organization
      const slug = email.split('@')[0].toLowerCase() + '-' + Date.now()

      // 1. Create the organization (Team)
      const organization = await tx.team.create({
        data: {
          name: name + "'s Organization",
        },
      })

      // 2. Create organization membership (links user to org with owner role)
      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'owner',
          isActive: true,
          acceptedAt: new Date(),
        },
      })

      // 3. Create default organization settings
      await tx.organizationSettings.create({
        data: {
          organizationId: organization.id,
          general: JSON.stringify({
            timezone: 'UTC',
            language: 'en',
            dateFormat: 'YYYY-MM-DD',
            currency: 'USD',
            companyName: name + "'s Organization",
            companyEmail: email,
          }),
          notifications: JSON.stringify({
            email: { enabled: true, frequency: 'instant', events: ['campaign.completed', 'campaign.failed', 'message.failed'] },
            push: { enabled: false, events: [] },
            slack: { enabled: false, webhookUrl: null, events: [] },
          }),
          security: JSON.stringify({}),
          messaging: JSON.stringify({}),
          integrations: JSON.stringify({}),
          whatsapp: JSON.stringify({}),
          compliance: JSON.stringify({}),
          branding: JSON.stringify({}),
        },
      })

      return { user, organization };
    })
    
    const { user, organization } = result;
    console.log('[DEBUG] Created organization:', organization.id, 'for user:', user.id)

    return NextResponse.json({
      message: "Account created successfully",
      user,
      organization: {
        id: organization.id,
        name: organization.name,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
