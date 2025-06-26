
import React from 'react';
import { BoundingBox } from '@/services/objectDetection';

interface BoundingBoxOverlayProps {
  boxes: BoundingBox[];
  videoWidth: number;
  videoHeight: number;
  containerWidth: number;
  containerHeight: number;
}

const BoundingBoxOverlay: React.FC<BoundingBoxOverlayProps> = ({
  boxes,
  videoWidth,
  videoHeight,
  containerWidth,
  containerHeight
}) => {
  if (!videoWidth || !videoHeight) return null;

  const scaleX = containerWidth / videoWidth;
  const scaleY = containerHeight / videoHeight;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {boxes.map((box, index) => (
        <div
          key={index}
          className="absolute border-2 border-green-400 bg-green-400/10 rounded"
          style={{
            left: `${box.x * scaleX}px`,
            top: `${box.y * scaleY}px`,
            width: `${box.width * scaleX}px`,
            height: `${box.height * scaleY}px`,
          }}
        >
          <div className="absolute -top-6 left-0 bg-green-400 text-white text-xs px-2 py-1 rounded">
            {box.class} ({Math.round(box.confidence * 100)}%)
          </div>
        </div>
      ))}
    </div>
  );
};

export default BoundingBoxOverlay;
