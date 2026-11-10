'use strict';

const { createHash, randomUUID } = require('node:crypto');
const fsSync = require('node:fs');
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
    this.removed = new Set();
    this.loadError = null;
    this.load();
  }

  load() {
    let text;
    try {
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
      const parsed = JSON.parse(text);
      const saved = Array.isArray(parsed) ? parsed : parsed.profiles;
      const removed = Array.isArray(parsed) ? [] : parsed.removed;
      if (!Array.isArray(saved) || saved.length > (Array.isArray(parsed) ? 20 : 52) ||
          !Array.isArray(removed) || removed.some((id) => !['mvp', 'pets', 'pets-2'].includes(id))) {
        throw new Error('invalid');
      }
      const next = new Map(this.profiles);
      for (const id of removed) next.delete(id);
      const ids = new Set();
      for (const profile of saved) {
        const valid = validateProfile(profile);
        if (!next.has(valid.id) || ids.has(valid.id) || removed.includes(valid.id)) {
          if (!Array.isArray(parsed) && !['mvp', 'pets', 'pets-2'].includes(valid.id)) continue;
          throw new Error('invalid profile id');
        }
        ids.add(valid.id);
        next.set(valid.id, valid);
      }
      this.profiles = next;
      this.removed = new Set(removed);
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

  listRemoved() {
    if (this.loadError) throw this.loadError;
    return [...this.removed].map((id) => ({
      id,
      name: DEFAULTS.find((profile) => profile.id === id).name,
    }));
  }

  get(id) {
    if (this.loadError) throw this.loadError;
    const profile = this.profiles.get(id);
    if (!profile) throw new Error('找不到所選主機設定。');
    return profile;
  }

  async saveProfiles(profiles, removed = this.removed) {
    const directory = path.dirname(this.configPath);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const temporaryConfig = `${this.configPath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporaryConfig, `${JSON.stringify({
        profiles,
        removed: [...removed],
      }, null, 2)}\n`, {
        encoding: 'utf8', mode: 0o600, flag: 'wx',
      });
      await fs.rename(temporaryConfig, this.configPath);
    } catch (error) {
      try { await fs.unlink(temporaryConfig); }
      catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') {
          throw new Error(`無法儲存本機主機設定，且暫存檔清理失敗：${cleanupError.message}`);
        }
      }
      throw error;
    }
  }

  async update(id, input) {
    const profile = this.get(id);
    if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80 ||
        typeof input.host !== 'string' || !/^[A-Za-z0-9.-]{1,253}$/.test(input.host) ||
        (input.username !== undefined && input.username !== profile.username) ||
        typeof input.siteUrl !== 'string' ||
        !/^https?:\/\/[A-Za-z0-9.-]+(?::\d{1,5})?\/?$/.test(input.siteUrl)) {
      throw new Error('主機設定格式無效；請檢查名稱、IP／網域及網站網址。Pets 部署帳號不可變更。');
    }
    const changedHost = profile.host !== input.host;
    const updated = validateProfile({
      ...profile,
      name: input.name.trim(),
      host: input.host,
      siteUrl: input.siteUrl,
      fingerprint: changedHost ? '' : profile.fingerprint,
    });
    const next = new Map(this.profiles);
    next.set(id, updated);
    await this.saveProfiles([...next.values()]);
    this.profiles = next;
    if (changedHost) await this.removeKnownHosts(id);
    return {
      id: updated.id, name: updated.name, host: updated.host, username: updated.username,
      siteUrl: updated.siteUrl, trusted: Boolean(updated.fingerprint),
    };
  }

  async removeKnownHosts(id) {
    const knownHosts = knownHostsPath(id, this.dataDirectory);
    try {
      const directory = await fs.lstat(path.dirname(knownHosts));
      if (directory.isSymbolicLink() || !directory.isDirectory()) {
        throw new Error('主機專用 known_hosts 目錄不是一般目錄；未移除信任設定。');
      }
      const stat = await fs.lstat(knownHosts);
      if (stat.isSymbolicLink() || !stat.isFile()) {
        throw new Error('主機專用 known_hosts 路徑不是一般檔案；未移除信任設定。');
      }
      await fs.unlink(knownHosts);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  async remove(id, confirmation) {
    const profile = this.get(id);
    if (confirmation !== profile.name) throw new Error('移除確認文字不符；主機設定未移除。');
    if (this.profiles.size <= 1) throw new Error('至少需保留一個 Pets 主機設定。');
    const next = new Map(this.profiles);
    next.delete(id);
    const removed = new Set(this.removed);
    removed.add(id);
    await this.saveProfiles([...next.values()], removed);
    this.profiles = next;
    this.removed = removed;
    await this.removeKnownHosts(id);
    return { id, removed: true, name: profile.name };
  }

  async restore(id) {
    if (!this.removed.has(id)) throw new Error('所選主機並非已移除設定。');
    await this.removeKnownHosts(id);
    const profile = validateProfile({ ...DEFAULTS.find((item) => item.id === id), fingerprint: '' });
    const next = new Map(this.profiles);
    next.set(id, profile);
    const removed = new Set(this.removed);
    removed.delete(id);
    await this.saveProfiles([...next.values()], removed);
    this.profiles = next;
    this.removed = removed;
    return { id, name: profile.name, restored: true };
  }

  async trust(id, suppliedFingerprint) {
    const profile = this.get(id);
    const expected = normalizeFingerprint(suppliedFingerprint);
    if (typeof this.scanHostKey !== 'function') throw new Error('目前環境不支援安全的 SSH 主機金鑰掃描。');
    const output = await this.scanHostKey(profile.host);
    const keys = String(output).split(/\r?\n/).map((line) => line.trim().split(/\s+/))
      .filter((parts) => parts.length >= 3 && parts[1] === 'ssh-ed25519');
    const matches = new Map();
    for (const [, , encodedKey] of keys) {
      try {
        if (fingerprintOf(Buffer.from(encodedKey, 'base64')) === expected) matches.set(encodedKey, encodedKey);
      } catch {
        continue;
      }
    }
    if (matches.size !== 1) {
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
    const keyLine = `${profile.hostKeyAlias} ssh-ed25519 ${[...matches.values()][0]}\n`;
    const temporaryKeyFile = `${knownHosts}.${process.pid}.${randomUUID()}.tmp`;
    await fs.writeFile(temporaryKeyFile, keyLine, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    const updated = validateProfile({ ...profile, fingerprint: expected });
    const next = new Map(this.profiles);
    next.set(id, updated);
    let profilesSaved = false;
    try {
      await this.saveProfiles([...next.values()]);
      profilesSaved = true;
      await fs.rename(temporaryKeyFile, knownHosts);
    } catch (error) {
      if (profilesSaved) {
        try {
          await this.saveProfiles([...this.profiles.values()]);
        } catch (rollbackError) {
          throw new Error(`主機指紋信任未完成，且無法還原本機主機設定：${rollbackError.message}`);
        }
      }
      try { await fs.unlink(temporaryKeyFile); }
      catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') {
          throw new Error(`主機指紋信任未完成，暫存 known_hosts 也無法清除：${cleanupError.message}`);
        }
      }
      throw error;
    }
    this.profiles = next;
    return { id, fingerprint: expected, trusted: true };
  }

  knownHostsFile(id) {
    const profile = this.get(id);
    const knownHosts = knownHostsPath(profile.id, this.dataDirectory);
    if (id === 'mvp' && !fsSync.existsSync(knownHosts) &&
        profile.fingerprint === DEFAULTS[0].fingerprint) return null;
    try {
      if (fsSync.lstatSync(knownHosts).isSymbolicLink()) {
        throw new Error('主機專用 known_hosts 路徑是符號連結；已停止 SSH 連線。');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return knownHosts;
  }
}

module.exports = {
  DEFAULT_HOST,
  DEFAULTS,
  HostRegistry,
  fingerprintOf,
  normalizeFingerprint,
};
