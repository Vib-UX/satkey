import { Client } from "ssh2";
import type { VpsConfig } from "./types";

export interface ProvisionResult {
  username: string;
  password: string;
  host: string;
  port: number;
}

interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

function getSSHConfig(): SSHConfig {
  const host = process.env.VPS_HOST;
  const username = process.env.VPS_SSH_USER;
  const password = process.env.VPS_SSH_PASSWORD;
  const port = Number(process.env.VPS_SSH_PORT) || 22;

  if (!host || !username || !password) {
    throw new Error(
      "Missing VPS_HOST, VPS_SSH_USER, or VPS_SSH_PASSWORD environment variables"
    );
  }

  return { host, port, username, password };
}

function generatePassword(length = 16): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function execSSH(conn: Client, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);

      let stdout = "";
      let stderr = "";

      stream.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
      stream.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });
      stream.on("close", (code: number) => {
        if (code !== 0) {
          reject(
            new Error(
              `Command failed (exit ${code}): ${command}\nstderr: ${stderr}\nstdout: ${stdout}`
            )
          );
        } else {
          resolve(stdout.trim());
        }
      });
    });
  });
}

function connectSSH(config: SSHConfig): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => resolve(conn))
      .on("error", reject)
      .connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        readyTimeout: 10_000,
      });
  });
}

export async function provisionUser(
  orderId: string,
  config: VpsConfig
): Promise<ProvisionResult> {
  const sshConfig = getSSHConfig();
  const shortId = orderId.replace("ord_", "").slice(0, 8);
  const username = `satkey_${shortId}`;
  const password = generatePassword();

  console.log(`[SatKey] Provisioning user ${username} on ${sshConfig.host}...`);
  console.log(`[SatKey] Config: ${config.cpu} vCPU, ${config.ramGb}GB RAM, ${config.storageGb}GB disk`);

  const conn = await connectSSH(sshConfig);

  try {
    const exists = await execSSH(conn, `id ${username} 2>/dev/null && echo EXISTS || echo MISSING`);
    if (exists === "EXISTS") {
      throw new Error(`User ${username} already exists on host`);
    }

    await execSSH(conn, `useradd -m -s /bin/bash ${username}`);
    await execSSH(conn, `echo '${username}:${password}' | chpasswd`);

    // Get the UID for systemd slice targeting
    const uid = await execSSH(conn, `id -u ${username}`);

    // Set resource limits via systemd user slice
    const cpuQuota = `${config.cpu * 100}%`;
    const memMax = `${config.ramGb}G`;

    try {
      await execSSH(
        conn,
        `systemctl set-property user-${uid}.slice CPUQuota=${cpuQuota} MemoryMax=${memMax}`
      );
      console.log(`[SatKey] Set cgroup limits: CPU=${cpuQuota}, MEM=${memMax}`);
    } catch (cgErr) {
      // systemd slice may not exist until the user logs in; create a drop-in
      console.warn(`[SatKey] systemctl set-property failed, creating drop-in override...`);

      const sliceDir = `/etc/systemd/system/user-${uid}.slice.d`;
      const overrideContent = [
        "[Slice]",
        `CPUQuota=${cpuQuota}`,
        `MemoryMax=${memMax}`,
      ].join("\\n");

      await execSSH(conn, `mkdir -p ${sliceDir}`);
      await execSSH(
        conn,
        `printf '${overrideContent}\\n' > ${sliceDir}/satkey-limits.conf`
      );
      await execSSH(conn, `systemctl daemon-reload`);
      console.log(`[SatKey] Created drop-in override at ${sliceDir}/satkey-limits.conf`);
    }

    // Attempt disk quota (best-effort)
    try {
      const softKb = config.storageGb * 1024 * 1024;
      const hardKb = Math.round(softKb * 1.1);
      await execSSH(
        conn,
        `setquota -u ${username} ${softKb} ${hardKb} 0 0 /`
      );
      console.log(`[SatKey] Set disk quota: ${config.storageGb}GB soft, ${Math.round(config.storageGb * 1.1)}GB hard`);
    } catch {
      console.warn(`[SatKey] Disk quotas not available on host, skipping`);
    }

    // Ensure SSH password auth is enabled for the user
    try {
      const matchBlock = `Match User ${username}\\n    PasswordAuthentication yes`;
      const check = await execSSH(
        conn,
        `grep -q "Match User ${username}" /etc/ssh/sshd_config && echo FOUND || echo MISSING`
      );
      if (check === "MISSING") {
        await execSSH(
          conn,
          `printf '\\n${matchBlock}\\n' >> /etc/ssh/sshd_config`
        );
        await execSSH(conn, `systemctl reload sshd 2>/dev/null || systemctl reload ssh 2>/dev/null || true`);
        console.log(`[SatKey] Added SSH PasswordAuthentication for ${username}`);
      }
    } catch {
      console.warn(`[SatKey] Could not configure SSH password auth, may need manual setup`);
    }

    console.log(`[SatKey] Provisioning complete: ${username}@${sshConfig.host}`);

    return {
      username,
      password,
      host: sshConfig.host,
      port: Number(process.env.VPS_SSH_PORT) || 22,
    };
  } finally {
    conn.end();
  }
}

export async function deprovisionUser(orderId: string): Promise<void> {
  const sshConfig = getSSHConfig();
  const shortId = orderId.replace("ord_", "").slice(0, 8);
  const username = `satkey_${shortId}`;

  console.log(`[SatKey] Deprovisioning user ${username}...`);

  const conn = await connectSSH(sshConfig);

  try {
    await execSSH(conn, `pkill -u ${username} 2>/dev/null || true`);
    await execSSH(conn, `userdel -r ${username} 2>/dev/null || true`);

    const uid = await execSSH(conn, `id -u ${username} 2>/dev/null || echo GONE`);
    if (uid !== "GONE") {
      await execSSH(conn, `rm -rf /etc/systemd/system/user-${uid}.slice.d`);
      await execSSH(conn, `systemctl daemon-reload`);
    }

    // Remove SSH match block
    await execSSH(
      conn,
      `sed -i "/Match User ${username}/,+1d" /etc/ssh/sshd_config 2>/dev/null || true`
    );

    console.log(`[SatKey] Deprovisioned ${username}`);
  } finally {
    conn.end();
  }
}
