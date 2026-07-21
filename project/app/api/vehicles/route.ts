import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        vehicle_id,
        registration_no,
        vehicle_type,
        capacity,
        status::text
      FROM vehicles
      ORDER BY vehicle_id ASC
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
    const { registration_no, vehicle_type, capacity } = body;

    await pool.query(`
      INSERT INTO vehicles (registration_no, vehicle_type, capacity, status)
      VALUES ($1, $2, $3, 'active'::vehicle_status)
    `, [registration_no, vehicle_type, capacity]);

    return NextResponse.json({ message: "Vehicle added successfully" });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}