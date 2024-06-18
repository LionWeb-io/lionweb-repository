export const PGHOST = process.env.PGHOST || "postgres"
export const PGUSER = process.env.PGUSER || "postgres"
export const PGDB = process.env.PGDB ||  "lionweb_test"
export const PGPASSWORD = process.env.PGPASSWORD || "lionweb"
export const PGPORT = parseInt(process.env.PGPORT || "5432", 10)
export const PGROOTCERT = process.env.PGROOTCERT || undefined
