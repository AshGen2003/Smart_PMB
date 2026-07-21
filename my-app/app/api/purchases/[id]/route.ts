import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { status } = await request.json();
    const { id } = params;

    await pool.query(`
      UPDATE purchase_intakes 
      SET status = $1::purchase_status
      WHERE purchase_id = $2
    `, [status, id]);

    return NextResponse.json({ message: "Status updated successfully" });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await pool.query(`DELETE FROM purchase_intakes WHERE purchase_id = $1`, [id]);
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}