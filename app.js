import { Hono } from "@hono/hono";
import postgres from "postgres";

const BANNED_WORDS = [
  "delete", "update", "insert", "drop", "alter", "create",
  "truncate", "replace", "merge", "grant", "revoke",
  "transaction", "commit", "rollback", "savepoint", "lock",
  "execute", "call", "do", "set", "comment"
];

const query = async (query) => {
  // check that the query does not do data manipulation
  for (const word of BANNED_WORDS) {
    if (query.toLowerCase().includes(word)) {
      throw new Error(`You cannot ${word} data`);
    }
  }

  const sql = postgres({
    max: 2,
    max_lifetime: 10,
    host: "database.cs.aalto.fi",
    port: 54321,
    database: "YOUR_DATABASE_NAME", // Replace with your credentials
    username: "YOUR_USERNAME",     // Replace with your credentials
    password: "YOUR_PASSWORD",     // Replace with your credentials
  });
  
  try {
    const result = await sql.unsafe(query);
    return { result };
  } finally {
    await sql.end();
  }
};

const app = new Hono();

app.get("/*", (c) => {
  return c.html(`
    <html>
      <head>
        <title>SQL Query Service</title>
      </head>
      <body>
        <h1>SQL Query Service</h1>
        <p>POST a JSON document with a "query" property to execute SQL queries</p>
        <p>Example: {"query": "SELECT 1 + 1 AS sum"}</p>
      </body>
    </html>
  `);
});

app.post("/*", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.query) {
      return c.json({ error: "Missing query parameter" }, 400);
    }
    const response = await query(body.query);
    return c.json(response);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);
