'use strict';

const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_HOST = '175.183.34.91';
const DEFAULT_USER = 'zhe';
const DEFAULTS = [
  {
    id: 'mvp',
    name: 'MVP（現有主機）',
    host: DEFAULT_HOST,
    username: DEFAULT_USER,
    projectRoot: '/home/zhe/pets',
    backupDirectory: '/home/zhe/pets-backups',
    stateFile: '/home/zhe/pets-deploy-state/deployment.state',
    siteUrl: `http://${DEFAULT_HOST}/`,
    fingerprint: 'SHA256:YWPE7arZLZ8/67Ta6hLRdBj73eNdk24klgUo+rRBm6s',
    knownHostsFile: null,
    hostKeyAlias: DEFAULT_HOST,
  },
  {
    id: 'pets',
    name: 'PETS（新主機）',
    host: DEFAULT_HOST,
    username: DEFAULT_USER,
    projectRoot: '/home/zhe/pets',
    backupDirectory: '/home/zhe/pets-backups',
    stateFile: '/home/zhe/pets-deploy-state/deployment.state',
    siteUrl: `http://${DEFAULT_HOST}/`,
    fingerprint: '',
    hostKeyAlias: 'pets-new-host',
  },
  {
    id: 'pets-2',
    name: 'PETS 2.0（未來主機）',
    host: DEFAULT_HOST,
    username: DEFAULT_USER,
    projectRoot: '/home/zhe/pets',
    backupDirectory: '/home/zhe/pets-backups',
    stateFile: '/home/zhe/pets-deploy-state/deployment.state',
    siteUrl: `http://${DEFAULT_HOST}/`,
    fingerprint: '',
    hostKeyAlias: 'pets-2-host',
  },
];

function profileDirectory() {
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(base, 'Pets-Operations-Center');
}

function knownHostsPath(id, dataDirectory) {
  return path.join(dataDirectory, 'known_hosts', `${id}.known_hosts`);
}

function normalizeFingerprint(value) {
  const normalized = String(value || '').trim().replace(/^SHA256:/, '').replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]{43}$/.test(normalized)) {
    throw new Error('主機指紋格式無效；請輸入 Ubuntu 顯示的 SHA256 指紋。');
  }
  return `SHA256:${normalized}`;
}

function fingerprintOf(key) {
  return `SHA256:${createHash('sha256').update(key).digest('base64').replace(/=+$/, '')}`;
}

function validateProfile(profile) {
  if (!profile || !/^[a-z0-9-]{1,32}$/.test(profile.id) ||
      typeof profile.name !== 'string' || !profile.name.trim() || profile.name.length > 80 ||
      typeof profile.host !== 'string' || !/^[A-Za-z0-9.-]{1,253}$/.test(profile.host) ||
      typeof profile.username !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(profile.username) ||
      typeof profile.projectRoot !== 'string' || !/^\/[A-Za-z0-9._/-]+$/.test(profile.projectRoot) ||
      typeof profile.backupDirectory !== 'string' || !/^\/[A-Za-z0-9._/-]+$/.test(profile.backupDirectory) ||
      typeof profile.stateFile !== 'string' || !/^\/[A-Za-z0-9._/-]+$/.test(profile.stateFile) ||
      typeof profile.siteUrl !== 'string' || !/^https?:\/\/[A-Za-z0-9.-]+(?::\d{1,5})?\/?$/.test(profile.siteUrl) ||
      typeof profile.fingerprint !== 'string' ||
      typeof profile.hostKeyAlias !== 'string' || !/^[A-Za-z0-9.-]{1,253}$/.test(profile.hostKeyAlias)) {
    throw new Error('主機設定格式無效；設定未載入。');
  }
  if (profile.fingerprint) normalizeFingerprint(profile.fingerprint);
  return Object.freeze({ ...profile, fingerprint: profile.fingerprint || '' });
}

class HostRegistry {
  constructor(options = {}) {
    this.configPath = options.configPath || path.join(profileDirectory(), 'hosts.json');
    this.dataDirectory = options.dataDirectory || path.dirname(this.configPath);
    this.scanHostKey = options.scanHostKey;
    this.profiles = new Map(DEFAULTS.map((profile) => [profile.id, validateProfile(profile)]));
    this.loadError = null;
    this.load();
  }

