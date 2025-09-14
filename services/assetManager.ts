import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

// Define your PDF assets here. The key is the final filename,
// and the value is the require() path.
const pdfAssets = {
  'flood_en.pdf': require('@/assets/guidelines/pdfs/flood_en.pdf'),
  'flood_ur.pdf': require('@/assets/guidelines/pdfs/flood_ur.pdf'),
  'earthquake.pdf': require('@/assets/guidelines/pdfs/earthquake.pdf'),
  'smog.pdf': require('@/assets/guidelines/pdfs/smog.pdf'),
};

export async function setupPdfAssets() {
  console.log('Setting up PDF assets...');
  for (const filename in pdfAssets) {
    try {
      const destinationUri = `${FileSystem.documentDirectory}${filename}`;
      
      // Check if the file already exists to avoid re-copying
      const fileInfo = await FileSystem.getInfoAsync(destinationUri);
      
      if (fileInfo.exists) {
        console.log(`Asset '${filename}' already exists. Skipping.`);
        continue;
      }

      // If it doesn't exist, copy it
      const asset = Asset.fromModule(pdfAssets[filename as keyof typeof pdfAssets]);
      await asset.downloadAsync(); // Makes sure the asset is available locally
      
      if (asset.localUri) {
        await FileSystem.copyAsync({
          from: asset.localUri,
          to: destinationUri,
        });
        console.log(`Successfully copied '${filename}' to document directory.`);
      }
    } catch (error) {
      console.error(`Error caching asset '${filename}':`, error);
    }
  }
}