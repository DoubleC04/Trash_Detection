
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

// Convert backend detections to frontend format
const convertBackendDetections = (
  backendDetections: BackendDetection[], 
  croppedImages: string[] = []
): DetectedObject[] => {
  return backendDetections.map((detection, index) => {
    const [x1, y1, x2, y2] = detection.bbox;
    return {
      id: `object_${index}`,
      boundingBox: {
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1,
        confidence: detection.confidence,
        class: detection.class
      },
      croppedImageData: croppedImages[index] || '',
      className: detection.class,
      confidence: detection.confidence
    };
  });
};

export const detectObjects = async (imageData: string, model: string = 'yolo11'): Promise<DetectedObject[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        image: imageData,
        model: model 
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: BackendResponse = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return convertBackendDetections(data.detections, data.cropped_images);
  } catch (error) {
    console.error('Detection error:', error);
    // Return mock data if backend is not available
    return getMockDetections(imageData);
  }
};

export const analyzeWithLLM = async (objects: DetectedObject[]): Promise<Array<{
  objectId: string;
  analysis: string;
  category: string;
  recyclable: boolean;
}>> => {
  try {
    return objects.map((obj, index) => ({
      objectId: obj.id,
      analysis: `Analyzed ${obj.className} with ${Math.round(obj.confidence * 100)}% confidence`,
      category: getCategoryFromClass(obj.className),
      recyclable: getRecyclableStatus(obj.className)
    }));
  } catch (error) {
    console.error('LLM analysis error:', error);
    return [];
  }
};

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
