'use client';

import {
  DocumentTextIcon,
  UserGroupIcon,
  ListBulletIcon,
  UserCircleIcon,
  LightBulbIcon,
  VideoCameraIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
// import styles from './markdown-styles.module.css';

// Import the structured report type from the API route definition
import { HighlightAnalysisReport } from '../api/analyze/tactics/route';

// Update Props Interface
interface TacticalReportDisplayProps {
  reportData: HighlightAnalysisReport | null;
  isLoading?: boolean;
  error?: string;
  videoUrl?: string;
}

// Loading messages for the spinner
const loadingMessages = [
  "Scanning highlight clips...",
  "Identifying key actions...",
  "Analyzing individual skills...",
  "Pinpointing notable moments...",
  "Extracting coaching points...",
  "Generating clip insights..."
];

const LoadingSpinner = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2500); 

    return () => clearInterval(intervalId);
  }, []);

  // Animation variants for framer-motion
  const dotVariants = {
    initial: { scale: 1, opacity: 0.6 },
    animate: (i: number) => ({
      scale: [1, 1.3, 1],
      opacity: [0.6, 1, 0.6],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        delay: i * 0.25,
        ease: 'easeInOut',
      },
    }),
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <div className="flex flex-row items-center justify-center space-x-3 mb-2 pb-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-3 w-3 rounded-full"
            style={{ background: 'var(--primary)' }}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            custom={i}
          />
        ))}
      </div>
      <p className="text-sm text-gray-600 animate-pulse text-center min-h-[1.5em]">
        {loadingMessages[currentMessageIndex]}
      </p>
    </div>
  );
};

export default function TacticalReportDisplay({ 
  reportData, 
  isLoading = false,
  error,
  videoUrl,
}: TacticalReportDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center max-w-2xl mx-auto my-8">
        <ExclamationTriangleIcon className="h-5 w-5 mr-3 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-10 text-gray-500 max-w-2xl mx-auto my-8">
        No analysis data available.
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 bg-white rounded-lg shadow-md">
      {/* Video Player Section */}
      {videoUrl && (
        <div className="mb-8">
          <div className="aspect-video w-full rounded-md overflow-hidden border border-gray-200">
            <video
              src={videoUrl}
              controls
              className="w-full h-full object-contain bg-black"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {/* Analysis Content */}
      <div className="space-y-8">
        {/* Overall Summary */}
        {reportData.overallSummary && (
          <section>
            <h2 className="text-xl font-semibold mb-4 text-primary">Overall Summary</h2>
            <p className="text-gray-600 leading-relaxed">
              {reportData.overallSummary}
            </p>
          </section>
        )}

        {/* Formation Analysis */}
        {reportData.formationAnalysis && (
          <section>
            <h2 className="text-xl font-semibold mb-4 text-primary">Formation Analysis</h2>
            <p className="text-gray-600 leading-relaxed">
              {reportData.formationAnalysis}
            </p>
          </section>
        )}

        {/* Key Tactical Moments */}
        {reportData.keyTacticalMoments && reportData.keyTacticalMoments.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 text-primary">Key Tactical Moments</h2>
            <div className="space-y-4">
              {reportData.keyTacticalMoments.map((moment, index) => (
                <div key={index} className="bg-gray-50 rounded-md border border-gray-200">
                  {moment.timestamp && (
                    <div className="flex items-center text-primary p-4 pb-0">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">{moment.timestamp}</span>
                    </div>
                  )}
                  <p className="text-gray-600 p-4 pt-2">
                    {moment.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Player Highlights */}
        {reportData.playerHighlights && reportData.playerHighlights.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 text-primary">Player Highlights</h2>
            <div className="space-y-3">
              {reportData.playerHighlights.map((player, index) => (
                <div key={index} className="flex items-start">
                  <UserCircleIcon className="h-4 w-4 mr-2 mt-1 text-gray-400 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium text-gray-800">{player.playerName}: </span>
                    {' '}
                    <span className="text-gray-600">{player.highlight}</span>
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Suggested Improvements */}
        {reportData.suggestedImprovements && reportData.suggestedImprovements.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 text-primary">Suggested Improvements</h2>
            <ul className="list-disc list-inside space-y-2 pl-1 text-gray-600">
              {reportData.suggestedImprovements.map((improvement, index) => (
                <li key={index}>{improvement}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

// Helper function to format timestamp (optional)
function formatTimestamp(timestamp?: string): string {
  if (!timestamp || timestamp.toLowerCase() === 'n/a') return '-';
  // Basic formatting, you might want a more robust parser
  return timestamp;
} 