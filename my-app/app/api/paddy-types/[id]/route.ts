import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { type_name, variety, description, guaranteed_price, is_active } = body;
    const { id } = params;

    const result = await pool.query(`
      UPDATE paddy_types 
      SET type_name = $1, variety = $2, description = $3, 
          guaranteed_price = $4, is_active = $5
      WHERE paddy_type_id = $6
      RETURNING *
    `, [type_name, variety, description, guaranteed_price, is_active, id]);

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await pool.query(`DELETE FROM paddy_types WHERE paddy_type_id = $1`, [id]);
    return NextResponse.json({ message: "Paddy type deleted successfully" });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}