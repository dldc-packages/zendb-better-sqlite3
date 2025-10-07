import { Column, Expr, Migration, queryFrom, Schema, Utils } from '@dldc/zendb';
import BetterSqlite3 from 'better-sqlite3';
import { beforeEach, describe, expect, test } from 'vitest';
import { BetterSqliteDriver } from '../src/mod.js';

// Test schema similar to ZenDb's tasksDb
const tasksDb = Schema.declare({
  tasks: {
    id: Column.text().primary(),
    title: Column.text(),
    description: Column.text(),
    completed: Column.boolean(),
  },
  users: {
    id: Column.text().primary(),
    name: Column.text(),
    email: Column.text(),
    displayName: Column.text().nullable(),
    groupId: Column.text(),
    updatedAt: Column.date().nullable(),
  },
  joinUsersTasks: {
    user_id: Column.text().primary(),
    task_id: Column.text().primary(),
  },
  groups: {
    id: Column.text().primary(),
    name: Column.text(),
  },
});

// All datatypes schema
const allDatatypesDb = Schema.declare({
  datatype: {
    id: Column.text().primary(),
    text: Column.text(),
    integer: Column.integer(),
    boolean: Column.boolean(),
    date: Column.date(),
    json: Column.json<{ foo: string; baz: boolean }>(),
    number: Column.number(),
  },
});

describe('BetterSqliteDriver - Basic Operations', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = new BetterSqlite3(':memory:');
  });

  test('should create database instance', () => {
    expect(db).toBeDefined();
    expect(typeof db.prepare).toBe('function');
  });

  test('should create tables from schema', () => {
    const ops = Schema.createTables(tasksDb.tables, {
      ifNotExists: true,
      strict: true,
    });
    const results = BetterSqliteDriver.execMany(db, ops);

    expect(results).toHaveLength(4);
    expect(results.every((r) => r === null)).toBe(true);

    const tables = BetterSqliteDriver.exec(db, Utils.listTables());
    expect(tables).toEqual(['tasks', 'users', 'joinUsersTasks', 'groups']);
  });

  test('should drop tables', () => {
    BetterSqliteDriver.execMany(db, Schema.createTables(tasksDb.tables));

    const dropOp = tasksDb.tables.tasks.schema.drop({ ifExists: true });
    BetterSqliteDriver.exec(db, dropOp);

    const tables = BetterSqliteDriver.exec(db, Utils.listTables());
    expect(tables).not.toContain('tasks');
  });
});

describe('BetterSqliteDriver - Insert Operations', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = new BetterSqlite3(':memory:');
    BetterSqliteDriver.execMany(db, Schema.createTables(tasksDb.tables));
  });

  test('should insert a single record', () => {
    const insertOp = tasksDb.tables.tasks.insert({
      id: '1',
      title: 'Task 1',
      description: 'First task',
      completed: false,
    });

    const result = BetterSqliteDriver.exec(db, insertOp);

    expect(result).toEqual({
      id: '1',
      title: 'Task 1',
      description: 'First task',
      completed: false,
    });
  });

  test('should insert user with nullable fields', () => {
    const insertOp = tasksDb.tables.users.insert({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      displayName: null,
      groupId: '1',
      updatedAt: new Date('2023-12-24T22:30:12.250Z'),
    });

    const result = BetterSqliteDriver.exec(db, insertOp);

    expect(result).toEqual({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      displayName: null,
      groupId: '1',
      updatedAt: new Date('2023-12-24T22:30:12.250Z'),
    });
  });

  test('should insert multiple records', () => {
    const users = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        displayName: null,
        groupId: '1',
        updatedAt: null,
      },
      {
        id: '2',
        name: 'Jane Doe',
        email: 'jane@example.com',
        displayName: 'Jane',
        groupId: '1',
        updatedAt: null,
      },
    ];

    const insertOp = tasksDb.tables.users.insertMany(users);
    const result = BetterSqliteDriver.exec(db, insertOp);

    expect(result).toEqual(users);
  });

  test('should handle all datatypes', () => {
    BetterSqliteDriver.execMany(db, Schema.createTables(allDatatypesDb.tables));

    const insertOp = allDatatypesDb.tables.datatype.insert({
      id: '1',
      text: 'test',
      integer: 42,
      boolean: true,
      date: new Date(1663075512250),
      json: { foo: 'bar', baz: true },
      number: 3.14,
    });

    const result = BetterSqliteDriver.exec(db, insertOp);

    expect(result).toEqual({
      id: '1',
      text: 'test',
      integer: 42,
      boolean: true,
      date: new Date(1663075512250),
      json: { foo: 'bar', baz: true },
      number: 3.14,
    });
  });
});

