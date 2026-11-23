/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const { dependencies } = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const packageLock = JSON.parse(fs.readFileSync('./package-lock.json', 'utf8'));

const dropinsDir = path.join('scripts', '__dropins__');
if (fs.existsSync(dropinsDir)) fs.rmSync(dropinsDir, { recursive: true });
fs.mkdirSync(dropinsDir, { recursive: true });

const dropins = fs.readdirSync('node_modules/@dropins', { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && dependencies[`@dropins/${entry.name}`]);

// A version mismatch means node_modules is stale and copying would ship wrong code.
const mismatches = dropins.map(({ name }) => {
  const pkgName = `@dropins/${name}`;
  const { version } = JSON.parse(fs.readFileSync(path.join('node_modules', pkgName, 'package.json'), 'utf8'));
  const expected = packageLock.packages[`node_modules/${pkgName}`]?.version;
  return expected && expected !== version ? `${pkgName}: installed ${version}, expected ${expected}` : null;
}).filter(Boolean);

if (mismatches.length) {
  console.error(`Drop-in version mismatch:\n  ${mismatches.join('\n  ')}\nRun "rm -rf node_modules && npm install".`);
  process.exit(1);
}

dropins.forEach(({ name }) => {
  fs.cpSync(path.join('node_modules', '@dropins', name), path.join(dropinsDir, name), {
    recursive: true,
    filter: (src) => !src.endsWith('package.json'),
  });
});

fs.mkdirSync(path.join('scripts', 'acdl'), { recursive: true });
fs.copyFileSync(
  path.join('node_modules', '@adobe/adobe-client-data-layer/dist/adobe-client-data-layer.min.js'),
  path.join('scripts', 'acdl', 'adobe-client-data-layer.min.js'),
);

console.info('Drop-ins installed to scripts/__dropins__');
