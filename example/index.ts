import { schema } from './schema';
import { Database } from '../src';
import { resolve } from 'path';
import { mkdirSync } from 'fs';
import { nanoid } from 'nanoid';
import SqlDatabase from 'better-sqlite3';

const DATA_PATH = resolve('example/data');

try {
  mkdirSync(DATA_PATH);
} catch {
  //
}

const db = new SqlDatabase(resolve(DATA_PATH, 'database.db'));

const zenDb = Database.create(schema, db);

const userByMail = zenDb.tables.users
  .query()
  .filter({ email: 'e.dldc@gmail.com' })
  .select({ email: true, name: true })
  .all();

console.log({ userByMail });

const firstTask = zenDb.tables.tasks.query().select({ id: true, name: true }).maybeFirst();

console.log({ firstTask });

const newTask = zenDb.tables.tasks.insert({
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

zenDb.tables.spaces.delete({ id: '' }, { limit: 1 });
zenDb.tables.spaces.deleteOne({ id: '' });

const tasksWithUsers = zenDb.tables.tasks
  .query()
  .take(10)
  .select({ id: true, name: true, date: true })
  .join('id', 'task_user', 'taskId')
  .joinOne('userEmail', 'users', 'email')
  .select({ email: true, name: true })
  .all();

console.log({ tasksWithUsers });

// tasksWithUsers[0].task_user[0].email;

zenDb.tables.tasks.delete({ id: 'yolo' });
