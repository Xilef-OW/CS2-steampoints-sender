import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import SteamCommunity from 'steamcommunity';
import axios from 'axios';
import { readFile } from 'fs/promises';

const LOGIN_INTERVAL_MS = 50000; // 50 seconds
let lastLoginTime = 0;

export default class SteamPointsSender {
  constructor(config, opts = {}) {
    this.config = config;
    this.log = opts.log || console;
    this.client = opts.steamUser || new SteamUser();
    this.community = opts.community || new SteamCommunity();
    this.sharedSecret = null;
  }

  async loadMaFile(path) {
    const data = await readFile(path, 'utf-8');
    const json = JSON.parse(data);
    this.sharedSecret = json.shared_secret;
  }

  async ensureLoginInterval() {
    const now = Date.now();
    const diff = now - lastLoginTime;
    if (diff < LOGIN_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, LOGIN_INTERVAL_MS - diff));
    }
    lastLoginTime = Date.now();
  }

  async login() {
    await this.ensureLoginInterval();
    if (this.config.maFile) {
      await this.loadMaFile(this.config.maFile);
    } else {
      throw new Error('maFile is required for authentication');
    }
    const logOnOptions = {
      accountName: this.config.username,
      password: this.config.password,
    };
    if (this.sharedSecret) {
      logOnOptions.twoFactorCode = SteamTotp.generateAuthCode(this.sharedSecret);
    }
    return new Promise((resolve, reject) => {
      this.client.on('steamGuard', (domain, callback) => {
        try {
          const code = SteamTotp.generateAuthCode(this.sharedSecret);
          callback(code);
        } catch (err) {
          reject(err);
        }
      });
      this.client.on('loggedOn', () => {
        this.log.info('Logged into Steam');
        resolve();
      });
      this.client.on('error', reject);
      this.client.logOn(logOnOptions);
    });
  }

  async getPointBalance(steamId) {
    const { data } = await axios.get(
      'https://store.steampowered.com/pointssummary/ajaxgetuserpoints',
      {
        params: { steamid: steamId },
        headers: { Referer: 'https://store.steampowered.com/points/' },
        withCredentials: true,
        proxy: false,
      }
    );
    return data.points;
  }

  async giftPoints(targetId) {
    const steamId = this.client.steamID.getSteamID64();
    const balance = await this.getPointBalance(steamId);
    if (balance <= 200) {
      this.log.warn('Insufficient points to gift');
      return { ok: false, reason: 'insufficient' };
    }
    const amount = balance - 200;
    const body = new URLSearchParams({
      steamid_sender: steamId,
      steamid_receiver: targetId,
      amount: String(amount),
    });
    const { data } = await axios.post(
      'https://store.steampowered.com/points/ajaxsubmitclaim',
      body.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        withCredentials: true,
        proxy: false,
      }
    );
    if (data.success) {
      this.log.info(`Gifted ${amount} points to ${targetId}`);
      return { ok: true, amount };
    }
    this.log.error('Gifting failed', data);
    return { ok: false, reason: data.eresult };
  }

  async run() {
    await this.login();
    return this.giftPoints(this.config.target);
  }
}
