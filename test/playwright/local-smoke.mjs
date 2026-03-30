#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

async function run() {
	let chromium;

	try {
		({chromium} = await import('playwright'));
	}
	catch (error) {
		throw new Error(
			'Playwright is required to run this smoke test. Install it with "npm i -D playwright" or run with "npx playwright".',
		);
	}

	const baseUrl = process.env.PROTOTYPO_BASE_URL || 'http://127.0.0.1:3000';
	const browser = await chromium.launch({headless: true});
	const context = await browser.newContext({acceptDownloads: true});
	const page = await context.newPage();

	try {
		await page.goto(`${baseUrl}/#/dashboard`, {waitUntil: 'domcontentloaded'});
		await page.waitForSelector('.slider-controller', {timeout: 30000});

		const beforeValues = await page.evaluate(() => {
			const undoableStore = window.prototypoStores && window.prototypoStores['/undoableStore'];
			const state = undoableStore && undoableStore.head && undoableStore.head.toJS
				? undoableStore.head.toJS()
				: {};

			return JSON.stringify((state && state.controlsValues) || {});
		});

		const slider = page.locator('.slider-controller').first();
		const box = await slider.boundingBox();

		if (!box) {
			throw new Error('Could not resolve slider bounding box.');
		}

		await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, {
			steps: 8,
		});
		await page.mouse.up();

		await page.waitForFunction(
			(initial) => {
				const undoableStore = window.prototypoStores && window.prototypoStores['/undoableStore'];
				const state = undoableStore && undoableStore.head && undoableStore.head.toJS
					? undoableStore.head.toJS()
					: {};
				const current = JSON.stringify((state && state.controlsValues) || {});

				return current !== initial;
			},
			beforeValues,
			{timeout: 10000},
		);

		await page.click('#file-menu');
		const downloadPromise = page.waitForEvent('download', {timeout: 30000});

		await page.click('#export-to-merged-otf');
		const download = await downloadPromise;

		const outputDir = '/tmp/playwright-logs';
		await fs.mkdir(outputDir, {recursive: true});

		const downloadPath = path.join(
			outputDir,
			download.suggestedFilename() || 'prototypo-export.bin',
		);
		await download.saveAs(downloadPath);

		const fileBuffer = await fs.readFile(downloadPath);
		const signature = fileBuffer.subarray(0, 4).toString('latin1');
		const validSignatures = new Set(['OTTO', '\x00\x01\x00\x00', 'wOFF', 'wOF2']);

		if (!validSignatures.has(signature)) {
			throw new Error(
				`Unexpected export signature "${signature}" in ${downloadPath}.`,
			);
		}

		await page.screenshot({
			path: path.join(outputDir, 'prototypo-dashboard-smoke.png'),
			fullPage: true,
		});

		console.log(
			`PASS: slider moved, export downloaded, signature "${signature}" verified at ${downloadPath}`,
		);
	}
	finally {
		await context.close();
		await browser.close();
	}
}

run().catch((error) => {
	console.error(error.message || error);
	process.exit(1);
});
