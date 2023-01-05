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

const tables = zenDb.exec(Database.listTables());

if (tables.length === 0) {
  console.log('Initializing database...');
  zenDb.execMany(zenDb.init());
}

const userByMail = zenDb.exec(
  zenDb.tables.users
    .select()
    .filter({ email: 'e.dldc@gmail.com' })
    .fields({ email: true, name: true })
    .all()
);

console.log({ userByMail });

const firstTask = zenDb.exec(
  zenDb.tables.tasks.select().fields({ id: true, name: true }).maybeFirst()
);

console.log({ firstTask });

const newTask = zenDb.exec(
  zenDb.tables.tasks.insert({
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
  })
);

console.log({ newTask });

zenDb.exec(zenDb.tables.spaces.delete({ id: '' }, { limit: 1 }));
zenDb.exec(zenDb.tables.spaces.deleteOne({ id: '' }));

const tasksWithUsers = zenDb.exec(
  zenDb.tables.tasks
    .select()
    .take(10)
    .fields({ id: true, name: true, date: true })
    .join('id', 'task_user', 'taskId')
    .joinOne('userEmail', 'users', 'email')
    .fields({ email: true, name: true })
    .all()
);

console.log({ tasksWithUsers });

zenDb.exec(zenDb.tables.tasks.delete({ id: 'yolo' }));
