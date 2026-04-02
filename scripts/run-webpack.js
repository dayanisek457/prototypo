const path = require('path');
const {spawnSync} = require('child_process');

const SILENCED_DEPRECATIONS = [
	'import',
	'global-builtin',
	'color-functions',
	'legacy-js-api',
];

process.env.SASS_SILENCE_DEPRECATIONS = process.env.SASS_SILENCE_DEPRECATIONS
	|| SILENCED_DEPRECATIONS.join(',');

const configArg = process.argv[2];

if (!configArg) {
	console.error('Missing webpack config path argument.');
	process.exit(1);
}

const webpackBin = path.resolve(__dirname, '../node_modules/webpack/bin/webpack.js');
const result = spawnSync(
	process.execPath,
	['--openssl-legacy-provider', webpackBin, '--config', configArg],
	{
		stdio: 'inherit',
		env: process.env,
	},
);

if (result.error) {
	console.error(result.error);
	process.exit(1);
}

process.exit(result.status || 0);
