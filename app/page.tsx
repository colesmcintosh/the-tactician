'use client';

import { useState, useEffect } from 'react';
import { VideoCameraIcon, DocumentTextIcon, ArrowPathIcon, SparklesIcon, FilmIcon, XCircleIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import TacticalReportDisplay from './components/TacticalReportDisplay';
import VideoPreviewModal from './components/VideoPreviewModal';
import clsx from 'clsx';
import { HighlightAnalysisReport } from './api/analyze/tactics/route';

export const experimental_ppr = true;

interface TacticalReport {
  overallSummary?: string;
  formationAnalysis?: string;
  tacticalHighlights?: { insight: string }[];
}

// Define preset videos with just the filenames
interface PresetVideo {
  name: string;
  filename: string;
  description: string;
}
const presetVideos: PresetVideo[] = [
  { name: "TAA vs Barcelona", filename: "taa-vs-barce.mov", description: "Trent Alexander-Arnold's iconic quick corner." },
  { name: "R9 vs Ghana", filename: "r9-vs-ghana.mov", description: "Ronaldo Nazário's iconic goal against Ghana." },
  { name: "Maradona for Boca", filename: "maradona-boca.mov", description: "Diego Maradona dazzling for Boca Juniors." },
];

interface SelectedPreset {
  url: string;
  filename: string;
  name: string; // Add name here for easier access
}

export default function SoccerTacticAnalysis() {
  const [selectedPreset, setSelectedPreset] = useState<SelectedPreset | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [analysisData, setAnalysisData] = useState<HighlightAnalysisReport | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentModalVideoPath, setCurrentModalVideoPath] = useState<string | null>(null);
  const [currentModalVideoName, setCurrentModalVideoName] = useState<string | null>(null);
  const [currentModalVideoFilename, setCurrentModalVideoFilename] = useState<string | null>(null);
  const [videoUrlForDisplay, setVideoUrlForDisplay] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Fetch signed URLs when component mounts
  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urls: Record<string, string> = {};
      for (const video of presetVideos) {
        try {
          const response = await fetch(`/api/storage/signed-url?filename=${video.filename}`);
          if (!response.ok) {
            console.warn(`Failed to get signed URL for ${video.filename}: ${response.statusText}`);
            continue;
          }
          const data = await response.json();
          if (data.url) {
            urls[video.filename] = data.url;
          }
        } catch (error) {
          console.error(`Error fetching signed URL for ${video.filename}:`, error);
        }
      }
      setSignedUrls(urls);
    };

    fetchSignedUrls();
  }, []);

  // Effect for cleaning up Object URLs
  useEffect(() => {
    const currentUrl = videoUrlForDisplay;
    return () => {
      if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [videoUrlForDisplay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPreset) return;

    setError(null);
    setAnalysisData(null);
    setShowResults(false);
    setVideoUrlForDisplay(null);
    setAnalyzing(false);

    try {
      const analysisPayload = { presetUrl: selectedPreset.url };
      const localVideoUrl = selectedPreset.url;
      
      setVideoUrlForDisplay(localVideoUrl);
      setAnalyzing(true);
      setShowResults(true);

      const tacticsResponse = await fetch('/api/analyze/tactics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisPayload),
      });

      if (!tacticsResponse.ok) {
        const errorData = await tacticsResponse.json().catch(() => ({ error: 'Analysis request failed' }));
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result: HighlightAnalysisReport = await tacticsResponse.json();
      setAnalysisData(result);

    } catch (err) {
      console.error("Analysis submission error:", err);
      setError(err instanceof Error ? err.message : 'Something went wrong during the process');
      setShowResults(false);
      setVideoUrlForDisplay(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setAnalyzing(false);
    setError(null);
    setShowResults(false);
    setAnalysisData(null);
    setSelectedPreset(null);
    setVideoUrlForDisplay(null);
    closeVideoModal();
  };

  const clearSelection = () => {
    setSelectedPreset(null);
    setError(null);
    setVideoUrlForDisplay(null);
  };

  const openVideoModal = (filename: string, name: string) => {
    const signedUrl = signedUrls[filename];
    if (signedUrl) {
      setCurrentModalVideoPath(signedUrl);
      setCurrentModalVideoName(name);
      setCurrentModalVideoFilename(filename);
      setIsVideoModalOpen(true);
    } else {
      setError(`Could not load preview for ${name}. Signed URL missing.`);
    }
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setCurrentModalVideoFilename(null);
  };

  const handleAddVideoFromModal = () => {
    if (currentModalVideoPath && currentModalVideoFilename && currentModalVideoName) {
      setSelectedPreset({ 
        url: currentModalVideoPath, // Use the signed *read* URL
        filename: currentModalVideoFilename, 
        name: currentModalVideoName 
      });
      setError(null);
      closeVideoModal();
    }
  };

  const getSelectedItemName = () => {
    if (selectedPreset) {
      return selectedPreset.name;
    }
    return null;
  };

  const selectedItemName = getSelectedItemName();
  const isProcessing = analyzing;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative flex-grow flex flex-col">
        <div className="flex flex-col items-center mb-10 sm:mb-12">
          <div className="flex items-center justify-center mb-4">
            <SparklesIcon className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-3xl sm:text-4xl font-bold gradient-text tracking-tight">The Tactician</h1>
          </div>
          <p className="text-base sm:text-lg text-gray-600 mt-3 max-w-2xl mx-auto text-center">
            Select a sample video and get detailed tactical insights powered by AI.
          </p>

          <div className="w-full flex justify-center mt-6 mb-4">
            {showResults && !isProcessing && (
              <button
                onClick={resetAnalysis}
                className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 rounded-lg shadow-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-primary"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                New Analysis
              </button>
            )}
          </div>
        </div>

        <div className="flex-grow min-h-0 flex justify-center items-start bg-white">
          {!showResults ? (
            <div className="max-w-3xl w-full">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 sm:space-y-8">
                  {/* Sample Video Selection */}
                  <div className="space-y-4">
                    <p className="text-center text-sm font-medium text-gray-600">
                      {isProcessing ? 'Processing...' : (selectedItemName ? `Selected: ${selectedItemName}` : 'Select a video to analyze:')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      {presetVideos.map((video) => (
                        <button
                          key={video.filename}
                          type="button"
                          onClick={() => openVideoModal(video.filename, video.name)}
                          className={clsx(
                            `group flex flex-col items-center justify-start p-4 rounded-lg border text-center transition-all duration-200 ease-in-out h-full`,
                            `focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`,
                            {
                              'border-primary bg-primary/5 ring-1 ring-primary shadow-sm': selectedPreset?.filename === video.filename,
                              'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50': selectedPreset?.filename !== video.filename,
                              'opacity-50 cursor-not-allowed': isProcessing,
                            }
                          )}
                          disabled={isProcessing}
                        >
                          <div className="flex-shrink-0 mb-2">
                            <FilmIcon className={clsx(
                              "h-6 w-6 transition-colors",
                              selectedPreset?.filename === video.filename ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'
                            )} />
                          </div>
                          <div className="flex-grow flex flex-col justify-center">
                            <span className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">{video.name}</span>
                            <span className="text-xs text-gray-500 mt-1 px-1">{video.description}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-center pt-6 sm:pt-8">
                    <button
                      type="submit"
                      disabled={!selectedItemName || isProcessing}
                      className={clsx(
                        `inline-flex items-center justify-center px-8 py-3 rounded-lg text-base font-semibold text-white transition-all duration-300 ease-in-out shadow-md hover:shadow-lg transform w-full sm:w-auto`,
                        {
                          'bg-gray-400 cursor-not-allowed': !selectedItemName || isProcessing,
                          'bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary': selectedItemName && !isProcessing,
                        }
                      )}
                    >
                      {analyzing ? (
                        <>
                          <ArrowPathIcon className="animate-spin h-5 w-5 mr-3" />
                          Analyzing Footage...
                        </>
                      ) : (
                        'Analyze Footage'
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Error Display */}
              {error && !showResults && (
                <div className="mt-6">
                  <div className="bg-red-100 border border-red-200 rounded-lg px-5 py-3 text-sm text-red-700 shadow-sm">
                    <span className="font-medium">Error:</span> {error}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full">
              <TacticalReportDisplay
                reportData={analysisData}
                isLoading={analyzing && !analysisData}
                error={error || undefined}
                videoUrl={videoUrlForDisplay || undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* Video Preview Modal */}
      <VideoPreviewModal
        isOpen={isVideoModalOpen}
        onClose={closeVideoModal}
        onConfirm={handleAddVideoFromModal}
        videoPath={currentModalVideoPath}
        videoName={currentModalVideoName}
      />
    </div>
  );
}