describe('BetterSqliteDriver - Query Operations', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = new BetterSqlite3(':memory:');
    BetterSqliteDriver.execMany(db, Schema.createTables(tasksDb.tables));

    // Insert test data
    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.groups.insertMany([
        { id: '1', name: 'Engineering' },
        { id: '2', name: 'Sales' },
      ]),
    );

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.users.insertMany([
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          displayName: null,
          groupId: '1',
          updatedAt: new Date('2023-12-24T22:30:12.250Z'),
        },
        {
          id: '2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          displayName: 'Jane',
          groupId: '1',
          updatedAt: new Date('2023-12-25T22:30:12.250Z'),
        },
      ]),
    );

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.tasks.insertMany([
        { id: '1', title: 'Task 1', description: 'First task', completed: false },
        { id: '2', title: 'Task 2', description: 'Second task', completed: true },
      ]),
    );
  });

  test('should query all records', () => {
    const queryOp = tasksDb.tables.tasks.query().all();
    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 1');
    expect(result[1].title).toBe('Task 2');
  });

  test('should query with select', () => {
    const queryOp = tasksDb.tables.users
      .query()
      .select((c) => ({ id: c.id, name: c.name }))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: '1', name: 'John Doe' });
    expect(result[1]).toEqual({ id: '2', name: 'Jane Doe' });
  });

  test('should query with where clause', () => {
    const queryOp = tasksDb.tables.tasks
      .query()
      .where((c) => Expr.equal(c.completed, Expr.literal(false)))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Task 1');
  });

  test('should query with andFilterEqual', () => {
    const queryOp = tasksDb.tables.users.query().andFilterEqual({ id: '1' }).maybeOne();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toEqual({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      displayName: null,
      groupId: '1',
      updatedAt: new Date('2023-12-24T22:30:12.250Z'),
    });
  });

  test('should return null for maybeOne with no results', () => {
    const queryOp = tasksDb.tables.users.query().andFilterEqual({ id: 'nonexistent' }).maybeOne();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toBeNull();
  });

  test('should query with groupBy', () => {
    const queryOp = tasksDb.tables.users
      .query()
      .groupBy((c) => [c.groupId])
      .select((c) => ({ groupId: c.groupId, count: Expr.Aggregate.count(c.id) }))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ groupId: '1', count: 2 });
  });

  test('should query with limit', () => {
    const queryOp = tasksDb.tables.tasks.query().limit(Expr.external(1)).all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(1);
  });

  test('should query with orderBy (andSortDesc)', () => {
    const queryOp = tasksDb.tables.users
      .query()
      .andSortDesc((c) => c.name)
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result[0].name).toBe('John Doe');
    expect(result[1].name).toBe('Jane Doe');
  });

  test('should query with orderBy (andSortAsc)', () => {
    const queryOp = tasksDb.tables.users
      .query()
      .andSortAsc((c) => c.name)
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result[0].name).toBe('Jane Doe');
    expect(result[1].name).toBe('John Doe');
  });

  test('should query with expressions', () => {
    const queryOp = tasksDb.tables.users
      .query()
      .select((c) => ({ idEmail: Expr.concatenate(c.id, c.email) }))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result[0].idEmail).toBe('1john@example.com');
    expect(result[1].idEmail).toBe('2jane@example.com');
  });
});

