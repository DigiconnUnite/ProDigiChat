import { NextResponse } from "next/server";
import { Server } from "socket.io";

const io = new Server({
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

export async function GET() {
  return NextResponse.json({ message: "Hello, world!" });
}

export { io };