import * as zen from 'zendb';

export type RepeatMode = 'daily' | 'weekly' | 'monthly';

export type Priority = 'low' | 'medium' | 'high';

export type Repeat = {
  mode: RepeatMode;
  reassign: boolean;
};

const users = zen.Schema.table({
  email: zen.Schema.column.dt.text().primary(),
  token: zen.Schema.column.dt.text(),
  name: zen.Schema.column.dt.text(),
});

export type User = zen.Infer<typeof users>;

const spaces = zen.Schema.table({
  id: zen.Schema.column.dt.text().primary(),
  slug: zen.Schema.column.dt.text().unique(),
  name: zen.Schema.column.dt.text(),
});

export type Space = zen.Infer<typeof spaces>;

const user_space = zen.Schema.table({
  userEmail: zen.Schema.column.dt.text().primary(),
  spaceId: zen.Schema.column.dt.text().primary(),
});

export type UserSpace = zen.Infer<typeof user_space>;

const customDt = zen.Datatype.create<bigint, string>({
  name: 'bigint',
  parse: (value: string) => BigInt(value),
  serialize: (value: bigint) => value.toString(),
  type: 'INTEGER',
});

const tasks = zen.Schema.table({
  id: zen.Schema.column.dt.text().primary(),
  spaceId: zen.Schema.column.dt.text(),
  chainId: zen.Schema.column.dt.text(),
  name: zen.Schema.column.dt.text(),
  infos: zen.Schema.column.dt.text(),
  color: zen.Schema.column.dt.text(),
  createdAt: zen.Schema.column.dt.date().defaultValue(() => new Date()),
  date: zen.Schema.column.dt.date(),
  priority: zen.Schema.column.dt.text<Priority>(),
  repeat: zen.Schema.column.dt.json<Repeat>().nullable(),
  done: zen.Schema.column.dt.boolean().defaultValue(() => false),
  big: zen.Schema.column.create(customDt).nullable(),
});

export type Task = zen.Infer<typeof tasks>;

const task_user = zen.Schema.table({
  taskId: zen.Schema.column.dt.text().primary(),
  userEmail: zen.Schema.column.dt.text().primary(),
});

export type TaskUser = zen.Infer<typeof task_user>;

export const schema = zen.Schema.define({
  tables: { users, spaces, tasks, user_space, task_user },
  strict: false,
});
