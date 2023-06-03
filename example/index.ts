import { schema } from './schema';
import { Database } from '../src';
import { resolve } from 'path';
import { mkdirSync } from 'fs';
import { nanoid } from 'nanoid';
import SqlDatabase from 'better-sqlite3';
import { Expr } from 'zendb';

const DATA_PATH = resolve('example/data');

try {
  mkdirSync(DATA_PATH);
} catch {
  //
}

const zenDb = Database.create(new SqlDatabase(resolve(DATA_PATH, 'database.db')));

const tables = zenDb.exec(Database.listTables());

if (tables.length === 0) {
  console.log('Initializing database...');
  zenDb.execMany(Database.createTables(schema, { strict: true }));
}

const userByMail = zenDb.exec(
  schema.users
    .query()
    .where((c) => Expr.equal(c.email, Expr.external('e.dldc@gmail.com')))
    .select(({ email, name }) => ({ email, name }))
    .all()
);

console.log({ userByMail });

const firstTask = zenDb.exec(
  schema.tasks
    .query()
    .select(({ id, name }) => ({ id, name }))
    .maybeFirst()
);

console.log({ firstTask });

const newTask = zenDb.exec(
  schema.tasks.insert({
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

zenDb.exec(schema.spaces.delete((cols) => Expr.equal(cols.id, Expr.external('')), { limit: 1 }));
zenDb.exec(schema.spaces.deleteOne((cols) => Expr.equal(cols.id, Expr.external(''))));

// const tasksWithUsers = zenDb.exec(
//   schema.tasks
//     .query()
//     .limit(Expr.literal(10))
//     .select(({ id, name, date }) => ({ id, name, date }))
//     .innerJoin(schema.task_user.query(), 'taskUser', cols => Expr.equal(cols.taskUser.taskId, cols.id))
//     .innerJoin(schema.users.query(), 'user', cols => Expr.equal(cols.user.email, cols.taskUser.userEmail))
//     .select(({  }) => ({

//     }))
//     // .joinOne('userEmail', 'users', 'email')
//     // .fields({ email: true, name: true })
//     // .all()
// );

// console.log({ tasksWithUsers });

// zenDb.exec(zenDb.tables.tasks.delete({ id: 'yolo' }));
