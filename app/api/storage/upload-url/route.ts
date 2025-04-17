import { getStorage } from '@/utils/storage';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');
  const contentType = searchParams.get('contentType');

  if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }
  if (!contentType) {
    return NextResponse.json({ error: 'Content type is required' }, { status: 400 });
  }

  try {
    const { bucket } = getStorage(); // Initialize storage lazily
    const file = bucket.file(filename);

    // Define options for the signed URL for write (no extensionHeaders)
    const options = {
      version: 'v4' as const,
      action: 'write' as const,
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes expiration
      contentType: contentType,
    };

    // Generate the signed URL for writing
    const [signedUrl] = await file.getSignedUrl(options);

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error('Error getting signed upload URL:', error);
    // Check if the error is due to initialization failure
    if (error instanceof Error && error.message.includes('initialize')) {
       return NextResponse.json({ error: 'Failed to initialize storage client. Check server logs and environment variables.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to get signed upload URL' }, { status: 500 });
  }
} 