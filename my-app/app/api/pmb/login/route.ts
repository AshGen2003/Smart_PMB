import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const result = await pool.query(`
      SELECT 
        o.pmb_officer_id,
        o.name,
        o.email,
        o.employee_no,
        o.designation,
        o.status::text,
        u.password_hash
      FROM pmb_officers o
      JOIN users u ON o.user_id = u.user_id
      WHERE o.email = $1
    `, [email]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const officer = result.rows[0];

    if (officer.status !== "active") {
      return NextResponse.json({ error: "Your account is not active." }, { status: 403 });
    }

    if (password !== officer.password_hash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    return NextResponse.json({
      pmb_officer_id: officer.pmb_officer_id,
      name: officer.name,
      email: officer.email,
      employee_no: officer.employee_no,
      designation: officer.designation,
      status: officer.status,
    });

  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}