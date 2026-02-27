import { fork } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pack } from './utils/pack';

(async () => {
  const releaseDir = path.join(__dirname, '../release');
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir);
  }
  await build();
  verifyChromeDist(path.join(__dirname, '../dist/chrome'));
  await pack({
    releaseDir,
    distDir: path.join(__dirname, '../dist/chrome'),
    fileName: 'web-clipper-chrome.zip',
  });
  await pack({
    releaseDir,
    distDir: path.join(__dirname, '../dist'),
    fileName: 'web-clipper-firefox.zip',
  });
  const manifestConfig = path.join(__dirname, '../dist/manifest.json');
  const content = fs.readFileSync(manifestConfig, 'utf-8');
  const manifest = JSON.parse(content);
  manifest.browser_specific_settings = {
    gecko: {
      id: '{3fbb1f97-0acf-49a0-8348-36e91bef22ea}',
    },
  };
  manifest.name = 'Universal Web Clipper';
  fs.writeFileSync(manifestConfig, JSON.stringify(manifest, null, 2));
  await pack({
    releaseDir,
    distDir: path.join(__dirname, '../dist'),
    fileName: 'web-clipper-firefox-store.zip',
  });
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function build() {
  const buildScript = require.resolve('./build');
  const buildEnv = Object.create(process.env);
  buildEnv.NODE_ENV = 'production';
  const cp = fork(buildScript, [], {
    env: buildEnv as unknown as typeof process.env,
    stdio: 'inherit',
  });
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const handleResolve = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };
    const handleReject = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };
    cp.on('message', (message: any) => {
      if (message?.type === 'Success') {
        handleResolve();
        return;
      }
      if (message?.type === 'Error') {
        handleReject(new Error(message.error || 'Build failed.'));
      }
    });
    cp.on('error', (error) => {
      handleReject(error);
    });
    cp.on('exit', (code) => {
      if (settled) {
        return;
      }
      if (code === 0) {
        handleResolve();
        return;
      }
      handleReject(new Error(`Build process exited with code ${code}.`));
    });
  });
}

function verifyChromeDist(chromeDistPath: string) {
  const requiredFiles = ['manifest.json', 'background.js', 'content_script.js', 'tool.html'];
  const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(chromeDistPath, file)));
  if (!missing.length) {
    return;
  }
  const existing = fs.existsSync(chromeDistPath) ? fs.readdirSync(chromeDistPath) : [];
  throw new Error(
    `Invalid chrome build output. Missing files: ${missing.join(', ')}. Existing: ${existing.join(', ')}`
  );
}
