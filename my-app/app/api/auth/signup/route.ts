import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, employee_no, nic, designation, contact_number, location } = body;

    // Check if email already exists
    const existing = await pool.query(
      `SELECT email FROM pmb_officers WHERE email = $1`, [email]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    // Create user first
    const userResult = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, created_at)
      VALUES ($1, $2, $3, 'pmb_officer', NOW())
      RETURNING user_id
    `, [name, email, password]);

    const user_id = userResult.rows[0].user_id;

    // Create PMB Officer
    const officerResult = await pool.query(`
      INSERT INTO pmb_officers 
        (user_id, name, email, employee_no, nic, designation, contact_number, location, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING pmb_officer_id, name, email, employee_no, designation, status
    `, [user_id, name, email, employee_no, nic, designation, contact_number, location]);

    return NextResponse.json(officerResult.rows[0]);

  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}