describe('BetterSqliteDriver - Update Operations', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = new BetterSqlite3(':memory:');
    BetterSqliteDriver.execMany(db, Schema.createTables(tasksDb.tables));

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.users.insert({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        displayName: null,
        groupId: '1',
        updatedAt: null,
      }),
    );
  });

  test('should update a record', () => {
    const updateOp = tasksDb.tables.users.update({ name: 'Paul Smith' }, (c) => Expr.equal(c.id, Expr.literal('1')));

    const result = BetterSqliteDriver.exec(db, updateOp);
    expect(result).toEqual({ updated: 1 });

    const user = BetterSqliteDriver.exec(db, tasksDb.tables.users.query().andFilterEqual({ id: '1' }).maybeOne());
    expect(user?.name).toBe('Paul Smith');
  });

  test('should update with external parameter', () => {
    const updateOp = tasksDb.tables.users.update({ name: 'Paul Smith' }, (c) => Expr.equal(c.id, Expr.external('1')));

    const result = BetterSqliteDriver.exec(db, updateOp);
    expect(result).toEqual({ updated: 1 });
  });

  test('should updateEqual', () => {
    const updateOp = tasksDb.tables.users.updateEqual({ name: 'Jane Smith' }, { id: '1' });

    const result = BetterSqliteDriver.exec(db, updateOp);
    expect(result).toEqual({ updated: 1 });

    const user = BetterSqliteDriver.exec(db, tasksDb.tables.users.query().andFilterEqual({ id: '1' }).maybeOne());
    expect(user?.name).toBe('Jane Smith');
  });

  test('should update date fields', () => {
    const newDate = new Date('2023-12-25T22:30:12.250Z');
    const updateOp = tasksDb.tables.users.update({ updatedAt: newDate }, (c) => Expr.equal(c.id, Expr.literal('1')));

    const result = BetterSqliteDriver.exec(db, updateOp);
    expect(result).toEqual({ updated: 1 });

    const user = BetterSqliteDriver.exec(db, tasksDb.tables.users.query().andFilterEqual({ id: '1' }).maybeOne());
    expect(user?.updatedAt).toEqual(newDate);
  });
});

describe('BetterSqliteDriver - Delete Operations', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = new BetterSqlite3(':memory:');
    BetterSqliteDriver.execMany(db, Schema.createTables(tasksDb.tables));

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.users.insertMany([
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          displayName: null,
          groupId: '1',
          updatedAt: null,
        },
        {
          id: '2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          displayName: null,
          groupId: '1',
          updatedAt: null,
        },
      ]),
    );
  });

  test('should delete a record with literal', () => {
    const deleteOp = tasksDb.tables.users.delete((c) => Expr.equal(c.id, Expr.literal('1')));

    const result = BetterSqliteDriver.exec(db, deleteOp);
    expect(result).toEqual({ deleted: 1 });

    const users = BetterSqliteDriver.exec(db, tasksDb.tables.users.query().all());
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe('2');
  });

  test('should delete with external parameter', () => {
    const deleteOp = tasksDb.tables.users.delete((c) => Expr.equal(c.id, Expr.external('1')));

    const result = BetterSqliteDriver.exec(db, deleteOp);
    expect(result).toEqual({ deleted: 1 });
  });

  test('should deleteEqual', () => {
    const deleteOp = tasksDb.tables.users.deleteEqual({ id: '1' });

    const result = BetterSqliteDriver.exec(db, deleteOp);
    expect(result).toEqual({ deleted: 1 });

    const users = BetterSqliteDriver.exec(db, tasksDb.tables.users.query().all());
    expect(users).toHaveLength(1);
  });

  test('should delete multiple records', () => {
    const deleteOp = tasksDb.tables.users.delete((c) => Expr.equal(c.groupId, Expr.literal('1')));

    const result = BetterSqliteDriver.exec(db, deleteOp);
    expect(result).toEqual({ deleted: 2 });

    const users = BetterSqliteDriver.exec(db, tasksDb.tables.users.query().all());
    expect(users).toHaveLength(0);
  });
});

