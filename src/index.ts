import { IDriver, IDriverDatabase, IDriverStatement } from 'zendb';
import Database from 'better-sqlite3';
import { rmSync, renameSync } from 'node:fs';

export type IDriverOptions = {
  readonly databasePath: string;
  readonly migrationDatabasePath: string;
};

export class Driver implements IDriver<DriverDatabase> {
  public readonly options: IDriverOptions;

  constructor(options: IDriverOptions) {
    this.options = options;
  }

  openMain(): DriverDatabase {
    return new DriverDatabase(new Database(this.options.databasePath));
  }

  openMigration(): DriverDatabase {
    return new DriverDatabase(new Database(this.options.migrationDatabasePath));
  }

  removeMain(): void {
    try {
      rmSync(this.options.databasePath);
    } catch (error) {
      return;
    }
  }

  removeMigration(): void {
    try {
      rmSync(this.options.migrationDatabasePath);
    } catch (error) {
      return;
    }
  }

  applyMigration(): void {
    renameSync(this.options.migrationDatabasePath, this.options.databasePath);
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

  all(...params: any[]): any[] {
    return this.statement.all(...params);
  }

  bind(...params: any[]): this {
    this.statement.bind(...params);
    return this;
  }

  free() {
    // Do nothing (not needed with better-sqlite3)
    return;
  }
}
