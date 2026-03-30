const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const fs = require('fs');

const base = require('./base.config');

module.exports = merge(base, {
	cache: true,
	devtool: 'cheap-module-source-map',
	entry: {
		index: [
			'whatwg-fetch',
		],
	},
	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				loaders: ['babel-loader?cacheDirectory', 'if-loader'],
				exclude: /node_modules/,
				include: [path.join(__dirname, 'app')],
			},
		],
	},
	plugins: [
		...(fs.existsSync(path.resolve(__dirname, './dist/dll/libs-manifest.json'))
			? [
				new webpack.DllReferencePlugin({
					context: __dirname,
					manifest: require('./dist/dll/libs-manifest.json'),
					sourceType: 'this',
				}),
			]
			: []),
		new webpack.DefinePlugin({
			'process.env': {
				TESTING_FONT: JSON.stringify('yes'),
				MERGE: JSON.stringify(process.env.MERGE),
			},
		}),
	],
	output: merge(base.output, {
		filename: '[name].bundle.js',
		chunkFilename: '[name].bundle.js',
		path: path.resolve(__dirname, 'dist'),
	}),
});
