import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { name, code, capacity, current_stock, status, contact_number, location } = body;
    const { id } = params;

    await pool.query(`
      UPDATE warehouses 
      SET name = $1, code = $2, capacity = $3, 
          current_stock = $4, status = $5::warehouse_status, 
          contact_number = $6, location = $7
      WHERE warehouse_id = $8
    `, [name, code, capacity, current_stock, status, contact_number, location || "", id]);

    return NextResponse.json({ message: "Warehouse updated successfully" });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await pool.query(`DELETE FROM warehouses WHERE warehouse_id = $1`, [id]);
    return NextResponse.json({ message: "Warehouse deleted successfully" });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}