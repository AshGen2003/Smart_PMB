import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        pi.purchase_id,
        pi.purchase_number,
        pi.purchase_date,
        pi.grade,
        pi.quantity::float,
        pi.unit_price::float,
        pi.total_price::float,
        pi.moisture_level::float,
        pi.quality_check,
        pi.payment_status::text,
        pi.status::text,
        f.name AS farmer_name,
        w.name AS warehouse_name,
        pt.type_name AS paddy_type
      FROM purchase_intakes pi
      LEFT JOIN farmers f ON pi.farmer_id = f.farmer_id
      LEFT JOIN warehouses w ON pi.warehouse_id = w.warehouse_id
      LEFT JOIN paddy_types pt ON pi.paddy_type_id = pt.paddy_type_id
      ORDER BY pi.purchase_date DESC
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
    const { purchase_number, paddy_type_id, grade, quantity, unit_price, moisture_level, quality_check, warehouse_id } = body;
    const total_price = parseFloat(quantity) * parseFloat(unit_price);

    await pool.query(`
      INSERT INTO purchase_intakes 
        (purchase_number, paddy_type_id, grade, quantity, unit_price, total_price, 
         moisture_level, quality_check, warehouse_id, status, payment_status, 
         payment_method, purchase_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 
        'pending'::purchase_status, 
        'pending'::payment_status, 
        'cash'::payment_method, 
        NOW())
    `, [purchase_number, paddy_type_id, grade, quantity, unit_price, total_price, moisture_level, quality_check, warehouse_id]);

    return NextResponse.json({ message: "Purchase added successfully" });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}