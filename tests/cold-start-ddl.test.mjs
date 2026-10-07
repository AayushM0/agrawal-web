import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.join(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("AWB-23: shouldRunSchemaOnBoot bypasses DDL in production mode without AUTO_MIGRATE_SCHEMA", async () => {
  const { shouldRunSchemaOnBoot } = await import("../src/lib/db.ts");

  const origNodeEnv = process.env.NODE_ENV;
  const origAutoMigrate = process.env.AUTO_MIGRATE_SCHEMA;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.AUTO_MIGRATE_SCHEMA;
    assert.equal(
      shouldRunSchemaOnBoot(),
      false,
      "Cold-start DDL must be bypassed in production when AUTO_MIGRATE_SCHEMA is unset"
    );

    process.env.AUTO_MIGRATE_SCHEMA = "false";
    assert.equal(
      shouldRunSchemaOnBoot(),
      false,
      "Cold-start DDL must be bypassed in production when AUTO_MIGRATE_SCHEMA is 'false'"
    );

    process.env.AUTO_MIGRATE_SCHEMA = "";
    assert.equal(
      shouldRunSchemaOnBoot(),
      false,
      "Cold-start DDL must be bypassed in production when AUTO_MIGRATE_SCHEMA is empty"
    );
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origAutoMigrate !== undefined) {
      process.env.AUTO_MIGRATE_SCHEMA = origAutoMigrate;
    } else {
      delete process.env.AUTO_MIGRATE_SCHEMA;
    }
  }
});

test("AWB-23: shouldRunSchemaOnBoot executes DDL in development mode or when AUTO_MIGRATE_SCHEMA === 'true'", async () => {
  const { shouldRunSchemaOnBoot } = await import("../src/lib/db.ts");

  const origNodeEnv = process.env.NODE_ENV;
  const origAutoMigrate = process.env.AUTO_MIGRATE_SCHEMA;

  try {
    // Development mode
    process.env.NODE_ENV = "development";
    delete process.env.AUTO_MIGRATE_SCHEMA;
    assert.equal(
      shouldRunSchemaOnBoot(),
      true,
      "Cold-start DDL must run in development mode"
    );

    // Production mode with explicit AUTO_MIGRATE_SCHEMA === 'true'
    process.env.NODE_ENV = "production";
    process.env.AUTO_MIGRATE_SCHEMA = "true";
    assert.equal(
      shouldRunSchemaOnBoot(),
      true,
      "Cold-start DDL must run in production mode when AUTO_MIGRATE_SCHEMA is 'true'"
    );

    // Test mode with explicit AUTO_MIGRATE_SCHEMA === 'true'
    process.env.NODE_ENV = "test";
    process.env.AUTO_MIGRATE_SCHEMA = "true";
    assert.equal(
      shouldRunSchemaOnBoot(),
      true,
      "Cold-start DDL must run when AUTO_MIGRATE_SCHEMA is 'true' even in test mode"
    );

    // Test mode without AUTO_MIGRATE_SCHEMA
    delete process.env.AUTO_MIGRATE_SCHEMA;
    assert.equal(
      shouldRunSchemaOnBoot(),
      false,
      "Cold-start DDL must be bypassed in test mode when AUTO_MIGRATE_SCHEMA is unset"
    );
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origAutoMigrate !== undefined) {
      process.env.AUTO_MIGRATE_SCHEMA = origAutoMigrate;
    } else {
      delete process.env.AUTO_MIGRATE_SCHEMA;
    }
  }
});

