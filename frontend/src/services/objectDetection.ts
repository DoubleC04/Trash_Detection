import exp from "constants";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

export interface DetectedObject {
  id: string;
  boundingBox: BoundingBox;
  croppedImageData: string;
  className: string;
  confidence: number;
  analysis: string;
}

export interface BackendDetection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
}

export interface BackendAnalysis {
  object_id: number;
  class: string;
  llm_description: string;
}

export interface BackendResponse {
  detections: BackendDetection[];
  image: string;
  cropped_images: string[];
  llm_results: BackendAnalysis[];
  error?: string;
}

// Backend API configuration
const BACKEND_URL = 'http://localhost:8000'; // Adjust this to your backend URL


export interface DetectedObject {
  id: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
  };
  croppedImageData: string;
  className: string;
  confidence: number;
  analysis: string;
}

export interface AnalysisResult {
  objectId: string;
  analysis: string;
  category: string;
  recyclable: boolean;
}

// Utility to limit concurrent requests
const limitConcurrency = async <T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number,
  batchDelayMs: number = 60000 // 60 seconds between batches
): Promise<T[]> => {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += maxConcurrent) {
    const batch = tasks.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(batch.map(task => task()));
    results.push(...batchResults);
    if (i + maxConcurrent < tasks.length) {
      console.log(`⏳ Waiting ${batchDelayMs}ms before next batch`);
      await new Promise(resolve => setTimeout(resolve, batchDelayMs));
    }
  }
  return results;
};

