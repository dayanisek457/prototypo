const path = require('path');
const http = require('http');
const fs = require('fs');

const port = Number(process.env.PORT || 3000);
const root = path.resolve(__dirname, '../dist');

const mimeTypes = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.otf': 'font/otf',
	'.map': 'application/json; charset=utf-8',
};

function sendFile(filePath, res) {
	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.statusCode = 404;
			res.end('Not found');
			return;
		}
		const ext = path.extname(filePath).toLowerCase();
		res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
		res.statusCode = 200;
		res.end(data);
	});
}

function resolvePath(urlPath) {
	const cleaned = decodeURIComponent((urlPath || '/').split('?')[0].split('#')[0]);
	const normalized = cleaned === '/' ? '/index.html' : cleaned;
	const absolute = path.resolve(root, `.${normalized}`);
	const hasFileExtension = path.extname(normalized) !== '';

	if (!absolute.startsWith(root)) {
		return null;
	}

	if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
		return absolute;
	}

	if (
		fs.existsSync(absolute) &&
		fs.statSync(absolute).isDirectory() &&
		fs.existsSync(path.join(absolute, 'index.html'))
	) {
		return path.join(absolute, 'index.html');
	}

	if (hasFileExtension) {
		return null;
	}

	return path.join(root, 'index.html');
}

const server = http.createServer((req, res) => {
	const filePath = resolvePath(req.url);

	if (!filePath) {
		res.statusCode = 400;
		res.end('Bad request');
		return;
	}

	sendFile(filePath, res);
});

server.listen(port, () => {
	console.log(`Serving ${root} on http://127.0.0.1:${port}`);
});