describe('BetterSqliteDriver - Join Operations', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = new BetterSqlite3(':memory:');
    BetterSqliteDriver.execMany(db, Schema.createTables(tasksDb.tables));

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.users.insertMany([
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          displayName: null,
          groupId: '1',
          updatedAt: null,
        },
        {
          id: '2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          displayName: null,
          groupId: '1',
          updatedAt: null,
        },
      ]),
    );

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.tasks.insertMany([
        { id: '1', title: 'Task 1', description: 'First task', completed: false },
        { id: '2', title: 'Task 2', description: 'Second task', completed: true },
      ]),
    );

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.joinUsersTasks.insertMany([
        { user_id: '1', task_id: '1' },
        { user_id: '1', task_id: '2' },
        { user_id: '2', task_id: '1' },
      ]),
    );
  });

  test('should perform inner join', () => {
    const queryOp = tasksDb.tables.users
      .query()
      .innerJoin(tasksDb.tables.joinUsersTasks.query(), 'usersTasks', (c) => Expr.equal(c.usersTasks.user_id, c.id))
      .select((c) => ({
        userId: c.id,
        userName: c.name,
        taskId: c.usersTasks.task_id,
      }))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(3);
    expect(result.filter((r) => r.userId === '1')).toHaveLength(2);
    expect(result.filter((r) => r.userId === '2')).toHaveLength(1);
  });

  test('should perform left join', () => {
    const queryOp = tasksDb.tables.tasks
      .query()
      .leftJoin(tasksDb.tables.joinUsersTasks.query(), 'usersTasks', (c) => Expr.equal(c.id, c.usersTasks.task_id))
      .select((c) => ({
        taskId: c.id,
        taskTitle: c.title,
        userId: c.usersTasks.user_id,
      }))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  test('should join multiple tables', () => {
    const queryOp = tasksDb.tables.joinUsersTasks
      .query()
      .innerJoin(tasksDb.tables.tasks.query(), 'task', (c) => Expr.equal(c.task_id, c.task.id))
      .innerJoin(tasksDb.tables.users.query(), 'user', (c) => Expr.equal(c.user_id, c.user.id))
      .select((c) => ({
        userName: c.user.name,
        taskTitle: c.task.title,
      }))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('userName');
    expect(result[0]).toHaveProperty('taskTitle');
  });
});

describe('BetterSqliteDriver - CTE (Common Table Expressions)', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = new BetterSqlite3(':memory:');
    BetterSqliteDriver.execMany(db, Schema.createTables(tasksDb.tables));

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.users.insertMany([
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          displayName: null,
          groupId: '1',
          updatedAt: null,
        },
        {
          id: '2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          displayName: null,
          groupId: '1',
          updatedAt: null,
        },
      ]),
    );
  });

  test('should execute simple CTE query', () => {
    const innerQuery = tasksDb.tables.users
      .query()
      .select((c) => ({ demo: c.id, id: c.id }))
      .groupBy((c) => [c.name])
      .limit(Expr.literal(10));

    const queryOp = queryFrom(innerQuery).all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('demo');
    expect(result[0]).toHaveProperty('id');
  });

  test('should execute CTE with additional operations', () => {
    const innerQuery = tasksDb.tables.users
      .query()
      .select((c) => ({ demo: c.id, id: c.id }))
      .groupBy((c) => [c.name]);

    const queryOp = queryFrom(innerQuery)
      .select((c) => ({ demo2: c.demo, id: c.id }))
      .where((c) => Expr.equal(c.id, Expr.literal('1')))
      .one();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toEqual({ demo2: '1', id: '1' });
  });
});

describe('BetterSqliteDriver - Pragma Operations', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = new BetterSqlite3(':memory:');
  });

  test('should read user_version pragma', () => {
    const result = BetterSqliteDriver.exec(db, Utils.userVersion());
    expect(result).toBe(0);
  });

  test('should set user_version pragma', () => {
    BetterSqliteDriver.exec(db, Utils.setUserVersion(42));

    const version = BetterSqliteDriver.exec(db, Utils.userVersion());
    expect(version).toBe(42);
  });

  test('should list tables', () => {
    BetterSqliteDriver.execMany(db, Schema.createTables(tasksDb.tables));

    const tables = BetterSqliteDriver.exec(db, Utils.listTables());
    expect(tables).toEqual(['tasks', 'users', 'joinUsersTasks', 'groups']);
  });
});

