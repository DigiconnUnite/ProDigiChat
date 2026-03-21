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
      // Only fetch organization when user first logs in
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        
        // Fetch org ONLY when user first logs in
        const membership = await prisma.organizationMember.findFirst({
          where: { userId: user.id, isActive: true },
          select: { organizationId: true, role: true, organization: { select: { name: true } } }
        });
        if (membership) {
          token.organizationId = membership.organizationId;
          token.role = membership.role;
          token.organizationName = membership.organization.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // READ FROM TOKEN — do NOT query DB here
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.name) {
        session.user.name = token.name;
      }
      if (token.email) {
        session.user.email = token.email;
      }
      
      // Read from token only - no DB queries
      if (token.organizationId) {
        (session.user as any).organizationId = token.organizationId as string;
      }
      if (token.organizationName) {
        (session.user as any).organizationName = token.organizationName as string;
      }
      if (token.role) {
        (session.user as any).role = token.role as string;
      }
      
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export const { auth, signIn, signOut } = handler;