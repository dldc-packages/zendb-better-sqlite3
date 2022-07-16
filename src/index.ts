import { IDriver, IDriverDatabase, IDriverStatement } from 'zendb';
import Database from 'better-sqlite3';
import { rmSync, renameSync } from 'node:fs';

export class Driver implements IDriver<DriverDatabase> {
  connect(path: string): DriverDatabase {
    return new DriverDatabase(new Database(path));
  }

  remove(path: string): void {
    try {
      rmSync(path);
    } catch (error) {
      return;
    }
  }

  rename(oldPath: string, newPath: string): void {
    renameSync(oldPath, newPath);
  }
}

export class DriverDatabase implements IDriverDatabase<DriverStatement> {
  public readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  prepare(source: string): DriverStatement {
    return new DriverStatement(this.db.prepare(source));
  }

  transaction(fn: () => void): void {
    this.db.transaction(fn);
  }

  exec(source: string): this {
    this.db.exec(source);
    return this;
  }

  close(): void {
    this.db.close();
  }

  getUserVersion(): number {
    return this.db.pragma('user_version', { simple: true });
  }

  setUserVersion(version: number): void {
    this.db.pragma(`user_version = ${version}`, { simple: true });
  }
}

export class DriverStatement implements IDriverStatement {
  public readonly statement: Database.Statement;

  constructor(statement: Database.Statement) {
    this.statement = statement;
  }

  run(...params: any[]): { changes: number } {
    const res = this.statement.run(...params);
    return { changes: res.changes };
  }

  get(...params: any[]) {
    return this.statement.get(...params);
  }

  all(...params: any[]): any[] {
    return this.statement.all(...params);
  }

  bind(...params: any[]): this {
    this.statement.bind(...params);
    return this;
  }

  free() {
    // Do nothing
    return;
  }
}
