const fs = require('fs');
const path = require('path');
const { handleImageDownload } = require('./utils/imageHandler');

const localPath = path.join(__dirname, 'templeDataLocal.json');
const withImagesPath = path.join(__dirname, 'templeDataWithImages.json');

const run = async () => {
  console.log('Loading temple data...');
  if (!fs.existsSync(localPath)) {
    console.error('templeDataLocal.json not found!');
    process.exit(1);
  }
  
  const rawData = fs.readFileSync(localPath);
  const temples = JSON.parse(rawData);
  
  console.log(`Found ${temples.length} temples. Syncing images...`);
  
  for (let i = 0; i < temples.length; i++) {
    const t = temples[i];
    if (t.image && t.image.startsWith('http')) {
      console.log(`[${i + 1}/${temples.length}] Downloading image for ${t.templeName}: ${t.image}`);
      const localUrl = await handleImageDownload(t.templeName, t.image);
      console.log(`  -> Saved to: ${localUrl}`);
      t.image = localUrl;
    } else {
      console.log(`[${i + 1}/${temples.length}] ${t.templeName} already has local or no image.`);
    }
  }
  
  console.log('Saving updated data files...');
  fs.writeFileSync(localPath, JSON.stringify(temples, null, 2));
  fs.writeFileSync(withImagesPath, JSON.stringify(temples, null, 2));
  console.log('Sync completed successfully!');
};

run();