describe('BetterSqliteDriver - JSON Operations', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = new BetterSqlite3(':memory:');
    BetterSqliteDriver.execMany(db, Schema.createTables(tasksDb.tables));

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.tasks.insertMany([
        { id: '1', title: 'Task 1', description: 'First task', completed: false },
        { id: '2', title: 'Task 2', description: 'Second task', completed: true },
      ]),
    );
  });

  test('should create JSON object from columns', () => {
    const queryOp = tasksDb.tables.tasks
      .query()
      .select((c) => ({
        id: c.id,
        data: Expr.jsonObj(c),
      }))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(2);
    expect(typeof result[0].data.completed).toBe('boolean');
    expect(result[0].data).toEqual({
      id: '1',
      title: 'Task 1',
      description: 'First task',
      completed: false,
    });
  });

  test('should create nested JSON objects', () => {
    const queryOp = tasksDb.tables.tasks
      .query()
      .select(({ id, title, description }) => ({
        id,
        data: Expr.jsonObj({
          title,
          description,
          inner: Expr.jsonObj({ title, description }),
        }),
      }))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(2);
    expect(result[0].data).toHaveProperty('inner');
    expect(result[0].data.inner).toHaveProperty('title');
  });
});

describe('BetterSqliteDriver - Migration Operations', () => {
  test('should apply migrations', async () => {
    const migration = Migration.init(BetterSqliteDriver, tasksDb, ({ database, schema }) => {
      // Insert initial data
      BetterSqliteDriver.exec(
        database,
        schema.tables.groups.insertMany([
          { id: 'group1', name: 'Group 1' },
          { id: 'group2', name: 'Group 2' },
        ]),
      );

      BetterSqliteDriver.exec(
        database,
        schema.tables.users.insertMany([
          {
            id: 'user1',
            name: 'User 1',
            email: 'user1@example.com',
            displayName: null,
            groupId: 'group1',
            updatedAt: null,
          },
        ]),
      );

      return Promise.resolve();
    });

    const db = new BetterSqlite3(':memory:');
    const [migratedDb] = await migration.apply(db);

    expect(migratedDb).toBeDefined();

    const version = BetterSqliteDriver.exec(migratedDb, Utils.userVersion());
    expect(version).toBe(1);

    const groups = BetterSqliteDriver.exec(migratedDb, tasksDb.tables.groups.query().all());
    expect(groups).toHaveLength(2);

    const users = BetterSqliteDriver.exec(migratedDb, tasksDb.tables.users.query().all());
    expect(users).toHaveLength(1);
  });

  test('should apply migration steps', async () => {
    const migration = Migration.init(
      BetterSqliteDriver,
      Schema.declare({
        users: {
          id: Column.text().primary(),
          name: Column.text(),
          email: Column.text(),
        },
      }),
      () => Promise.resolve(),
    ).step((schema) =>
      Schema.declare({
        ...schema.definition,
        users: {
          ...schema.tables.users.definition,
          archived: Column.boolean(),
        },
      }),
    )(({ copyTable }) => {
      copyTable('users', 'users', (user) => ({
        ...user,
        archived: false,
      }));
      return Promise.resolve();
    });

    const db = new BetterSqlite3(':memory:');
    const [migratedDb] = await migration.apply(db);

    const version = BetterSqliteDriver.exec(migratedDb, Utils.userVersion());
    expect(version).toBe(2);
  });

  test('should be idempotent', async () => {
    const migration = Migration.init(BetterSqliteDriver, tasksDb, ({ database, schema }) => {
      BetterSqliteDriver.exec(database, schema.tables.groups.insert({ id: 'group1', name: 'Group 1' }));
      return Promise.resolve();
    });

    const db = new BetterSqlite3(':memory:');

    // Apply first time
    const [db1] = await migration.apply(db);
    const version1 = BetterSqliteDriver.exec(db1, Utils.userVersion());
    expect(version1).toBe(1);

    // Apply second time (should be idempotent)
    const [db2] = await migration.apply(db1);
    const version2 = BetterSqliteDriver.exec(db2, Utils.userVersion());
    expect(version2).toBe(1);

    const groups = BetterSqliteDriver.exec(db2, tasksDb.tables.groups.query().all());
    expect(groups).toHaveLength(1);
  });
});

