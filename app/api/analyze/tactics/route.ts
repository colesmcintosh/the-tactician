import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, FunctionDeclarationSchema, FunctionDeclaration, Part, FunctionCallingMode } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { NextResponse } from 'next/server';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';
import { getStorage } from '@/utils/storage';

const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!API_KEY) {
  throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const fileManager = new GoogleAIFileManager(API_KEY);

// Define the Zod schema for the desired output structure
const TacticalReportSchema = z.object({
  overallSummary: z.string().describe("A concise overall summary of the tactical situation observed in the footage."),
  formationAnalysis: z.string().describe("Analysis of the team formations, including strengths and weaknesses."),
  keyTacticalMoments: z.array(z.object({
    timestamp: z.string().optional().describe("Approximate timestamp (e.g., MM:SS) of the moment, if discernible."),
    description: z.string().describe("Detailed description of the specific tactical moment (e.g., a specific press, counter-attack, defensive shape, individual brilliance).")
  })).describe("A list of 3-5 key tactical moments or patterns observed."),
  playerHighlights: z.array(z.object({
    playerName: z.string().optional().describe("Name of the player involved, if identifiable."),
    highlight: z.string().describe("Description of a notable individual action or contribution.")
  })).optional().describe("Highlights of standout individual player performances or errors (optional)."),
  suggestedImprovements: z.array(z.string()).optional().describe("Areas where tactical improvements could be made (optional).")
});

// Manually construct the schema object, then cast
const tacticalReportSchemaObject = {
  type: "object", 
  properties: {
    overallSummary: {
      type: "string", 
      description: "A concise overall summary of the tactical situation observed in the footage."
    },
    formationAnalysis: {
      type: "string",
      description: "Analysis of the team formations, including strengths and weaknesses."
    },
    keyTacticalMoments: {
      type: "array",
      description: "A list of 3-5 key tactical moments or patterns observed.",
      items: { // Schema for items in the array
        type: "object",
        properties: {
          timestamp: { 
            type: "string",
            description: "Approximate timestamp (e.g., MM:SS) of the moment, if discernible."
          },
          description: { 
            type: "string",
            description: "Detailed description of the specific tactical moment (e.g., a specific press, counter-attack, defensive shape, individual brilliance)."
          }
        },
        required: ["description"] // Timestamp is optional
      }
    },
    playerHighlights: {
      type: "array",
      description: "Highlights of standout individual player performances or errors (optional).",
      items: { // Schema for items in the array
        type: "object",
        properties: {
          playerName: { 
            type: "string",
            description: "Name of the player involved, if identifiable."
           },
          highlight: { 
            type: "string",
            description: "Description of a notable individual action or contribution."
          }
        },
        required: ["highlight"] // Player name is optional
      }
    },
    suggestedImprovements: {
      type: "array",
      description: "Areas where tactical improvements could be made (optional).",
      items: { type: "string" } // For arrays of primitives
    }
  },
  required: ["overallSummary", "formationAnalysis", "keyTacticalMoments"]
};

// Cast the manually constructed object to FunctionDeclarationSchema
const TacticalReportToolSchema: FunctionDeclarationSchema = tacticalReportSchemaObject as any;

// Use the casted schema
const TacticalReportTool: FunctionDeclaration = {
  name: "saveTacticalReport",
  description: "Saves the extracted tactical analysis report.",
  parameters: TacticalReportToolSchema
};

// Define Input Type
interface AnalysisRequestBody {
  filename?: string; // GCS filename for user uploads
  presetUrl?: string; // URL for preset videos
}

// Helper: Upload from URL
async function uploadVideoFromUrl(url: string, displayName: string) {
    console.log(`Fetching video from preset URL: ${displayName}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch preset video from ${url}: ${response.statusText}`);
    }
    const contentType = response.headers.get('content-type') || 'video/mp4'; // Default or detect
    const fileBuffer = Buffer.from(await response.arrayBuffer());
    
    console.log(`Uploading fetched preset video: ${displayName} (${contentType})`);
    return fileManager.uploadFile(fileBuffer, { 
        mimeType: contentType,
        displayName: displayName // Use a meaningful name
    });
}

