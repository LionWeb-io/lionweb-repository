import { ServerConfig } from "@lionweb/repository-common";

export const CREATE_DATABASE_SQL: string = `
DROP DATABASE IF EXISTS ${ServerConfig.getInstance().pgDb()} WITH (FORCE);

CREATE DATABASE ${ServerConfig.getInstance().pgDb()}
    WITH
    OWNER = '${ServerConfig.getInstance().pgUser()}'
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

GRANT TEMPORARY, CONNECT ON DATABASE ${ServerConfig.getInstance().pgDb()} TO PUBLIC;

GRANT ALL ON DATABASE ${ServerConfig.getInstance().pgDb()} TO ${ServerConfig.getInstance().pgUser()};
`
