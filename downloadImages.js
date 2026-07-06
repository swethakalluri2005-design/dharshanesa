const fs = require('fs');
const https = require('https');
const path = require('path');

const inputData = require('./templeDataWithImages.json');
const outputDir = path.join(__dirname, '../frontend/public/temples');
const fallbackUrl = 'https://images.unsplash.com/photo-1548013146-72479768bbaa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const fetchWikiImageByPlace = (searchTitle) => {
  return new Promise((resolve) => {
    // Just grab the first word before comma if city, state
    const cleanSearch = searchTitle.split(',')[0].trim();
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cleanSearch)}&prop=pageimages&format=json&pithumbsize=1000`;
    const options = { headers: { 'User-Agent': 'DarshanEaseBot/1.0 (amars@example.com)' } };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const pages = json.query.pages;
          const pageId = Object.keys(pages)[0];
          if (pageId && pages[pageId].thumbnail && pages[pageId].thumbnail.source) {
            resolve(pages[pageId].thumbnail.source);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
};

const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const options = { headers: { 'User-Agent': 'DarshanEaseBot/1.0 (amars@example.com)' } };
    https.get(url, options, (res) => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(filepath);
        res.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else if (res.statusCode === 301 || res.statusCode === 302) {
        // follow redirect
        https.get(res.headers.location, options, (redirectRes) => {
           const file = fs.createWriteStream(filepath);
           redirectRes.pipe(file);
           file.on('finish', () => file.close(resolve));
        }).on('error', reject);
      } else {
        reject(new Error(`Failed to download image, status code: ${res.statusCode}`));
      }
    }).on('error', reject);
  });
};

const run = async () => {
  const finalData = [];
  
  for (let t of inputData) {
    let imageUrl = t.image;
    
    // If it's the broken fallback, fetch by place name!
    if (imageUrl === fallbackUrl) {
      console.log(`${t.templeName} has empty image. Fetching by place name: ${t.location}`);
      const newUrl = await fetchWikiImageByPlace(t.location);
      if (newUrl) {
         imageUrl = newUrl;
         console.log(`Found place image: ${newUrl}`);
      } else {
         // Still nothing? We will generate an empty placeholder using UI Avatars so it doesn't break.
         imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.location)}&background=random&size=512`;
         console.log(`Using fallback avatar for: ${t.location}`);
      }
    }

    const filename = `${slugify(t.templeName)}-${Date.now()}.jpg`;
    const filepath = path.join(outputDir, filename);
    
    try {
        console.log(`Downloading ${imageUrl} to ${filename}...`);
        await downloadImage(imageUrl, filepath);
        
        t.image = `/temples/${filename}`;
    } catch (err) {
        console.error(`Failed to download for ${t.templeName}: ${err.message}`);
        // Keep fallback if download fails
        t.image = imageUrl.startsWith('http') ? imageUrl : `/temples/${filename}`;
    }
    
    finalData.push(t);
  }
  
  fs.writeFileSync(path.join(__dirname, 'templeDataLocal.json'), JSON.stringify(finalData, null, 2));
  console.log('Finished downloading all images and created templeDataLocal.json!');
};

run();
