import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export async function testLogin(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { success: false, error: "User not found" };
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    return { success: false, error: "Invalid password" };
  }

  return { success: true };
}

export async function testRegistration(email: string, password: string, name: string) {
  if (!email || !password || !name) {
    return { success: false, error: "All fields are required" };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { success: false, error: "User already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  return { success: true, user: newUser };
}

