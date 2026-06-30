import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";
import { usernameToEmail } from "@/lib/auth";

export const runtime = "nodejs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      username?: string;
      name?: string;
      email?: string;
      password?: string;
    };
    const password = body.password || "";
    if (password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters." },
        { status: 400 },
      );
    }

    // Two shapes, both supported:
    //  - BETA (simple): { username, password } -> stable internal email, no
    //    real email needed. This is the dead-simple flow testers use.
    //  - LAUNCH (marketing): { name, email, password } -> real email + name.
    let loginEmail: string;
    let userMeta: Record<string, string>;
    let takenMsg: string;

    if (body.username) {
      const username = body.username.trim();
      if (username.length < 3) {
        return NextResponse.json(
          { error: "Username must be at least 3 characters." },
          { status: 400 },
        );
      }
      loginEmail = usernameToEmail(username);
      userMeta = { username };
      takenMsg = "That username is already taken.";
    } else {
      const name = (body.name || "").trim();
      const email = (body.email || "").trim().toLowerCase();
      if (name.length < 1) {
        return NextResponse.json(
          { error: "Please enter your name." },
          { status: 400 },
        );
      }
      if (!EMAIL_RE.test(email)) {
        return NextResponse.json(
          { error: "Please enter a valid email address." },
          { status: 400 },
        );
      }
      loginEmail = email;
      userMeta = { name, full_name: name };
      takenMsg = "That email is already registered. Try signing in.";
    }

    const admin = getAdmin();
    const { error } = await admin.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true, // skip verification email, no friction
      user_metadata: userMeta,
    });

    if (error) {
      const taken = /already|registered|exists/i.test(error.message);
      return NextResponse.json(
        { error: taken ? takenMsg : "Couldn't create the account." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[signup] error:", err);
    return NextResponse.json(
      { error: "Something went wrong creating your account." },
      { status: 500 },
    );
  }
}
