import compressing from 'compressing';
import fs from 'fs';
import path from 'path';
const pump = require('pump');
interface IPackOptions {
  distDir: string;
  releaseDir: string;
  fileName: string;
}

export function pack(options: IPackOptions) {
  if (!fs.existsSync(options.distDir)) {
    throw new Error(`dist dir does not exist: ${options.distDir}`);
  }
  const hasFile = fs.readdirSync(options.distDir).some((p) => !p.match(/^\./));
  if (!hasFile) {
    throw new Error(`dist dir is empty: ${options.distDir}`);
  }
  const zipStream = new compressing.zip.Stream();
  zipStream.addEntry(options.distDir, { ignoreBase: true });
  const dest = path.join(options.releaseDir, options.fileName);
  const destStream = fs.createWriteStream(dest);
  return new Promise<void>((resolve, reject) => {
    pump(zipStream, destStream, (error: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
