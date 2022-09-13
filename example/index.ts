import * as zen from 'zendb';
import { Driver } from '../src';
import { schema as v001 } from './migrations/001';
import { resolve } from 'path';
import { mkdirSync } from 'fs';
import { nanoid } from 'nanoid';

export * from './migrations/001';

const DATA_PATH = resolve('example/data');

try {
  mkdirSync(DATA_PATH);
} catch {
  //
}

const driver = new Driver();

const migrations = zen.Migrations.create(driver, {
  id: 'init',
  description: 'Initialize the database',
  schema: v001,
});

export type Db = typeof db;

const db = migrations.applySync({
  databasePath: resolve(DATA_PATH, 'database.db'),
  migrationDatabasePath: resolve(DATA_PATH, 'migration-database.db'),
});

const userByMail = db.tables.users
  .query()
  .filter({ email: 'e.dldc@gmail.com' })
  .select({ email: true, name: true })
  .all();

console.log({ userByMail });

const firstTask = db.tables.tasks.query().select({ id: true, name: true }).maybeFirst();

console.log({ firstTask });

const newTask = db.tables.tasks.insert({
  id: nanoid(10),
  chainId: '',
  color: '',
  date: new Date(),
  name: '',
  infos: '',
  priority: 'low',
  repeat: null,
  spaceId: '',
  big: 12n,
});

console.log({ newTask });

db.tables.spaces.delete({ id: '' }, { limit: 1 });
db.tables.spaces.deleteOne({ id: '' });

const tasksWithUsers = db.tables.tasks
  .query()
  .take(10)
  .select({ id: true, name: true, date: true })
  .join('id', 'task_user', 'taskId')
  .joinOne('userEmail', 'users', 'email')
  .select({ email: true, name: true })
  .all();

console.log({ tasksWithUsers });

// tasksWithUsers[0].task_user[0].email;

db.tables.tasks.delete({ id: 'yolo' });
