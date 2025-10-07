import { Driver } from '@dldc/zendb';
import BetterSqlite3 from 'better-sqlite3';

export const BetterSqliteDriver: Driver.TDriver<BetterSqlite3.Database> =
  Driver.createDriverFromPrepare<BetterSqlite3.Database>({
    createDatabase: () => new BetterSqlite3(':memory:'),
    closeDatabase: (db) => db.close(),
    exec: (db, sql) => db.exec(sql),
    prepare: (db, sql) => {
      const stmt = db.prepare(sql);
      return {
        run: (params) => {
          const result = params ? stmt.run(params) : stmt.run();
          return result.changes;
        },
        all: (params) => {
          return params ? stmt.all(params) : stmt.all();
        },
      };
    },
  });
