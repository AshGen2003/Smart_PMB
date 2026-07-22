import { Pool } from "pg";

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "smart_pmb",
  password: "pmb1234",
  port: 5432,
});

export { pool };
export default pool;