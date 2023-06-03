import * as zen from 'zendb';

export type RepeatMode = 'daily' | 'weekly' | 'monthly';

export type Priority = 'low' | 'medium' | 'high';

export type Repeat = {
  mode: RepeatMode;
  reassign: boolean;
};

const dt = zen.ColumnDef.dt;

const customDt = zen.Datatype.create<bigint, string>({
  name: 'bigint',
  parse: (value: string) => BigInt(value),
  serialize: (value: bigint) => value.toString(),
  type: 'INTEGER',
});

export const schema = zen.Database({
  users: {
    email: dt.text().primary(),
    token: dt.text(),
    name: dt.text(),
  },
  spaces: {
    id: dt.text().primary(),
    slug: dt.text().unique(),
    name: dt.text(),
  },
  user_space: {
    userEmail: dt.text().primary(),
    spaceId: dt.text().primary(),
  },
  tasks: {
    id: dt.text().primary(),
    spaceId: dt.text(),
    chainId: dt.text(),
    name: dt.text(),
    infos: dt.text(),
    color: dt.text(),
    createdAt: dt.date().defaultValue(() => new Date()),
    date: dt.date(),
    priority: dt.text<Priority>(),
    repeat: dt.json<Repeat>().nullable(),
    done: dt.boolean().defaultValue(() => false),
    big: zen.ColumnDef.create(customDt).nullable(),
  },
  task_user: {
    taskId: dt.text().primary(),
    userEmail: dt.text().primary(),
  },
});

// export type User = zen.Infer<typeof schema, 'users'>;
// export type Space = zen.Infer<typeof schema, 'spaces'>;
// export type UserSpace = zen.Infer<typeof schema, 'user_space'>;
// export type Task = zen.Infer<typeof schema, 'tasks'>;
// export type TaskUser = zen.Infer<typeof schema, 'task_user'>;
