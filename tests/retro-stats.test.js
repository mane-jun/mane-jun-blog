import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  LINE_PATTERNS, fillTemplate, parseRetroData, prefilledBody, retroPeriod, templateFromConfig,
} from '../static/admin/retro-stats.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const templateBody = async (path) => (await read(path))
  .replace(/^﻿/u, '')
  .replace(/\r\n/gu, '\n')
  .replace(/^---\n[\s\S]*?\n---\n/u, '')
  .trim();
// 22:00 KST on the given day.
const night = (date) => new Date(`${date}T13:00:00Z`);

const entries = [
  { date: '2026-09-14', condition: 3, exercise: 'O' },
  { date: '2026-09-15', condition: 4, exercise: 'X' },
  { date: '2026-09-17', condition: 0, exercise: '' },
  { date: '2026-09-20', condition: 5, exercise: 'O' },
  { date: '2026-09-21', condition: 2, exercise: 'O' }, // next week
  { date: '2026-08-02', condition: 4, exercise: 'O' },
  { date: '2026-08-30', condition: 2, exercise: 'X' },
];

describe('weekly and monthly retrospective numbers', () => {
  it('looks back on the same period as the pre-filled title', () => {
    expect(retroPeriod('weekly', night('2026-09-20'))).toEqual([
      '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20',
    ]);
    expect(retroPeriod('weekly', night('2026-09-22'))[0]).toBe('2026-09-14');
    const august = retroPeriod('monthly', night('2026-09-06'));
    expect([august.length, august[0], august.at(-1)]).toEqual([31, '2026-08-01', '2026-08-31']);
    expect(retroPeriod('monthly', night('2026-01-04'))[0]).toBe('2025-12-01');
  });

  it.each([
    ['weekly', '주간회고_양식.md'],
    ['monthly', '월간회고_양식.md'],
  ])('reads the %s template from config.yml, and every number line is still in it', async (collection, templatePath) => {
    const template = templateFromConfig(await read('static/admin/config.yml'), collection);
    expect(template.trim()).toBe(await templateBody(templatePath));
    for (const pattern of Object.values(LINE_PATTERNS[collection])) expect(template).toMatch(pattern);
  });

  it('fills the weekly numbers from that week only', async () => {
    const template = templateFromConfig(await read('static/admin/config.yml'), 'weekly');
    const body = fillTemplate('weekly', template, entries, retroPeriod('weekly', night('2026-09-20')));

    expect(body).toContain('- 회고 쓴 날: 4/7\n');
    expect(body).toContain('- 운동한 날: 2/7\n');
    expect(body).toContain('- 컨디션: 월 3  화 4  수 -  목 -  금 -  토 -  일 5  (평균 4.0)\n');
    expect(body).toContain('## 지난주 목표 점검'); // the rest of the template is kept
  });

  it('fills the monthly numbers with weeks of days 1–7, 8–14, …', async () => {
    const template = templateFromConfig(await read('static/admin/config.yml'), 'monthly');
    const body = fillTemplate('monthly', template, entries, retroPeriod('monthly', night('2026-09-06')));

    expect(body).toContain('- 회고 쓴 날: 2/31   · 운동한 날: 1/31\n');
    expect(body).toContain('- 주별 평균 컨디션: 1주 4.0  2주 -  3주 -  4주 -  5주 2.0\n');
  });

  it('reads the daily data from the (minified) retro page and gives up when it is missing', async () => {
    const html = '<p>x</p><script id=retro-data type=application/json>[{"date":"2026-09-20","condition":5,"exercise":"O"}]</script>';
    expect(parseRetroData(html)).toEqual([{ date: '2026-09-20', condition: 5, exercise: 'O' }]);
    expect(parseRetroData('<p>no data</p>')).toBeNull();

    const config = await read('static/admin/config.yml');
    const fetchText = async (url) => (url === 'config.yml' ? config : html);
    expect(await prefilledBody('weekly', night('2026-09-20'), fetchText)).toContain('- 회고 쓴 날: 1/7');
    expect(await prefilledBody('daily', night('2026-09-20'), fetchText)).toBeNull();
    expect(await prefilledBody('weekly', night('2026-09-20'), async () => '')).toBeNull();
  });

  it('keeps the retro page data block the helper reads', async () => {
    expect(await read('layouts/retro.html')).toContain('<script id="retro-data" type="application/json">');
  });
});
