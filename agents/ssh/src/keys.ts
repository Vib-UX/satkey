import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const MARKER_PREFIX = "# satkey:session=";

/**
 * Each managed key line in authorized_keys is tagged with a comment marker
 * so we can surgically add/remove keys without disturbing manually-added ones.
 */
function taggedLine(sessionId: string, sshPubkey: string): string {
  return `${sshPubkey} ${MARKER_PREFIX}${sessionId}`;
}

function extractSessionId(line: string): string | null {
  const idx = line.indexOf(MARKER_PREFIX);
  if (idx === -1) return null;
  return line.slice(idx + MARKER_PREFIX.length).trim();
}

export async function readAuthorizedKeys(
  path: string
): Promise<string[]> {
  try {
    const content = await readFile(path, "utf8");
    return content.split("\n").filter((l) => l.trim().length > 0);
  } catch {
    return [];
  }
}

export async function writeAuthorizedKeys(
  path: string,
  lines: string[]
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, lines.join("\n") + "\n", { mode: 0o600 });
}

export async function addKey(
  path: string,
  sessionId: string,
  sshPubkey: string,
  dryRun = false
): Promise<void> {
  const lines = await readAuthorizedKeys(path);
  const newLine = taggedLine(sessionId, sshPubkey);

  if (lines.some((l) => extractSessionId(l) === sessionId)) {
    return; // already present
  }

  lines.push(newLine);

  if (dryRun) {
    console.log(`[dry-run] Would add key for session ${sessionId}`);
    return;
  }

  await writeAuthorizedKeys(path, lines);
  console.log(`Added SSH key for session ${sessionId}`);
}

export async function removeKey(
  path: string,
  sessionId: string,
  dryRun = false
): Promise<void> {
  const lines = await readAuthorizedKeys(path);
  const filtered = lines.filter((l) => extractSessionId(l) !== sessionId);

  if (filtered.length === lines.length) return; // nothing to remove

  if (dryRun) {
    console.log(`[dry-run] Would remove key for session ${sessionId}`);
    return;
  }

  await writeAuthorizedKeys(path, filtered);
  console.log(`Removed SSH key for session ${sessionId}`);
}

export async function removeAllManagedKeys(
  path: string,
  dryRun = false
): Promise<number> {
  const lines = await readAuthorizedKeys(path);
  const filtered = lines.filter((l) => extractSessionId(l) === null);
  const removed = lines.length - filtered.length;

  if (removed === 0) return 0;

  if (dryRun) {
    console.log(`[dry-run] Would remove ${removed} managed keys`);
    return removed;
  }

  await writeAuthorizedKeys(path, filtered);
  console.log(`Removed ${removed} managed keys`);
  return removed;
}

export async function listManagedSessions(
  path: string
): Promise<string[]> {
  const lines = await readAuthorizedKeys(path);
  return lines
    .map(extractSessionId)
    .filter((id): id is string => id !== null);
}
