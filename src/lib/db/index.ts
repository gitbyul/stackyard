import "server-only";

import { createDb, type Db } from "./client";

// One client per process, reused across dev hot reloads (PGlite holds a file
// lock). Created lazily so build workers that never query don't open it.
const globalForDb = globalThis as unknown as { __stackyardDb?: Db };

function getDb(): Db {
  return (globalForDb.__stackyardDb ??= createDb());
}

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
