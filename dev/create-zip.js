import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

async function createZip() {
  try {
    const manifestPath = './ext/manifest.json';
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const version = manifest.version;

    const zipName = `reyohoho_twitch_${version}.zip`;
    const buildDir = './build';

    console.log(`Creating ${zipName} from ${buildDir}...`);

    const output = fs.createWriteStream(zipName);
    const archive = archiver('zip', {
      zlib: {level: 9},
    });

    output.on('close', function () {
      console.log(`Successfully created ${zipName} (${archive.pointer()} total bytes)`);
    });

    output.on('end', function () {
      console.log('Data has been drained');
    });

    archive.on('warning', function (err) {
      if (err.code === 'ENOENT') {
        console.warn('Warning:', err);
      } else {
        throw err;
      }
    });

    archive.on('error', function (err) {
      throw err;
    });

    archive.pipe(output);

    archive.directory(buildDir, false);

    await archive.finalize();
  } catch (error) {
    console.error('Error creating zip:', error.message);
    process.exit(1);
  }
}

createZip();
