from ultralytics import YOLO
import cv2
import numpy as np
from PIL import Image
import base64
from io import BytesIO
import torch

class YOLODetector:
    def __init__(self, model_path: str):
        # Tải mô hình YOLO
        self.model = YOLO(model_path)
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model.to(self.device)

    def preprocess_image(self, image_data: str) -> np.ndarray:
        # Giải mã base64 từ frontend
        image_data = base64.b64decode(image_data.split(",")[1])
        image = Image.open(BytesIO(image_data))
        image = np.array(image)  # Chuyển thành numpy array
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)  # Chuyển sang BGR
        return image

    def detect(self, image_data: str, model_name: str = "yolov8"):
        image = self.preprocess_image(image_data)
        results = self.model.predict(image, conf=0.5, device=self.device)
        return self.postprocess(results, image)

    def postprocess(self, results, original_image: np.ndarray) -> dict:
        predictions = []
        cropped_images = []

        for result in results:
            boxes = result.boxes.xyxy.cpu().numpy()
            scores = result.boxes.conf.cpu().numpy()
            classes = result.boxes.cls.cpu().numpy()
            class_names = result.names

            for box, score, cls in zip(boxes, scores, classes):
                x1, y1, x2, y2 = map(int, box)

                # Cắt ảnh từ bounding box
                cropped = original_image[y1:y2, x1:x2]
                _, buffer = cv2.imencode('.jpg', cropped)
                cropped_base64 = base64.b64encode(buffer).decode('utf-8')
                cropped_data_url = f"data:image/jpeg;base64,{cropped_base64}"
                cropped_images.append(cropped_data_url)

                predictions.append({
                    "id": str(int(cls)),
                    "class": class_names[int(cls)],
                    "confidence": float(score),
                    "boundingBox": {
                        "x": float(x1),
                        "y": float(y1),
                        "width": float(x2 - x1),
                        "height": float(y2 - y1)
                    }
                })

        return {
            "detections": predictions,
            "cropped_images": cropped_images
        }
    
from ultralytics import RTDETR  # hoặc dùng YOLO('rtdetr-*.pt')

class RTDETRDetector:
    def __init__(self, model_path: str):
        self.model = RTDETR(model_path)  # hoặc YOLO(model_path)
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model.to(self.device)

    def preprocess_image(self, image_data: str) -> np.ndarray:
        image_data = base64.b64decode(image_data.split(",")[1])
        image = Image.open(BytesIO(image_data)).convert("RGB")
        return np.array(image)

    def detect(self, image_data: str, model_name: str = "yolov8"):
        image = self.preprocess_image(image_data)
        results = self.model.predict(image, conf=0.5, device=self.device)
        return self.postprocess(results, image)

    def postprocess(self, results, original_image: np.ndarray) -> dict:
        predictions = []
        cropped_images = []

        for result in results:
            boxes = result.boxes.xyxy.cpu().numpy()
            scores = result.boxes.conf.cpu().numpy()
            classes = result.boxes.cls.cpu().numpy()
            class_names = result.names

            for box, score, cls in zip(boxes, scores, classes):
                x1, y1, x2, y2 = map(int, box)

                # Cắt ảnh từ bounding box
                cropped = original_image[y1:y2, x1:x2]
                _, buffer = cv2.imencode('.jpg', cropped)
                cropped_base64 = base64.b64encode(buffer).decode('utf-8')
                cropped_data_url = f"data:image/jpeg;base64,{cropped_base64}"
                cropped_images.append(cropped_data_url)

                predictions.append({
                    "id": str(int(cls)),
                    "class": class_names[int(cls)],
                    "confidence": float(score),
                    "boundingBox": {
                        "x": float(x1),
                        "y": float(y1),
                        "width": float(x2 - x1),
                        "height": float(y2 - y1)
                    }
                })

        return {
            "detections": predictions,
            "cropped_images": cropped_images
        }

