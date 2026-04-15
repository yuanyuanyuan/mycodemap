#!/usr/bin/env node

const HELP_TEXT = `
ArcadeDB HTTP smoke test

Required environment variables:
  ARCADEDB_HTTP_URL   Base URL, for example http://localhost:2480
  ARCADEDB_DATABASE   Database name used in /api/v1/command/{database}
  ARCADEDB_USERNAME   Basic auth username
  ARCADEDB_PASSWORD   Basic auth password

Optional:
  ARCADEDB_CYPHER     Cypher query to run

Request:
  POST {ARCADEDB_HTTP_URL}/api/v1/command/{database}
  Body: {"language":"cypher","command":"MATCH (n) RETURN count(n) AS total LIMIT 1"}
  Auth: Authorization: Basic ...

This script is intentionally isolated from shipped runtime code.
Use --help for offline validation when no ArcadeDB server is available.
`.trim();

function printHelp() {
  console.log(HELP_TEXT);
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

async function main() {
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }

  let baseUrl;
  let database;
  let username;
  let password;

  try {
    baseUrl = getRequiredEnv("ARCADEDB_HTTP_URL").replace(/\/+$/, "");
    database = getRequiredEnv("ARCADEDB_DATABASE");
    username = getRequiredEnv("ARCADEDB_USERNAME");
    password = getRequiredEnv("ARCADEDB_PASSWORD");
  } catch (error) {
    console.error(String(error instanceof Error ? error.message : error));
    console.error("Run with --help to see the required contract.");
    process.exitCode = 1;
    return;
  }

  const command = (process.env.ARCADEDB_CYPHER || "MATCH (n) RETURN count(n) AS total LIMIT 1").trim();
  const endpoint = `${baseUrl}/api/v1/command/${database}`;
  const authHeader = Buffer.from(`${username}:${password}`, "utf8").toString("base64");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      language: "cypher",
      command,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error(`ArcadeDB HTTP smoke failed: ${response.status} ${response.statusText}`);
    console.error(text);
    process.exitCode = 1;
    return;
  }

  console.log("ArcadeDB HTTP smoke succeeded");
  if (text.trim().length > 0) {
    console.log(text);
  }
}

await main();
