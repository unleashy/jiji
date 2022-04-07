import sade from "sade";
import pkg from "../package.json";
import { compileFile } from "./index";
import { JijiError } from "./error";

function errCodeToMessage(
  e: { code: string; message: string },
  path: string
): string {
  switch (e.code) {
    case "EACCES":
    case "EPERM":
      return `no permission to read file at ${path}`;

    case "EISDIR":
      return `${path} is a directory, not a file`;

    case "ENOENT":
      return `no file exists at ${path}`;

    default:
      return `unknown error ${e.code} - ${e.message}`;
  }
}

async function runCode(path: string) {
  try {
    const js = await compileFile(path);
    new Function(js)();
  } catch (e: any) {
    if (e.code) {
      console.error("Error reading file:", errCodeToMessage(e, path));
    } else if (e instanceof JijiError) {
      console.error(e.message);
    } else {
      throw e;
    }
  }
}

sade("jiji <file>", true)
  .version(pkg.version)
  .describe("Run a Jiji file")
  .action(runCode)
  .parse(process.argv);
