import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

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
    if (password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters." },
        { status: 400 },
      );
    }

    const admin = getAdmin();
    // Real account: the email is the login identity, and we keep the name so we
    // have a genuine name + email list for marketing later. email_confirm: true
    // skips the verification email, so there's no friction during the beta.
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, full_name: name },
    });

    if (error) {
      const taken = /already|registered|exists/i.test(error.message);
      return NextResponse.json(
        {
          error: taken
            ? "That email is already registered. Try signing in."
            : "Couldn't create the account.",
        },
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
