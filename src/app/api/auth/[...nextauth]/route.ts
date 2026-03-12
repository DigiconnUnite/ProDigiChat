import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }, 
        });

        if (!user) {
          throw new Error("User not found");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValidPassword) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      async profile(profile) {
        // DEBUG: Log Google profile info
        console.log('[DEBUG] Google OAuth profile:', profile)
        
        // Check if user already exists in our database
        let user = await prisma.user.findUnique({
          where: { email: profile.email }
        })
        
        // If user doesn't exist, create them
        if (!user) {
          const hashedPassword = await bcrypt.hash('google-oauth-' + Date.now(), 12)
          user = await prisma.user.create({
            data: {
              email: profile.email,
              name: profile.name,
              password: hashedPassword,
              role: 'user',
            }
          })
          console.log('[DEBUG] Created new user from Google OAuth:', user.id)
        } else {
          console.log('[DEBUG] Found existing user from Google OAuth:', user.id)
        }
        
        // Return the database user ID, not the Google ID
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    }),
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      // DEBUG: Log JWT callback
      console.log('[DEBUG] NextAuth jwt callback:', {
        hasUser: !!user,
        userId: user?.id,
        existingTokenSub: token.sub
      })
      
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        console.log('[DEBUG] NextAuth jwt callback - Set token.sub to:', user.id)
      }
      // Fetch user's primary organization and add to token
      if (token.sub) {
        const membership = await prisma.organizationMember.findFirst({
          where: { userId: token.sub, isActive: true },
          include: { organization: true }
        });
        
        if (membership) {
          token.organizationId = membership.organizationId;
          token.organizationName = membership.organization.name;
          token.role = membership.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.name) {
        session.user.name = token.name;
      }
      if (token.email) {
        session.user.email = token.email;
      }
      
      // Fetch user's primary organization
      if (token.sub) {
        const membership = await prisma.organizationMember.findFirst({
          where: { userId: token.sub, isActive: true },
          include: { organization: true }
        });
        
        if (membership) {
          (session.user as any).organizationId = membership.organizationId;
          (session.user as any).organizationName = membership.organization.name;
          (session.user as any).role = membership.role;
        }
      }
      
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export const { auth, signIn, signOut } = handler;