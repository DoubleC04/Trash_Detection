import React, { useState, useRef, useEffect } from 'react';
import { Camera, Zap, Loader2, AlertTriangle, ArrowLeft, Wifi, WifiOff, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BoundingBoxOverlay from './BoundingBoxOverlay';
import AnalysisResults from './AnalysisResults';
import ModelSelector from './ModelSelector';
import {
  detectObjects,
  DetectedObject,
  BoundingBox,
  checkBackendConnection
} from '@/services/objectDetection';

interface AnalysisResult {
  objectId: string;
  analysis: string;
  category: string;
  recyclable: boolean;
}

const WasteDetectionApp = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [selectedModel, setSelectedModel] = useState('yolo11');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  useEffect(() => {
    checkCameraPermission();
    checkConnection();

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
      realtimeIntervalRef.current = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    const updateDimensions = () => {
      if (videoRef.current && containerRef.current) {
        const video = videoRef.current;
        setVideoDimensions({
          width: video.videoWidth || video.clientWidth,
          height: video.videoHeight || video.clientHeight
        });
        setContainerDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', updateDimensions);
      video.addEventListener('loadeddata', updateDimensions);
      video.addEventListener('canplay', updateDimensions);
      window.addEventListener('resize', updateDimensions);

      // Initial dimensions update
      setTimeout(updateDimensions, 100);

      return () => {
        video.removeEventListener('loadedmetadata', updateDimensions);
        video.removeEventListener('loadeddata', updateDimensions);
        video.removeEventListener('canplay', updateDimensions);
        window.removeEventListener('resize', updateDimensions);
      };
    }
  }, [isStreaming]);

  // Real-time detection using HTTP polling
  useEffect(() => {
    if (!isStreaming || showResults || !isConnected) {
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }
      return;
    }

    realtimeIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current && streamRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        context.drawImage(videoRef.current, 0, 0);

        const imageData = canvas.toDataURL('image/jpeg', 0.6);
        performRealtimeDetection(imageData);
      }
    }, 2000);

    return () => {
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
      }
    };
  }, [isStreaming, showResults, isConnected, selectedModel]);

  const checkConnection = async () => {
    const connected = await checkBackendConnection();
    setIsConnected(connected);
  };

  const performRealtimeDetection = async (imageData: string) => {
    try {
      const objects = await detectObjects(imageData, selectedModel);
      const boxes: BoundingBox[] = objects.map(obj => obj.boundingBox);
      setBoundingBoxes(boxes);
      setIsConnected(true);
    } catch (error) {
      console.error('Real-time detection error:', error);
      setIsConnected(false);
    }
  };

  const checkCameraPermission = async () => {
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setCameraPermission(permission.state);

        permission.onchange = () => {
          setCameraPermission(permission.state);
        };
      }
    } catch (err) {
      console.log('Permission API not supported');
    }
  };

  const startCamera = async (retryCount = 0) => {
    try {
      setError(null);
      console.log('Starting camera, attempt:', retryCount + 1);

      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const cameraConfigs = [
        {
          video: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: 'environment'
          }
        },
        {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'environment'
          }
        },
        {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        },
        {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        },
        { video: true }
      ];

      const config = cameraConfigs[Math.min(retryCount, cameraConfigs.length - 1)];
      console.log('Trying camera config:', config);

      const stream = await navigator.mediaDevices.getUserMedia(config);
      console.log('Stream tracks:', stream.getVideoTracks().map(track => ({
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState,
        settings: track.getSettings(),
      })));

      streamRef.current = stream;

      setIsStreaming(true);
      console.log('isStreaming set to true before checking videoRef');

      if (videoRef.current) {
        console.log('videoRef.current exists:', videoRef.current);
        videoRef.current.srcObject = stream;
        console.log('srcObject assigned:', videoRef.current.srcObject);
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata:', {
            videoWidth: videoRef.current?.videoWidth,
            videoHeight: videoRef.current?.videoHeight,
          });
          setVideoDimensions({
            width: videoRef.current.videoWidth || videoRef.current.clientWidth,
            height: videoRef.current.videoHeight || videoRef.current.clientHeight,
          });
          setIsStreaming(true);
          console.log('isStreaming set to true in loadedmetadata');
        };
        try {
          await videoRef.current.play();
          console.log('Video is playing');
          console.log('isStreaming set to true after play');
          setCameraPermission('granted');
        } catch (playError) {
          console.error('Video play failed:', playError);
          setError(`Không thể phát video: ${playError.message}`);
        }
      } else {
        console.error('videoRef.current is null');
        setError('Không tìm thấy phần tử video. Vui lòng kiểm tra lại giao diện.');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraPermission('denied');

      let errorMessage = 'Unable to access camera. ';

      switch (err.name) {
        case 'NotAllowedError':
          errorMessage += 'Please grant camera permission and reload the page.';
          break;
        case 'NotFoundError':
          errorMessage += 'No camera found on this device.';
          break;
        case 'NotReadableError':
          if (retryCount < 4) {
            console.log('Camera busy, retrying...');
            setTimeout(() => startCamera(retryCount + 1), 2000);
            return;
          }
          errorMessage += 'Camera is being used by another application. Please close other apps using the camera and try again.';
          break;
        case 'OverconstrainedError':
          if (retryCount < 4) {
            setTimeout(() => startCamera(retryCount + 1), 500);
            return;
          }
          errorMessage += 'Camera configuration not supported.';
          break;
        default:
          errorMessage += `Unknown error (${err.name}). Please try again.`;
      }

      setError(errorMessage);
      setIsStreaming(false);
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera');
    cleanup();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        setShowResults(true);
        handleAnalyzeImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsDetecting(true);

    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      context.drawImage(videoRef.current, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageData);

      stopCamera();
      setShowResults(true);

      await handleAnalyzeImage(imageData);

    } catch (err) {
      setError('Image processing error. Please try again.');
      console.error('Processing error:', err);
    } finally {
      setIsDetecting(false);
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeImage = async (imageData: string) => {
    try {
      setIsDetecting(true);

      const objects = await detectObjects(imageData, selectedModel);
      setDetectedObjects(objects);
      setBoundingBoxes(objects.map(obj => obj.boundingBox));
      setIsDetecting(false);

      setIsAnalyzing(true);
      const analyses: AnalysisResult[] = objects.map((obj, index) => ({
        objectId: obj.id,
        analysis: `${obj.className.replace('_', ' ')} detected with ${Math.round(obj.confidence * 100)}% confidence. Click for detailed recycling information.`,
        category: getCategoryFromClass(obj.className),
        recyclable: getRecyclableStatus(obj.className)
      }));
      setAnalysisResults(analyses);

    } catch (err) {
      setError('Image analysis error. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetDetection = () => {
    setCapturedImage(null);
    setDetectedObjects([]);
    setAnalysisResults([]);
    setBoundingBoxes([]);
    setError(null);
    setShowResults(false);
    startCamera();
  };

  const getCategoryFromClass = (className: string): string => {
    const categoryMap: { [key: string]: string } = {
      'plastic_bottle': 'Recyclable Plastic',
      'food_wrapper': 'Non-recyclable Waste',
      'aluminum_can': 'Metal Recyclable',
      'bottle': 'Recyclable Plastic',
      'can': 'Metal Recyclable',
      'cup': 'Disposable Item',
    };
    return categoryMap[className] || 'Unknown Category';
  };

  const getRecyclableStatus = (className: string): boolean => {
    const recyclableItems = ['plastic_bottle', 'aluminum_can', 'bottle', 'can'];
    return recyclableItems.includes(className);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-cyan-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-teal-400/20 to-cyan-400/10 rounded-full blur-sm animate-pulse delay-700"></div>
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-gradient-to-br from-cyan-400/30 to-teal-400/15 rounded-lg transform rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 bg-gradient-to-br from-teal-500/15 to-transparent rounded-full animate-bounce-slow delay-1000"></div>
        <div className="absolute top-1/4 right-1/2 w-px h-40 bg-gradient-to-b from-teal-400/40 to-transparent transform rotate-12 animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/2 w-px h-32 bg-gradient-to-t from-cyan-400/40 to-transparent transform -rotate-12 animate-pulse delay-500"></div>
      </div>

      {/* Subtle Grid Pattern */}
      <div className="fixed inset-0 z-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(56, 178, 172, 0.3) 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-8">
        {/* Modern Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="relative inline-block">
            <h1 className="text-6xl md:text-7xl font-light tracking-wider mb-6 text-white">
              <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
                botanme
              </span>
            </h1>
            <div className="absolute -inset-4 border border-teal-400/30 rounded-lg animate-pulse"></div>
          </div>

          <p className="text-xl text-teal-200/80 font-light mt-8 tracking-wide animate-fade-in delay-300">
            AI-Powered Smart Detection System
          </p>

          <div className="mt-8 flex justify-center gap-6 animate-fade-in delay-500">
            <div className="px-8 py-3 border border-teal-400/40 rounded-lg text-teal-300 font-light tracking-wider hover:bg-teal-400/10 transition-all duration-300 cursor-pointer">
              REAL-TIME DETECTION
            </div>
            <div className="px-8 py-3 border border-cyan-400/40 rounded-lg text-cyan-300 font-light tracking-wider hover:bg-cyan-400/10 transition-all duration-300 cursor-pointer">
              AI ANALYSIS
            </div>
          </div>
        </div>

        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          isConnected={isConnected}
        />

        {!showResults ? (
          <div className="max-w-5xl mx-auto animate-fade-in delay-700">
            <Card className="bg-white/5 backdrop-blur-xl border border-teal-400/20 shadow-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border-b border-teal-400/20">
                <CardTitle className="flex items-center justify-between text-white font-light text-xl">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Camera className="w-6 h-6 text-teal-400" />
                      {isStreaming && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    Live Detection Camera
                  </div>
                  <div className="flex items-center gap-2">
                    {isStreaming && (
                      <Badge className="bg-green-500/20 text-green-300 border-green-400/30 animate-pulse">
                        LIVE
                      </Badge>
                    )}
                    <Badge className={isConnected
                      ? "bg-green-500/20 text-green-300 border-green-400/30"
                      : "bg-red-500/20 text-red-300 border-red-400/30"
                    }>
                      {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                      {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-8">
                <div
                  ref={containerRef}
                  className="relative bg-black/40 rounded-2xl overflow-hidden mb-8 border border-teal-400/20 group hover:border-teal-400/40 transition-all duration-500"
                >
                  {isStreaming ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-[600px] object-cover brightness-110 contrast-125"
                        style={{
                          transform: 'scaleX(-1)' // Mirror the video for better UX
                        }}
                        onLoadedMetadata={() => {
                          console.log('Video metadata loaded');
                          if (videoRef.current) {
                            console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                          }
                        }}
                        onCanPlay={() => {
                          console.log('Video can play');
                        }}
                        onPlay={() => {
                          console.log('Video is playing');
                        }}
                      />
                      <canvas ref={canvasRef} className="hidden" />

                      <BoundingBoxOverlay
                        boxes={boundingBoxes}
                        videoWidth={videoDimensions.width}
                        videoHeight={videoDimensions.height}
                        containerWidth={containerDimensions.width}
                        containerHeight={containerDimensions.height}
                      />

                      {boundingBoxes.length > 0 && (
                        <div className="absolute top-4 left-4 bg-teal-500/90 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm animate-fade-in">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            {boundingBoxes.length} objects detected
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-[600px] flex flex-col items-center justify-center text-white/70">
                      <Camera className="w-16 h-16 mb-4 text-teal-400/50" />
                      <p className="text-lg mb-4">Camera not activated</p>

                      {cameraPermission === 'denied' && (
                        <div className="text-center mb-4">
                          <p className="text-sm text-red-300 mb-2">
                            Camera access denied
                          </p>
                          <p className="text-xs text-white/50">
                            Please grant permission in browser settings
                          </p>
                        </div>
                      )}

                      <div className="flex gap-4">
                        <Button
                          onClick={() => startCamera()}
                          variant="outline"
                          className="border-teal-400/40 text-teal-300 hover:bg-teal-400/10"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Start Camera
                        </Button>

                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                          className="border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Upload Image
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-teal-400/5 to-transparent h-8 animate-pulse"></div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {error && (
                  <div className="bg-red-900/30 border border-red-400/40 rounded-xl p-4 mb-6 backdrop-blur-sm animate-fade-in">
                    <div className="flex items-center gap-3 text-red-300">
                      <AlertTriangle className="w-5 h-5" />
                      <div>
                        <p className="font-medium">{error}</p>
                        {cameraPermission === 'denied' && (
                          <p className="text-sm mt-1 text-red-200/70">
                            Or you can upload an image for analysis
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={() => startCamera()}
                        size="sm"
                        variant="outline"
                        className="border-red-400/40 text-red-300 hover:bg-red-400/10"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleAnalyze}
                  disabled={!isStreaming || isDetecting}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium py-6 text-lg rounded-xl shadow-xl transform transition-all duration-500 hover:scale-[1.02] border-0 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  {isDetecting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      START ANALYSIS
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Results Section */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-fade-in">
            <Card className="bg-white/5 backdrop-blur-xl border border-teal-400/20 shadow-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border-b border-teal-400/20">
                <CardTitle className="flex items-center gap-3 text-white font-light text-xl">
                  <Camera className="w-6 h-6 text-teal-400" />
                  Analyzed Image
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative bg-black/40 rounded-xl overflow-hidden mb-6 border border-teal-400/20">
                  <img
                    src={capturedImage!}
                    alt="Captured frame"
                    className="w-full h-80 object-cover brightness-110 contrast-125"
                  />

                  <BoundingBoxOverlay
                    boxes={boundingBoxes}
                    videoWidth={videoDimensions.width}
                    videoHeight={videoDimensions.height}
                    containerWidth={containerDimensions.width}
                    containerHeight={containerDimensions.height}
                  />
                </div>

                <Button
                  onClick={resetDetection}
                  variant="outline"
                  className="w-full border border-teal-400/40 text-teal-300 hover:bg-teal-400/10 hover:border-teal-400/60 transition-all duration-500 py-4 rounded-xl font-medium"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Camera
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border border-teal-400/20 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border-b border-teal-400/20">
                <CardTitle className="flex items-center justify-between text-white font-light text-xl">
                  <span>AI Analysis Results</span>
                  {!isAnalyzing && analysisResults.length > 0 && (
                    <Badge className="bg-teal-500/20 text-teal-300 border-teal-400/30">
                      {analysisResults.length} analyzed
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <AnalysisResults
                  objects={detectedObjects}
                  analyses={analysisResults}
                  isLoading={isAnalyzing}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default WasteDetectionApp;
