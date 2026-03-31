const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const ensureExists = (targetPath, type) => {
	if (!fs.existsSync(targetPath)) {
		throw new Error(`Missing ${type}: ${targetPath}`);
	}
};

const copyFile = (from, to) => {
	ensureExists(from, 'source file');
	fs.mkdirSync(path.dirname(to), {recursive: true});
	fs.copyFileSync(from, to);
};

const copyDir = (from, to) => {
	ensureExists(from, 'source directory');
	fs.mkdirSync(path.dirname(to), {recursive: true});
	fs.cpSync(from, to, {recursive: true, force: true, errorOnExist: false});
};

copyFile(
path.join(root, 'node_modules/john-fell.ptf/dist/font.json'),
path.join(root, 'dist/templates/john-fell.ptf/font.json'),
);
copyFile(
path.join(root, 'node_modules/venus.ptf/dist/font.json'),
path.join(root, 'dist/templates/venus.ptf/font.json'),
);
copyFile(
path.join(root, 'node_modules/elzevir.ptf/dist/font.json'),
path.join(root, 'dist/templates/elzevir.ptf/font.json'),
);
copyFile(
path.join(root, 'node_modules/gfnt.ptf/dist/font.json'),
path.join(root, 'dist/templates/gfnt.ptf/font.json'),
);
copyFile(
path.join(root, 'node_modules/antique.ptf/dist/font.json'),
path.join(root, 'dist/templates/antique.ptf/font.json'),
);

copyDir(path.join(root, 'app/images'), path.join(root, 'dist/assets/images'));
copyDir(path.join(root, 'app/fonts'), path.join(root, 'dist/assets/fonts'));
copyDir(
path.join(root, 'node_modules/tutorial-content/content'),
path.join(root, 'dist/assets/images/academy/courses'),
);

copyFile(path.join(root, 'app/index.html'), path.join(root, 'dist/index.html'));
copyFile(path.join(root, 'app/iframe.html'), path.join(root, 'dist/iframe.html'));
copyFile(path.join(root, 'app/robots.txt'), path.join(root, 'dist/robots.txt'));
copyFile(path.join(root, 'app/404.html'), path.join(root, 'dist/404.html'));
