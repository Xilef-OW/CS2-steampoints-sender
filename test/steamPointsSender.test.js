import nock from 'nock';
import { jest } from '@jest/globals';
import SteamPointsSender from '../src/steamPointsSender.js';

const mockLog = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

describe('SteamPointsSender gifting', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  test('gifts balance minus 200 points', async () => {
    const client = { steamID: { getSteamID64: () => '111' } };
    const sender = new SteamPointsSender({}, { log: mockLog, steamUser: client });

    nock('https://store.steampowered.com')
      .get('/pointssummary/ajaxgetuserpoints')
      .query({ steamid: '111' })
      .reply(200, { points: 1000 });

    nock('https://store.steampowered.com')
      .post('/points/ajaxsubmitclaim', body => {
        return body.amount === '800' && body.steamid_receiver === '222';
      })
      .reply(200, { success: true });

    const res = await sender.giftPoints('222');
    expect(res).toEqual({ ok: true, amount: 800 });
  });

  test('insufficient points', async () => {
    const client = { steamID: { getSteamID64: () => '111' } };
    const sender = new SteamPointsSender({}, { log: mockLog, steamUser: client });

    nock('https://store.steampowered.com')
      .get('/pointssummary/ajaxgetuserpoints')
      .query({ steamid: '111' })
      .reply(200, { points: 150 });

    const res = await sender.giftPoints('222');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('insufficient');
  });
});
