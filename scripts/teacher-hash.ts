/** Prints the SHA-256 hash for a new teacher code. Usage: npm run teacher-hash -- mynewcode */
import { createHash } from "node:crypto";

const code = process.argv[2];
if (!code) {
  console.error("Usage: npm run teacher-hash -- <code>");
  process.exit(1);
}
const hash = createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
console.log(`\nPaste this into content/config.json as "teacherCodeHash":\n\n  ${hash}\n`);
