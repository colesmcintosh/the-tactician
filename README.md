# Soccer Tactical Analysis AI

An advanced soccer tactical analysis tool powered by Google's Gemini 2.0 Flash AI model. This application automatically analyzes soccer footage and generates detailed tactical reports, including formation analysis, key moments, and player highlights.

## Features

- 🎥 Video Analysis: Upload your own soccer footage or use preset videos
- 📊 Comprehensive Reports: Get detailed tactical breakdowns including:
  - Overall tactical situation summary
  - Formation analysis with strengths and weaknesses
  - Key tactical moments with timestamps
  - Individual player highlights
  - Suggested tactical improvements
- 🚀 Powered by Google's Gemini 2.0 Flash AI
- 💾 Google Cloud Storage integration for file handling
- ⚡ Built with Next.js 14 and TypeScript

## Getting Started

### Prerequisites

1. Node.js 18.17 or later
2. PNPM package manager
3. Google Cloud credentials:
   - Google Generative AI API key
   - Google Cloud Storage credentials

### Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_PRIVATE_KEY=your_private_key
GOOGLE_CLOUD_CLIENT_EMAIL=your_client_email
```

### Installation

```bash
# Install dependencies
pnpm install

# Run the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

1. Upload a soccer video file (max 20MB) or select a preset video
2. Wait for the AI analysis to complete
3. View the comprehensive tactical report including:
   - Formation analysis
   - Key tactical moments
   - Player highlights
   - Suggested improvements

## Technical Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **AI**: Google Gemini 2.0 Flash
- **Storage**: Google Cloud Storage
- **API**: Next.js API Routes

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
