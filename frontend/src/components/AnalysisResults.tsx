
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DetectedObject } from '@/services/objectDetection';

interface AnalysisResult {
  objectId: string;
  analysis: string;
  category: string;
  recyclable: boolean;
}

interface AnalysisResultsProps {
  objects: DetectedObject[];
  analyses: AnalysisResult[];
  isLoading: boolean;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  objects,
  analyses,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
          <div className="absolute inset-0 rounded-full border-t-2 border-teal-400/30 animate-ping"></div>
        </div>
        <p className="text-white font-medium animate-pulse mb-2">Analyzing with AI...</p>
        <p className="text-teal-300/70 text-sm">Processing {objects.length} detected objects</p>
        <div className="mt-6 flex space-x-2">
          {[0, 1, 2].map((i) => (
            <div 
              key={i} 
              className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" 
              style={{ animationDelay: `${i * 0.2}s` }}
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-white/70">
        <div className="text-4xl mb-4">🔍</div>
        <p className="text-lg mb-2">No analysis results yet</p>
        <p className="text-sm text-center">
          Take a photo or upload an image to start analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
      {analyses.map((result, index) => {
        const object = objects.find(obj => obj.id === result.objectId);
        return (
          <Card 
            key={result.objectId} 
            className="bg-white/5 border border-teal-400/20 backdrop-blur-sm overflow-hidden animate-fade-in hover:border-teal-400/40 transition-all duration-300 group"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white group-hover:text-teal-100 transition-colors font-medium">
                  {object?.className.replace('_', ' ').toUpperCase() || 'OBJECT'}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge className="bg-teal-500/20 text-teal-300 border-teal-400/30 font-medium">
                    {Math.round((object?.confidence || 0) * 100)}%
                  </Badge>
                  <Badge className={result.recyclable 
                    ? "bg-green-500/20 text-green-300 border-green-400/30" 
                    : "bg-red-500/20 text-red-300 border-red-400/30"
                  }>
                    {result.recyclable ? "♻️ Recyclable" : "🗑️ Non-recyclable"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="relative group">
                    <img
                      src={object?.croppedImageData}
                      alt="Detected object"
                      className="w-20 h-20 object-cover rounded-lg border border-teal-400/20 group-hover:border-teal-400/40 transition-colors duration-300"
                    />
                    <div className="absolute inset-0 bg-teal-400/0 group-hover:bg-teal-400/10 rounded-lg transition-colors duration-300"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-teal-200/80 mb-2">
                    <strong className="text-teal-100">Category:</strong> {result.category}
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {result.analysis}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AnalysisResults;
