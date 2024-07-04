const { test, expect } = require('@playwright/test');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs').promises;

// Function to find partial image by manual pixel comparison
async function findPartialImage(screenshotPath, partialImagePath, threshold = 0.1) {
  const screenshot = await sharp(screenshotPath).toBuffer();
  const partialImage = await sharp(partialImagePath).toBuffer();

  const screenshotMetadata = await sharp(screenshotPath).metadata();
  const partialImageMetadata = await sharp(partialImagePath).metadata();

  const screenWidth = screenshotMetadata.width;
  const screenHeight = screenshotMetadata.height;
  const partialImageWidth = partialImageMetadata.width;
  const partialImageHeight = partialImageMetadata.height;

  const screenshotPixels = await screenshot;
  const partialImagePixels = await partialImage;

  // Loop through each pixel in the screenshot to find partial image
  for (let y = 0; y <= screenHeight - partialImageHeight; y++) {
    for (let x = 0; x <= screenWidth - partialImageWidth; x++) {
      let mismatchedPixels = 0;

      // Compare pixels in the current area
      for (let py = 0; py < partialImageHeight; py++) {
        for (let px = 0; px < partialImageWidth; px++) {
          const screenshotIndex = ((y + py) * screenWidth + (x + px)) * 4;
          const partialIndex = (py * partialImageWidth + px) * 4;

          // Compare RGBA values
          for (let i = 0; i < 4; i++) {
            const diff = Math.abs(screenshotPixels[screenshotIndex + i] - partialImagePixels[partialIndex + i]);
            if (diff > 255 * threshold) {
              mismatchedPixels++;
              break;
            }
          }
        }
      }

      // Check if the mismatched pixels are below the threshold
      const mismatchPercentage = (mismatchedPixels / (partialImageWidth * partialImageHeight)) * 100;
      if (mismatchPercentage <= threshold * 100) {
        console.log(`Partial image found at (${x}, ${y}) with ${mismatchPercentage.toFixed(2)}% mismatch.`);
        return true;
      }
    }
  }

  console.log('Partial image not found.');
  return false;
}

test('Find Partial Image in Screenshot', async ({ page }) => {
  // Serve the local HTML file
  const filePath = 'file://' + path.resolve('html/index.html');
  console.log('Navigating to:', filePath);
  await page.goto(filePath);

  // Take the screenshot
  const screenshotPath = 'screenshot.png';
  await page.screenshot({ path: screenshotPath });

  const partialImagePath = 'html/image-to-find.png';
  const partialImageFound = await findPartialImage(screenshotPath, partialImagePath, 0.1); // Adjust threshold as needed

  expect(partialImageFound).toBeTruthy();
});
