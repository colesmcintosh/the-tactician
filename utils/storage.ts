import { Storage } from '@google-cloud/storage';

let storage: Storage | null = null;
let bucket: ReturnType<Storage['bucket']> | null = null;

function getStorage() {
  if (!storage) {
    const credentialsEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!credentialsEnv) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT environment variable is not set.');
    }
    const bucketName = process.env.STORAGE_BUCKET;
    if (!bucketName) {
        throw new Error('STORAGE_BUCKET environment variable is not set.');
    }

    try {
        const decodedCredentials = Buffer.from(credentialsEnv, 'base64').toString('utf-8');
        const credentials = JSON.parse(decodedCredentials);
        storage = new Storage({ credentials, projectId });
        bucket = storage.bucket(bucketName);
    } catch (error) {
        console.error("Failed to initialize Google Cloud Storage:", error);
        if (error instanceof SyntaxError) {
            console.error("Potential issue: GOOGLE_SERVICE_ACCOUNT_KEY might not be a valid Base64 encoded JSON.");
        }
        throw new Error('Failed to initialize Google Cloud Storage client.');
    }
  }
  if (!bucket) {
      throw new Error('Storage bucket could not be initialized.');
  }
  return { storage, bucket };
}

export async function getSignedUrl(filename: string) {
  const { bucket } = getStorage();
  const file = bucket.file(filename);
  
  // Get a signed URL that expires in 1 hour
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });
  
  return url;
}

export async function listFiles() {
  const { bucket } = getStorage();
  const [files] = await bucket.getFiles();
  return files.map(file => file.name);
}

// Exporting the getter function might be useful if direct access is needed elsewhere
export { getStorage };

// Remove the default export of the storage instance if it's no longer needed directly
// export default storage; 