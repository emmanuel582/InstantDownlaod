const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [16, 32, 48, 128];
const svgPath = path.join(__dirname, 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
    for (const size of sizes) {
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(path.join(__dirname, `icon${size}.png`));
        console.log(`Generated ${size}x${size} icon`);
    }
}

generateIcons().catch(console.error); 