import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        o.pmb_officer_id,
        o.employee_no,
        o.name,
        o.nic,
        o.designation,
        o.location,
        o.contact_number,
        o.email,
        o.joined_date,
        o.status,
        d.district_name AS district,
        p.province_name AS province
      FROM pmb_officers o
      LEFT JOIN districts d ON o.district_id = d.district_id
      LEFT JOIN provinces p ON o.province_id = p.province_id
      ORDER BY o.pmb_officer_id ASC
    `);
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, employee_no, nic, designation, location, contact_number, email, password } = body;

    // Create user first
    const userResult = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, created_at)
      VALUES ($1, $2, $3, 'pmb_officer', NOW())
      RETURNING user_id
    `, [name, email, password || "pmb1234"]);

    const user_id = userResult.rows[0].user_id;

    const result = await pool.query(`
      INSERT INTO pmb_officers 
        (user_id, name, employee_no, nic, designation, location, contact_number, email, status)
      VALUES ($1, $2, $3, $4, $5::officer_designation, $6, $7, $8, 'active'::officer_status)
      RETURNING *
    `, [user_id, name, employee_no, nic, designation, location, contact_number, email]);

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}