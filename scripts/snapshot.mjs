#!/usr/bin/env node
/**
 * snapshot.mjs — حفظ لقطة استعادة موثّقة (تاريخ + شرح) يمكن الرجوع إليها.
 *
 * الاستخدام:
 *   node scripts/snapshot.mjs "شرح التغيير"
 *   npm run snapshot -- "شرح التغيير"
 *
 * ماذا يفعل:
 *   1) يتأكد أن الشجرة نظيفة (اللقطة تمثّل حالة محفوظة فعلًا).
 *   2) يبني اسم وسم فريدًا: snap-YYYY-MM-DD-NN.
 *   3) يضيف إدخالًا (التاريخ + الوسم + الشرح) إلى docs/SNAPSHOTS.md.
 *   4) يرفع الإدخال في commit منفصل — مع تعطيل الوسم التلقائي لهذا الـcommit
 *      عبر DHK_SNAPSHOT=1 حتى لا يتكرر وسمان على نفس الـcommit.
 *   5) ينشئ وسمًا مُعلقًا رسالته = الشرح + التاريخ (التعليق المطلوب).
 *   6) يحفظ أرشيف zip مستقلًا في snapshots/ عبر git archive (نسخة خارج git).
 *
 * خطوات الاستعادة موثّقة في docs/SNAPSHOTS.md.
 * أي فشل يطبع SNAPSHOT_FAIL ويخرج برمز != 0 (لا يُبلَّغ نجاحًا قبل التحقق).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY = path.join(root, "docs", "SNAPSHOTS.md");
const SENTINEL = "<!-- SNAPSHOT-ROWS -->";

let stage = "init";

function git(args, opts = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  }).trim();
}

function tagExists(tag) {
  try {
    git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
}

try {
  // 1) وصف مطلوب + شجرة نظيفة
  stage = "description";
  const desc = (process.argv[2] || "").trim();
  if (!desc) {
    throw new Error('missing description — usage: node scripts/snapshot.mjs "شرح التغيير"');
  }

  stage = "clean-check";
  if (git(["status", "--porcelain"]) !== "") {
    throw new Error("working tree is not clean — commit (or stash) first, then run the snapshot");
  }

  // 2) اسم وسم فريد لليوم
  stage = "tag-name";
  const now = new Date();
  const p2 = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`;
  const prefix = `snap-${date}`;
  let seq = 1;
  let tag = `${prefix}-${p2(seq)}`;
  while (tagExists(tag)) {
    seq += 1;
    tag = `${prefix}-${p2(seq)}`;
  }

  // 3) إضافة الإدخال إلى سجل اللقطات (الأحدث أولًا: مباشرة بعد العلامة)
  stage = "registry-row";
  const lines = readFileSync(REGISTRY, "utf8").split(/\r?\n/);
  const at = lines.findIndex((line) => line.includes(SENTINEL));
  if (at === -1) throw new Error(`sentinel ${SENTINEL} not found in docs/SNAPSHOTS.md`);
  lines.splice(at + 1, 0, `| ${date} | \`${tag}\` | ${desc.replace(/\|/g, "\\|")} |`);
  writeFileSync(REGISTRY, lines.join("\n"), "utf8");

  // 4) رفع الإدخال في commit منفصل
  stage = "registry-commit";
  git(["add", "--", "docs/SNAPSHOTS.md"]);
  git(["commit", "-m", `docs: لقطة ${tag} — ${desc}`], {
    env: { ...process.env, DHK_SNAPSHOT: "1" },
  });

  // 5) الوسم المُعلق: الشرح + التاريخ
  stage = "annotated-tag";
  git(["tag", "-a", tag, "-m", desc, "-m", `التاريخ: ${date}`]);

  // 6) أرشيف zip مستقل
  stage = "zip-archive";
  const outDir = path.join(root, "snapshots");
  mkdirSync(outDir, { recursive: true });
  const zip = path.join(outDir, `${tag}.zip`);
  git(["archive", "--format=zip", "-o", zip, "HEAD"]);
  const size = statSync(zip).size;
  if (size <= 0) throw new Error("zip archive is empty");

  console.log(`SNAPSHOT_OK ${tag}`);
  console.log(`  date: ${date}`);
  console.log(`  zip:  snapshots/${tag}.zip (${size} bytes)`);
  console.log("  restore steps: docs/SNAPSHOTS.md");
} catch (err) {
  console.error(`SNAPSHOT_FAIL [${stage}]: ${err.message || err}`);
  process.exit(1);
}
