import "dotenv/config";
import { assertTestDatabaseIsolation } from "../server/user-governance";

assertTestDatabaseIsolation(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL || process.env.POSTGRES_URL);
console.log("Test database isolation verified.");
