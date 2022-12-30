import * as zen from 'zendb';
import SqliteDatabase from 'better-sqlite3';

export type IDataBase<Schema extends zen.ISchemaAny> = zen.IDatabase<Schema, 'Result'>;

export const Database = (() => {
  return { create };

  function create<Schema extends zen.ISchemaAny>(schema: Schema, db: SqliteDatabase.Database) {
    return zen.Database.create<Schema, 'Result'>(schema, operationResolver);

    function operationResolver(op: zen.IOperation) {
      if (op.kind === 'CreateTable') {
        db.exec(op.sql);
        return;
      }
      if (op.kind === 'Insert') {
        db.prepare(op.sql).run(...op.params);
        return op.parse();
      }
      if (op.kind === 'Delete') {
        const stmt = db.prepare(op.sql);
        const res = op.params ? stmt.run(op.params) : stmt.run();
        return op.parse({ deleted: res.changes });
      }
      if (op.kind === 'Update') {
        const stmt = db.prepare(op.sql);
        const res = op.params ? stmt.run(op.params) : stmt.run();
        return op.parse({ updated: res.changes });
      }
      if (op.kind === 'Query') {
        const stmt = db.prepare(op.sql);
        const res = op.params ? stmt.all(op.params) : stmt.all();
        return op.parse(res);
      }
      if (op.kind === 'ListTables') {
        const res = db.prepare(op.sql).all();
        return op.parse(res);
      }
      return expectNever(op);
    }
  }

  function expectNever(val: never): never {
    throw new Error(`Unexpected value: ${val}`);
  }
})();
