// Throwaway end-to-end auth test (custom mode). Run: npx tsx scripts/test-auth.ts
import { authenticateCustom } from "../src/lib/auth";

const PW = "password" + "123";
const roles = ["superadmin", "owner", "staff", "coach", "member"];

async function main() {
  let pass = 0;
  let fail = 0;

  for (const u of roles) {
    const s = await authenticateCustom(u, PW);
    if (s && s.role === u) {
      console.log(`✅ ${u.padEnd(11)} -> role=${s.role} name="${s.displayName}" company=${s.companyId} level=${s.level} v=${s.version} dbConfig=${s.dbConfig ? "yes" : "no"}`);
      pass++;
    } else {
      console.log(`❌ ${u.padEnd(11)} -> ${s ? "role mismatch " + s.role : "NULL (auth failed)"}`);
      fail++;
    }
  }

  // negative cases
  const wrong = await authenticateCustom("owner", "wrongpass");
  console.log(wrong === null ? "✅ wrong password -> rejected" : "❌ wrong password -> ACCEPTED (BUG)");
  if (wrong !== null) fail++;

  const nouser = await authenticateCustom("ghost", PW);
  console.log(nouser === null ? "✅ unknown user -> rejected" : "❌ unknown user -> ACCEPTED (BUG)");
  if (nouser !== null) fail++;

  console.log(`\nResult: ${pass} role logins ok, ${fail} failures`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
