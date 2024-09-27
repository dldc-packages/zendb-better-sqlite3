import type * as zen from '@dldc/zendb';
import type SqliteDatabase from 'better-sqlite3';

export interface IDatabase {
  exec<Op extends zen.TOperation>(op: Op): zen.TOperationResult<Op>;
  execMany<Op extends zen.TOperation>(ops: Op[]): zen.TOperationResult<Op>[];
  readonly sqlDb: SqliteDatabase.Database;
}

export const BetterSqliteDatabase = (() => {
  return { create };

  function create(sqlDb: SqliteDatabase.Database): IDatabase {
    return {
      exec,
      execMany,
      sqlDb,
    };

    function exec<Op extends zen.TOperation>(op: Op): zen.TOperationResult<Op> {
      if (op.kind === 'CreateTable') {
        sqlDb.exec(op.sql);
        return opResult<zen.TCreateTableOperation>(null);
      }
      if (op.kind === 'DropTable') {
        sqlDb.exec(op.sql);
        return opResult<zen.TDropTableOperation>(null);
      }
      if (op.kind === 'Insert') {
        sqlDb.prepare(op.sql).run(op.params);
        return opResult<zen.TInsertOperation<any>>(op.parse());
      }
      if (op.kind === 'InsertMany') {
        sqlDb.prepare(op.sql).run(op.params);
        return opResult<zen.TInsertOperation<any>>(op.parse());
      }
      if (op.kind === 'Delete') {
        const stmt = sqlDb.prepare(op.sql);
        const res = op.params ? stmt.run(op.params) : stmt.run();
        return opResult<zen.TDeleteOperation>(op.parse({ deleted: res.changes }));
      }
      if (op.kind === 'Update') {
        const stmt = sqlDb.prepare(op.sql);
        const res = op.params ? stmt.run(op.params) : stmt.run();
        return opResult<zen.TUpdateOperation>(op.parse({ updated: res.changes }));
      }
      if (op.kind === 'Query') {
        const stmt = sqlDb.prepare(op.sql);
        const res = op.params ? stmt.all(op.params) : stmt.all();
        return opResult<zen.TQueryOperation<any>>(op.parse(res as Record<string, any>[]));
      }
      if (op.kind === 'ListTables') {
        const res = sqlDb.prepare(op.sql).all();
        return opResult<zen.TListTablesOperation>(op.parse(res as Record<string, any>[]));
      }
      if (op.kind === 'Pragma') {
        const res = sqlDb.prepare(op.sql).all();
        return opResult<zen.TPragmaOperation<any>>(op.parse(res as Record<string, any>[]));
      }
      if (op.kind === 'PragmaSet') {
        sqlDb.prepare(op.sql).run();
        return opResult<zen.TPragmaSetOperation>(null);
      }
      return expectNever(op);
    }

    function opResult<Op extends zen.TOperation>(res: zen.TOperationResult<Op>): zen.TOperationResult<zen.TOperation> {
      return res;
    }

    function execMany<Op extends zen.TOperation>(ops: Op[]): zen.TOperationResult<Op>[] {
      return ops.map((op) => exec(op));
    }
  }

  function expectNever(val: never): never {
    throw new Error(`Unexpected value: ${val as any}`);
  }
})();