test("AWB-23: Static verification: Pool init gates background DDL and removes redundant pre-transaction calls", () => {
  const dbSource = read("src/lib/db.ts");

  // Verify pool initialization gates background ensureSchema with shouldRunSchemaOnBoot()
  assert.ok(
    dbSource.includes("if (!globalForPg.schemaEnsured && shouldRunSchemaOnBoot())"),
    "src/lib/db.ts must gate background ensureSchema behind shouldRunSchemaOnBoot()"
  );

  // Verify createHousehold does not have pre-transaction ensureSchema
  const createHouseholdMatch = dbSource.match(/async createHousehold\([\s\S]*?async resubmitHousehold/);
  assert.ok(createHouseholdMatch, "createHousehold block must be present");
  const createHouseholdBlock = createHouseholdMatch[0];
  assert.equal(
    createHouseholdBlock.includes("await ensureSchema"),
    false,
    "createHousehold must not contain redundant pre-transaction ensureSchema call"
  );

  // Verify resubmitHousehold does not have pre-transaction ensureSchema
  const resubmitHouseholdMatch = dbSource.match(/async resubmitHousehold\([\s\S]*?async claimMember/);
  assert.ok(resubmitHouseholdMatch, "resubmitHousehold block must be present");
  const resubmitHouseholdBlock = resubmitHouseholdMatch[0];
  assert.equal(
    resubmitHouseholdBlock.includes("await ensureSchema"),
    false,
    "resubmitHousehold must not contain redundant pre-transaction ensureSchema call"
  );
});

test("AWB-23: Lazy auto-healing: simulated 42703 (undefined_column) error triggers ensureSchema and retries query", async () => {
  const {
    executeWithAutoHealing,
    isSchemaHealed,
    resetSchemaHealingStateForTest,
  } = await import("../src/lib/db.ts");

  resetSchemaHealingStateForTest();
  assert.equal(isSchemaHealed(), false, "Initial healing state must be false");

  let attempts = 0;
  let schemaEnsuredCalled = false;
  const mockClient = {
    query: async () => ({ rows: [] }),
  };

  const simulatedQuery = async () => {
    attempts++;
    if (attempts === 1) {
      const err = new Error('column "new_col" does not exist');
      err.code = "42703";
      throw err;
    }
    return { rows: [{ id: "household-123", name: "Agrawal Family" }] };
  };

  const mockEnsureSchema = async (client) => {
    schemaEnsuredCalled = true;
    assert.equal(client, mockClient, "ensureSchema must receive the client");
  };

  const result = await executeWithAutoHealing(
    simulatedQuery,
    () => mockClient,
    mockEnsureSchema
  );

  assert.equal(attempts, 2, "Query must have retried after auto-healing");
  assert.equal(schemaEnsuredCalled, true, "ensureSchema must have been executed");
  assert.equal(isSchemaHealed(), true, "isSchemaHealed must be true after healing");
  assert.deepEqual(result, { rows: [{ id: "household-123", name: "Agrawal Family" }] });
});

test("AWB-23: Lazy auto-healing: simulated 42P01 (undefined_table) error triggers ensureSchema and retries query", async () => {
  const {
    executeWithAutoHealing,
    isSchemaHealed,
    resetSchemaHealingStateForTest,
  } = await import("../src/lib/db.ts");

  resetSchemaHealingStateForTest();
  assert.equal(isSchemaHealed(), false, "Initial healing state must be false");

  let attempts = 0;
  let schemaEnsuredCalled = false;
  const mockClient = {
    query: async () => ({ rows: [] }),
  };

  const simulatedQuery = async () => {
    attempts++;
    if (attempts === 1) {
      const err = new Error('relation "admin_audit_logs" does not exist');
      err.code = "42P01";
      throw err;
    }
    return { rows: [{ count: 42 }] };
  };

  const mockEnsureSchema = async () => {
    schemaEnsuredCalled = true;
  };

  const result = await executeWithAutoHealing(
    simulatedQuery,
    () => mockClient,
    mockEnsureSchema
  );

  assert.equal(attempts, 2, "Query must retry after 42P01 undefined_table healing");
  assert.equal(schemaEnsuredCalled, true, "ensureSchema must have been executed");
  assert.equal(isSchemaHealed(), true, "isSchemaHealed must be true");
  assert.deepEqual(result, { rows: [{ count: 42 }] });
});

test("AWB-23: Infinite loop prevention: 42703/42P01 rethrows if schema was already healed in this process", async () => {
  const {
    executeWithAutoHealing,
    isSchemaHealed,
    resetSchemaHealingStateForTest,
  } = await import("../src/lib/db.ts");

  resetSchemaHealingStateForTest();

  // First heal successfully
  let firstCallCount = 0;
  await executeWithAutoHealing(
    async () => {
      firstCallCount++;
      if (firstCallCount === 1) {
        const err = new Error("first undefined column");
        err.code = "42703";
        throw err;
      }
      return { ok: true };
    },
    () => ({ query: async () => {} }),
    async () => {}
  );
  assert.equal(isSchemaHealed(), true, "Schema is now healed");

  // Subsequent 42703 error must NOT heal again and must rethrow immediately
  let ensureSchemaCallCount = 0;
  let errorCaught = false;

  try {
    await executeWithAutoHealing(
      async () => {
        const err = new Error("second undefined column on persistent failure");
        err.code = "42703";
        throw err;
      },
      () => ({ query: async () => {} }),
      async () => {
        ensureSchemaCallCount++;
      }
    );
  } catch (err) {
    errorCaught = true;
    assert.equal(err.code, "42703", "Rethrown error must match original code");
  }

  assert.equal(errorCaught, true, "Must rethrow error when already healed");
  assert.equal(ensureSchemaCallCount, 0, "Must not execute ensureSchema again once already healed");
});

test("AWB-23: Non-missing-schema errors rethrow immediately without invoking ensureSchema", async () => {
  const {
    executeWithAutoHealing,
    isSchemaHealed,
    resetSchemaHealingStateForTest,
  } = await import("../src/lib/db.ts");

  resetSchemaHealingStateForTest();

  let ensureSchemaCalled = false;
  let caughtError = null;

  try {
    await executeWithAutoHealing(
      async () => {
        const err = new Error("duplicate key value violates unique constraint");
        err.code = "23505";
        throw err;
      },
      () => ({ query: async () => {} }),
      async () => {
        ensureSchemaCalled = true;
      }
    );
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError, "Must rethrow non-schema error");
  assert.equal(caughtError.code, "23505", "Code must be 23505");
  assert.equal(ensureSchemaCalled, false, "ensureSchema must not be called for 23505");
  assert.equal(isSchemaHealed(), false, "isSchemaHealed must remain false");
});

test("AWB-23: Lazy auto-healing logs exact notice message with error code", async () => {
  const {
    executeWithAutoHealing,
    resetSchemaHealingStateForTest,
  } = await import("../src/lib/db.ts");

  resetSchemaHealingStateForTest();

  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => {
    warnings.push(args.join(" "));
  };

  try {
    let call = 0;
    await executeWithAutoHealing(
      async () => {
        call++;
        if (call === 1) {
          const err = new Error("missing column");
          err.code = "42703";
          throw err;
        }
        return { success: true };
      },
      () => ({ query: async () => {} }),
      async () => {}
    );

    const expectedNotice = "[DB] Missing schema detected (code 42703). Executing lazy auto-healing ensureSchema...";
    const foundNotice = warnings.some((w) => w.includes(expectedNotice));
    assert.ok(foundNotice, `Must log expected notice message: ${expectedNotice}`);
  } finally {
    console.warn = originalWarn;
  }
});