describe('BetterSqliteDriver - Advanced Queries', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = new BetterSqlite3(':memory:');
    BetterSqliteDriver.execMany(db, Schema.createTables(tasksDb.tables));

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.groups.insertMany([
        { id: '1', name: 'Engineering' },
        { id: '2', name: 'Sales' },
      ]),
    );

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.users.insertMany([
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          displayName: null,
          groupId: '1',
          updatedAt: new Date('2023-12-24T22:30:12.250Z'),
        },
        {
          id: '2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          displayName: 'Jane',
          groupId: '1',
          updatedAt: new Date('2023-12-25T22:30:12.250Z'),
        },
        {
          id: '3',
          name: 'Jack Doe',
          email: 'jack@example.com',
          displayName: null,
          groupId: '2',
          updatedAt: null,
        },
      ]),
    );

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.tasks.insertMany([
        { id: '1', title: 'Task 1', description: 'First task', completed: false },
        { id: '2', title: 'Task 2', description: 'Second task', completed: true },
        { id: '3', title: 'Task 3', description: 'Third task', completed: false },
      ]),
    );

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.joinUsersTasks.insertMany([
        { user_id: '1', task_id: '1' },
        { user_id: '1', task_id: '2' },
        { user_id: '2', task_id: '1' },
      ]),
    );
  });

  test('should find users with no tasks using subquery', () => {
    const usersWithTasks = tasksDb.tables.joinUsersTasks
      .query()
      .groupBy((c) => [c.user_id])
      .select((c) => ({ id: c.user_id }));

    const usersWithNoTasks = tasksDb.tables.users
      .query()
      .where((c) => Expr.notInSubquery(c.id, usersWithTasks))
      .all();

    const result = BetterSqliteDriver.exec(db, usersWithNoTasks);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  test('should use OR expressions', () => {
    const queryOp = tasksDb.tables.users
      .query()
      .where((c) => Expr.or(Expr.equal(c.id, Expr.literal('1')), Expr.equal(c.id, Expr.literal('2'))))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(2);
  });

  test('should use AND expressions', () => {
    const queryOp = tasksDb.tables.users
      .query()
      .where((c) => Expr.and(Expr.equal(c.groupId, Expr.literal('1')), Expr.isNull(c.displayName)))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  test('should use aggregate functions', () => {
    const queryOp = tasksDb.tables.users
      .query()
      .groupBy((c) => [c.groupId])
      .select((c) => ({
        groupId: c.groupId,
        count: Expr.Aggregate.count(c.id),
        countStar: Expr.Aggregate.countStar(),
      }))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(2);
    expect(result[0].count).toBeGreaterThan(0);
    expect(result[0].countStar).toBeGreaterThan(0);
  });

  test('should handle comparison operators', () => {
    const queryOp = tasksDb.tables.users
      .query()
      .where((c) => Expr.greaterThan(c.updatedAt, Expr.literal(new Date('2023-12-24T23:00:00.000Z').getTime())))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  test('should handle NOT expression', () => {
    const queryOp = tasksDb.tables.tasks
      .query()
      .where((c) => Expr.not(Expr.equal(c.completed, Expr.literal(true))))
      .all();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result).toHaveLength(2);
    expect(result.every((t) => !t.completed)).toBe(true);
  });
});

describe('BetterSqliteDriver - External Parameters', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = new BetterSqlite3(':memory:');
    BetterSqliteDriver.execMany(db, Schema.createTables(tasksDb.tables));

    BetterSqliteDriver.exec(
      db,
      tasksDb.tables.tasks.insertMany([
        { id: '1', title: 'Task 1', description: 'First task', completed: false },
        { id: '2', title: 'Task 2', description: 'Second task', completed: true },
      ]),
    );
  });

  test('should use external parameters in query', () => {
    const queryOp = tasksDb.tables.tasks
      .query()
      .where((c) => Expr.equal(c.id, Expr.external('1')))
      .maybeOne();

    const result = BetterSqliteDriver.exec(db, queryOp);

    expect(result?.title).toBe('Task 1');
  });

  test('should use named external parameters', () => {
    const queryOp = tasksDb.tables.tasks.query().limit(Expr.external(10, 'myLimit')).all();

    // Check that params exist and contain the limit value
    expect(queryOp.params).toBeDefined();
    const paramValues = Object.values(queryOp.params || {});
    expect(paramValues).toContain(10);
  });
});

describe('BetterSqliteDriver - Error Handling', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = new BetterSqlite3(':memory:');
  });

  test('should throw error for invalid SQL', () => {
    expect(() => {
      db.exec('INVALID SQL STATEMENT');
    }).toThrow();
  });

  test('should throw error when querying non-existent table', () => {
    expect(() => {
      const queryOp = tasksDb.tables.tasks.query().all();
      BetterSqliteDriver.exec(db, queryOp);
    }).toThrow();
  });
});
