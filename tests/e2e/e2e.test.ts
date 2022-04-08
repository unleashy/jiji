import * as fs from "fs";
import * as path from "path";
import { suite } from "uvu";
import * as assert from "uvu/assert";
import { execJiji } from "../util";
import { compile } from "../../src";

const REG_LOG_EXPECT = /--\s*log:(.+)\n/g;
function getExpectedLogs(code: string): string[] {
  return [...code.matchAll(REG_LOG_EXPECT)].map(m => m[1].trim());
}

const REG_ERR_EXPECT = /--\s*error:(.+)\n/;
function getExpectedError(code: string): string | undefined {
  return code.match(REG_ERR_EXPECT)?.[1].trim();
}

async function doCase(path: string): Promise<void> {
  const code = await fs.promises.readFile(path, "utf-8");
  const expectedLogs = getExpectedLogs(code);

  const js = compile(code);
  const actualLogs = execJiji(js);

  assert.equal(actualLogs, expectedLogs);
}

const test = suite("E2E");

const casesDir = path.normalize(__dirname + "/cases");
const cases = fs.readdirSync(casesDir);

for (const caseName of cases) {
  const casePath = path.normalize(casesDir + `/${caseName}`);
  test(caseName, () => doCase(casePath));
}

test.run();
