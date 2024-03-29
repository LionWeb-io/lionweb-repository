import {PGDB, PGUSER} from "./configuration.js";

export const CREATE_DATABASE_SQL: string = `
CREATE DATABASE ${PGDB}
    WITH
    OWNER = '${PGUSER}'
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

GRANT TEMPORARY, CONNECT ON DATABASE ${PGDB} TO PUBLIC;

GRANT ALL ON DATABASE ${PGDB} TO ${PGUSER};
`
