const RESET_TABLES = [
  'notifications',
  'email_logs',
  'payment_transactions',
  'order_items',
  'orders',
  'cart_items',
  'carts',
  'analytics_events',
  'chat_messages',
  'chat_sessions',
  'chat_leads',
  'search_analytics',
  'missing_searches',
];

function assertKnownTable(table) {
  if (!RESET_TABLES.includes(table)) {
    throw new Error(`Unsupported reset table: ${table}`);
  }
}

async function countRows(env, table) {
  assertKnownTable(table);
  const row = await env.DB.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first();
  return Number(row?.count || 0);
}

async function clearTable(env, table) {
  assertKnownTable(table);
  const before = await countRows(env, table);
  await env.DB.prepare(`DELETE FROM ${table}`).run();
  return { table, deleted: before };
}

export async function resetStoreActivity(env) {
  const summary = [];

  for (const table of RESET_TABLES) {
    summary.push(await clearTable(env, table));
  }

  return {
    reset_at: new Date().toISOString(),
    tables: summary,
    total_deleted: summary.reduce((sum, item) => sum + item.deleted, 0),
  };
}
