import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { name, license_no, contact_no, address, status } = body;
    const { id } = params;

    await pool.query(`
      UPDATE drivers 
      SET name = $1, license_no = $2, contact_no = $3, address = $4, status = $5::driver_status
      WHERE driver_id = $6
    `, [name, license_no, contact_no, address, status, id]);

    return NextResponse.json({ message: "Driver updated successfully" });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await pool.query(`DELETE FROM drivers WHERE driver_id = $1`, [id]);
    return NextResponse.json({ message: "Driver deleted successfully" });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}