import { NextResponse } from "next/server";

// Minimal liveness check; proves the app/api boundary and deployment wiring work end to end.
export function GET() {
  return NextResponse.json({ status: "ok" });
}