// Main POST Handler
export async function POST(req: Request) {
  let fileIdentifier: string | null = null; // Track the file name/ID for cleanup
  let uploadedFileMetadata: any = null;

  try {
    // 1. Parse JSON body instead of FormData
    const body: AnalysisRequestBody = await req.json();
    const { filename, presetUrl } = body;

    if (!filename && !presetUrl) {
      return NextResponse.json({ error: 'Either filename or presetUrl is required in the request body' }, { status: 400 });
    }

    // 2. Get or Upload File to AI File Manager
    if (filename) {
      // User uploaded file: download from GCS bucket and upload to AI File Manager
      console.log(`Downloading video from GCS for analysis: ${filename}`);
      const { bucket } = getStorage();
      const gcsFile = bucket.file(filename);

      // Enforce maximum file size of 20MB
      const [fileMeta] = await gcsFile.getMetadata();
      const sizeBytes = parseInt(fileMeta.size?.toString() ?? '0', 10);
      if (sizeBytes > 20 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large. Max size is 20MB.' }, { status: 413 });
      }
      // Download file buffer and metadata
      const [fileBuffer] = await gcsFile.download();
      const [metadata] = await gcsFile.getMetadata();
      const contentType = metadata.contentType || 'video/mp4';
      console.log(`Uploading user file to AI File Manager: ${filename} (${contentType})`);
      const uploadResult = await fileManager.uploadFile(fileBuffer, { mimeType: contentType, displayName: filename });
      uploadedFileMetadata = uploadResult.file;
      fileIdentifier = uploadedFileMetadata.name;
      console.log(`Uploaded user file to AI File Manager: ${fileIdentifier}, initial state: ${uploadedFileMetadata.state}`);
    } else if (presetUrl) {
      // Preset video: Fetch from URL and upload to AI File Manager
      // Extract a display name from the URL or generate one
      const presetDisplayName = presetUrl.substring(presetUrl.lastIndexOf('/') + 1).split('?')[0] || `preset-${Date.now()}`;
      const uploadResult = await uploadVideoFromUrl(presetUrl, presetDisplayName);
      uploadedFileMetadata = uploadResult.file;
      fileIdentifier = uploadedFileMetadata.name; // Use the File API name for cleanup
      console.log(`Preset upload initiated: ${fileIdentifier}, waiting for ACTIVE state...`);
    }
    
    if (!uploadedFileMetadata) {
        throw new Error("Could not obtain file metadata for analysis.");
    }

    // 3. Wait for file processing with better error handling
    let safetyCounter = 0;
    const maxWaitSeconds = 300; // 5 minutes max wait time
    const checkInterval = 2000; // Check every 2 seconds
    
    while (safetyCounter < maxWaitSeconds) {
      if (uploadedFileMetadata.state === FileState.ACTIVE) {
        console.log(`File is now ACTIVE after ${safetyCounter}s: ${uploadedFileMetadata.displayName}`);
        break;
      }
      
      if (uploadedFileMetadata.state === FileState.FAILED) {
        throw new Error(`File processing failed for ${uploadedFileMetadata.displayName}`);
      }

      if (uploadedFileMetadata.state === FileState.PROCESSING) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        uploadedFileMetadata = await fileManager.getFile(fileIdentifier as string);
        console.log(`File state: ${uploadedFileMetadata.state} (waited ${safetyCounter * 2}s)`);
        safetyCounter += 2;
        continue;
      }

      throw new Error(`Unexpected file state: ${uploadedFileMetadata.state}`);
    }

    if (uploadedFileMetadata.state !== FileState.ACTIVE) {
      throw new Error(`File processing timed out after ${maxWaitSeconds} seconds. Current state: ${uploadedFileMetadata.state}`);
    }

    console.log(`File is ACTIVE: ${uploadedFileMetadata.displayName}. Generating content...`);

    // 4. Prepare for Generative Model (Common Logic)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const systemInstruction: Part = {
      text: "You are a world-class soccer tactical analyst. Analyze the provided video footage and generate a detailed tactical report. Focus on formations, key moments, player actions, and potential improvements. Respond using the provided tool."
    };
    
    const videoPart: Part = {
      fileData: {
        mimeType: uploadedFileMetadata.mimeType,
        fileUri: uploadedFileMetadata.uri,
      },
    };

    const prompt = "Analyze the tactics in this soccer footage and provide a structured report.";

    // 5. Generate Content using the Tool (Common Logic)
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [videoPart, { text: prompt }] }],
      systemInstruction: systemInstruction,
      tools: [{ functionDeclarations: [TacticalReportTool] }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY,
          allowedFunctionNames: ["saveTacticalReport"]
        }
      }
    });

    const response = result.response;
    const functionCalls = response.functionCalls();

    // 6. Process and Validate Response (Common Logic)
    if (functionCalls && functionCalls.length > 0 && functionCalls[0].name === 'saveTacticalReport') {
      const reportArgs = functionCalls[0].args;
      console.log("Function call 'saveTacticalReport' received... Validating...");
      try {
        const validatedReport = TacticalReportSchema.parse(reportArgs);
        console.log("Report generated and validated successfully.");
        return NextResponse.json(validatedReport);
      } catch (validationError: any) {
        console.error("Schema validation failed:", validationError.errors);
        console.error("Received Args:", JSON.stringify(reportArgs, null, 2)); 
        return NextResponse.json({ error: "Failed to generate report in the correct format.", details: validationError.errors }, { status: 500 });
      }
    } else {
      const responseText = response.text(); 
      console.error("LLM did not return expected function call. Text Response:", responseText); 
      return NextResponse.json({ error: "Failed to extract structured report.", details: `Model returned text: ${responseText}` }, { status: 500 });
    }

  } catch (error: any) {
    // 7. Error Handling (Common Logic, adjusted message)
    console.error('Error during tactical analysis:', error);
    let errorDetails = "An unknown error occurred during analysis";
    let statusCode = 500;

    if (error.message?.includes('File processing failed or timed out')) {
        errorDetails = error.message;
        statusCode = 504; // Gateway Timeout
    } else if (error.message?.includes('fetch preset video')) {
        errorDetails = `Failed to retrieve preset video: ${error.message}`;
        statusCode = 502; // Bad Gateway 
    } else if (error.message?.includes('getFile')) {
        errorDetails = `Failed to retrieve uploaded file metadata: ${error.message}`;
        // Check if it's a 404-like error from the file manager
        if (error.message?.includes('404') || error.message?.toLowerCase().includes('not found')) {
            statusCode = 404;
            errorDetails = `Uploaded file not found (${fileIdentifier}). It might have expired or been deleted.`;
        } else {
             statusCode = 500;
        }
    } else if (error.errorDetails) { // GoogleGenerativeAIError
        errorDetails = error.errorDetails;
    } else if (error instanceof Error) {
        errorDetails = error.message;
    }

    console.error(`Sending error response (Status ${statusCode}):`, errorDetails);
    return NextResponse.json({ error: 'Analysis failed', details: errorDetails }, { status: statusCode });

  } finally {
    // 8. Cleanup (Common Logic)
    if (fileIdentifier) { // Use the tracked identifier
       try {
         console.log(`Attempting final deletion of file: ${fileIdentifier}`);
         await fileManager.deleteFile(fileIdentifier); 
         console.log(`Deleted file ${fileIdentifier} in finally block.`);
       } catch (cleanupError: any) {
         if (!cleanupError.message?.includes('404')) { // Don't log if already deleted
            console.error(`Error deleting file ${fileIdentifier} in finally block:`, cleanupError);
         }
       }
    }
  }
}

// Keep the exported type
export type HighlightAnalysisReport = z.infer<typeof TacticalReportSchema>; 