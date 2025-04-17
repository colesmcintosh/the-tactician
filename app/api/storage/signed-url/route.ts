import { getSignedUrl } from '@/utils/storage';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }

  try {
    const signedUrl = await getSignedUrl(filename);
    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return NextResponse.json({ error: 'Failed to get signed URL' }, { status: 500 });
  }
} 