// Utility for retry with delay
const retryWithDelay = async <T>(
  fn: () => Promise<T>,
  retries: number,
  baseDelayMs: number
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.message.includes('429') && i < retries - 1) {
        const retryDelayMatch = error.message.match(/"retryDelay":\s*"(\d+)s"/);
        const retryDelay = retryDelayMatch ? parseInt(retryDelayMatch[1]) * 1000 : baseDelayMs * Math.pow(2, i);
        console.warn(`⚠️ 429 error for attempt ${i + 1}/${retries}, retrying after ${retryDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
};

export const analyzeWithLLM = async (
  objects: DetectedObject[],
  croppedImages: string[]
): Promise<AnalysisResult[]> => {
  const apiKey = 'AIzaSyAZATWDyalcbRZ5sqXTByyQSpDzooTRGpI';
  if (!apiKey) {
    console.error('❌ No API key provided for Gemini API. Please set REACT_APP_GEMINI_API_KEY in your .env file.');
    return objects.map(obj => ({
      objectId: obj.id,
      analysis: 'Error: No API key provided',
      category: getCategoryFromClass(obj.className),
      recyclable: getRecyclableStatus(obj.className)
    }));
  }

  console.log(`📊 Analyzing ${objects.length} objects with Gemini API (model: gemini-1.5-flash)`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const requests = objects.map((obj, idx) => async () => {
    const base64Data = croppedImages[idx]?.startsWith('data:image/jpeg;base64,')
      ? croppedImages[idx].split(',')[1]
      : croppedImages[idx] || '';

    if (!base64Data || !/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
      console.error(`❌ Invalid base64 data for object ${obj.id} at index ${idx}`);
      return { candidates: [{ content: { parts: [{ text: 'Invalid image data' }] } }] };
    }

    console.log(`🚀 Sending request for object ${obj.id}`);
    return retryWithDelay(
      () =>
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `This is a photo of an object classified as "${obj.className}". Is this object recyclable? What is its material type? Explain briefly.`
                  },
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: base64Data
                    }
                  }
                ]
              }
            ]
          })
        })
          .then(res => {
            if (!res.ok) {
              return res.text().then(text => {
                throw new Error(`API error for object ${obj.id}: ${res.status} - ${text}`);
              });
            }
            return res.json();
          })
          .catch(error => {
            console.error(`❌ Error analyzing object ${obj.id}:`, error.message);
            return { candidates: [{ content: { parts: [{ text: 'Analysis failed' }] } }] };
          }),
      3,
      33000 // 33 seconds base delay
    );
  });

  const responses = await limitConcurrency(requests, 2, 60000);

  return responses.map((res, index) => ({
    objectId: objects[index].id,
    analysis: res.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available.',
    category: getCategoryFromClass(objects[index].className),
    recyclable: getRecyclableStatus(objects[index].className)
  }));
};

const convertBackendDetections = (
  backendDetections: any[] = [],
  croppedImages: string[] = [],
  llmAnalyses: AnalysisResult[] = []
): DetectedObject[] => {
  if (!Array.isArray(backendDetections)) {
    console.error('❌ backendDetections is not an array:', backendDetections);
    return [];
  }

  return backendDetections.map((detection, index) => {
    const { x, y, width, height } = detection.boundingBox || {};
    const analysisResult = llmAnalyses.find(result => result.objectId === (detection.id || `object_${index}`)) || { analysis: '' };

    return {
      id: detection.id || `object_${index}`,
      boundingBox: {
        x: x || 0,
        y: y || 0,
        width: width || 0,
        height: height || 0,
        confidence: detection.confidence || 0,
        class: detection.class || 'unknown'
      },
      croppedImageData: croppedImages[index] || '',
      className: detection.class || 'unknown',
      confidence: detection.confidence || 0,
      analysis: analysisResult.analysis || ''
    };
  });
};

export const detectObjects = async (
  imageData: string,
  model: string = 'yolo11'
): Promise<DetectedObject[]> => {
  try {
    if (!imageData) {
      throw new Error('No image data provided');
    }

    const BACKEND_URL = 'http://localhost:8000';
    const response = await fetch(`${BACKEND_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: imageData,
        model: model
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    console.log('🎯 Response from backend:', data);

    if (!data || !Array.isArray(data.detections)) {
      throw new Error('Invalid response format: `detections` is not an array');
    }

    console.log('✅ Backend response data:', data);

    const tempObjects: DetectedObject[] = data.detections.map((detection, index) => ({
      id: detection.id || `object_${index}`,
      className: detection.class || 'unknown',
      boundingBox: {
        x: detection.boundingBox?.x || 0,
        y: detection.boundingBox?.y || 0,
        width: detection.boundingBox?.width || 0,
        height: detection.boundingBox?.height || 0,
        confidence: detection.confidence || 0,
        class: detection.class || 'unknown'
      },
      croppedImageData: data.cropped_images?.[index] || '',
      confidence: detection.confidence || 0,
      analysis: ''
    }));

    const llmAnalyses = await analyzeWithLLM(tempObjects, data.cropped_images || []);

    return convertBackendDetections(data.detections, data.cropped_images || [], llmAnalyses);
  } catch (error: any) {
    console.error('❌ Detection error:', error.message);
    return [];
  }
};

// // Define utility functions only once
// const getCategoryFromClass = (className: string): string => {
//   return className ? className.toLowerCase() : 'unknown';
// };

// const getRecyclableStatus = (className: string): boolean => {
//   const recyclableClasses = ['plastic', 'paper', 'glass'];
//   return recyclableClasses.includes(className.toLowerCase());
// };



// Helper functions
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

// Mock data fallback
const getMockDetections = (imageData: string): DetectedObject[] => {
  const mockDetections = [
    { x: 120, y: 80, width: 150, height: 180, confidence: 0.92, class: "plastic_bottle" },
    { x: 300, y: 120, width: 100, height: 80, confidence: 0.87, class: "food_wrapper" },
    { x: 450, y: 90, width: 80, height: 120, confidence: 0.95, class: "aluminum_can" },
  ];

  return mockDetections.map((detection, index) => ({
    id: `object_${index}`,
    boundingBox: detection,
    croppedImageData: imageData,
    className: detection.class,
    confidence: detection.confidence
  }));
};

// Check backend connection
export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      timeout: 5000
    } as any);
    return response.ok;
  } catch (error) {
    console.log('Backend not available, using mock data');
    return false;
  }
};
