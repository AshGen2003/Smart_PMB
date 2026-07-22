import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        w.warehouse_id,
        w.name,
        w.code,
        w.capacity::float,
        w.current_stock::float,
        w.status::text,
        w.contact_number,
        w.established_date,
        w.location,
        d.district_name AS district,
        p.province_name AS province
      FROM warehouses w
      LEFT JOIN districts d ON w.district_id = d.district_id
      LEFT JOIN provinces p ON w.province_id = p.province_id
      ORDER BY w.warehouse_id ASC
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
    const { name, code, capacity, current_stock, status, contact_number, established_date, location } = body;

    await pool.query(`
      INSERT INTO warehouses (name, code, capacity, current_stock, status, contact_number, established_date, location)
      VALUES ($1, $2, $3, $4, $5::warehouse_status, $6, $7, $8)
    `, [name, code, capacity, current_stock || 0, status, contact_number, established_date, location || ""]);

    return NextResponse.json({ message: "Warehouse added successfully" });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}