  load() {
    let text;
    try {
      const fsSync = require('node:fs');
      if (fsSync.lstatSync(this.configPath).isSymbolicLink()) {
        this.loadError = new Error('本機主機設定是符號連結；為避免信任設定被替換，已停止載入。');
        return;
      }
      text = fsSync.readFileSync(this.configPath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return;
      this.loadError = new Error('無法讀取本機主機設定；為避免連錯主機，已停止載入設定。');
      return;
    }

    try {
      const saved = JSON.parse(text);
      if (!Array.isArray(saved) || saved.length > 20) throw new Error('invalid');
      const next = new Map(this.profiles);
      const ids = new Set();
      for (const profile of saved) {
        const valid = validateProfile(profile);
        if (valid.id === 'mvp' || !next.has(valid.id) || ids.has(valid.id)) throw new Error('invalid profile id');
        ids.add(valid.id);
        next.set(valid.id, valid);
      }
      this.profiles = next;
    } catch {
      this.loadError = new Error('本機主機設定格式無效；為避免連錯主機，已停止載入設定。');
    }
  }

  list() {
    if (this.loadError) throw this.loadError;
    return [...this.profiles.values()].map(({ id, name, host, username, siteUrl, fingerprint }) => ({
      id, name, host, username, siteUrl, trusted: Boolean(fingerprint),
      fingerprint: fingerprint || null,
    }));
  }

  get(id) {
    if (this.loadError) throw this.loadError;
    const profile = this.profiles.get(id);
    if (!profile) throw new Error('找不到所選主機設定。');
    return profile;
  }

  async trust(id, suppliedFingerprint) {
    const profile = this.get(id);
    const expected = normalizeFingerprint(suppliedFingerprint);
    if (typeof this.scanHostKey !== 'function') throw new Error('目前環境不支援安全的 SSH 主機金鑰掃描。');
    const output = await this.scanHostKey(profile.host);
    const keys = String(output).split(/\r?\n/).map((line) => line.trim().split(/\s+/))
      .filter((parts) => parts.length >= 3 && parts[1] === 'ssh-ed25519');
    const matches = keys.filter(([, , encodedKey]) => {
      try {
        return fingerprintOf(Buffer.from(encodedKey, 'base64')) === expected;
      } catch {
        return false;
      }
    });
    if (matches.length !== 1) {
      throw new Error('掃描到的 ED25519 主機金鑰與您從 Ubuntu 主機本機取得的指紋不符；未更新信任設定。');
    }

    const directory = path.dirname(this.configPath);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const knownHosts = knownHostsPath(id, this.dataDirectory);
    const knownHostsDirectory = path.dirname(knownHosts);
    await fs.mkdir(knownHostsDirectory, { recursive: true, mode: 0o700 });
    try {
      if ((await fs.lstat(knownHostsDirectory)).isSymbolicLink() ||
          (await fs.lstat(knownHosts)).isSymbolicLink()) {
        throw new Error('主機專用 known_hosts 路徑是符號連結；未更新信任設定。');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const keyLine = `${profile.hostKeyAlias} ssh-ed25519 ${matches[0][2]}\n`;
    const temporaryKeyFile = `${knownHosts}.${process.pid}.tmp`;
    await fs.writeFile(temporaryKeyFile, keyLine, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    await fs.rename(temporaryKeyFile, knownHosts);

    const updated = validateProfile({ ...profile, fingerprint: expected });
    this.profiles.set(id, updated);
    const savedProfiles = [...this.profiles.values()].filter((item) => item.id !== 'mvp');
    const temporaryConfig = `${this.configPath}.${process.pid}.tmp`;
    await fs.writeFile(temporaryConfig, `${JSON.stringify(savedProfiles, null, 2)}\n`, {
      encoding: 'utf8', mode: 0o600, flag: 'wx',
    });
    await fs.rename(temporaryConfig, this.configPath);
    return { id, fingerprint: expected, trusted: true };
  }

  knownHostsFile(id) {
    const profile = this.get(id);
    return id === 'mvp' ? null : knownHostsPath(profile.id, this.dataDirectory);
  }
}

module.exports = {
  DEFAULT_HOST,
  DEFAULTS,
  HostRegistry,
  fingerprintOf,
  normalizeFingerprint,
};
