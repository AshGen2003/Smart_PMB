import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        paddy_type_id, type_name, variety,
        description, guaranteed_price, is_active
      FROM paddy_types
      ORDER BY paddy_type_id ASC
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
    const { type_name, variety, description, guaranteed_price } = body;

    const result = await pool.query(`
      INSERT INTO paddy_types (type_name, variety, description, guaranteed_price, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `, [type_name, variety, description, guaranteed_price]);

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}