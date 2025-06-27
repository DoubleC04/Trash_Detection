from fastapi import FastAPI, APIRouter, HTTPException
from schemas.analyze import AnalyzeRequest
from fastapi.middleware.cors import CORSMiddleware
from inference import YOLODetector, RTDETRDetector, RCNNDetector
from detectron2.model_zoo import model_zoo

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.0.104:8080"],  # Cho phép origin của frontend
    allow_credentials=True,
    allow_methods=["*"],  # Cho phép tất cả phương thức (GET, POST, v.v.)
    allow_headers=["*"],  # Cho phép tất cả header
)

yolo_detector = YOLODetector("./model/yolo11l_finetune.pt")
rt_detector = RTDETRDetector("./model/RT_DETR_finetune.pt")
rcnn_detector = RCNNDetector(
    "./model/fasterrcnn_finetune.pth",
    config_file=model_zoo.get_config_file("COCO-Detection/faster_rcnn_R_50_FPN_3x.yaml")
)

@app.post('/analyze')
async def analyze(request: AnalyzeRequest):
    try:
        if request.model == "yolo11":
            # Gọi hàm detect từ YOLODetector
            results = yolo_detector.detect(request.image, request.model)
            # return results
            return results
        
        if request.model == "rt-detr":
            # Gọi hàm detect từ YOLODetector
            results = rt_detector.detect(request.image)
            # return results
            return results
	
        elif request.model == "faster-rcnn":
            # Gọi hàm detect từ RCNNDetector
            results = rcnn_detector.detect(request.image)
            return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
    
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
    
