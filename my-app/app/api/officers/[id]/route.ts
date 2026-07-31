import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const { name, designation, location, contact_number, email, status } = body;
    const { id } = await params;

    const result = await pool.query(`
      UPDATE pmb_officers 
      SET name = $1, designation = $2::officer_designation, location = $3, 
          contact_number = $4, email = $5, status = $6::officer_status
      WHERE pmb_officer_id = $7
      RETURNING *
    `, [name, designation, location, contact_number, email, status, id]);

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // First delete linked user
    const officer = await pool.query(
      `SELECT user_id FROM pmb_officers WHERE pmb_officer_id = $1`, [id]
    );

    await pool.query(`DELETE FROM pmb_officers WHERE pmb_officer_id = $1`, [id]);

    if (officer.rows[0]?.user_id) {
      await pool.query(`DELETE FROM users WHERE user_id = $1`, [officer.rows[0].user_id]);
    }

    return NextResponse.json({ message: "Officer deleted successfully" });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}