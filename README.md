# Waste Detection Project

This project implements a waste detection system using three advanced object detection models: **YOLO11**, **RT-DETR**, and **Faster R-CNN**. The models are trained on a custom dataset sourced from Roboflow and deployed via a **FastAPI**-based web application for real-time waste detection.

## Table of Contents
- [Project Overview](#project-overview)
- [Project Structure](#project-structure)
- [Dataset](#dataset)
- [Models](#models)
- [Installation](#installation)
- [Web Deployment](#web-deployment)
- [Usage](#usage)

## Project Overview
The goal of this project is to detect and classify waste objects in images or real-time video streams using deep learning models. The system is designed to assist in waste management and environmental monitoring by identifying different types of waste (e.g., plastic, paper, organic, etc.).

## Project Structure
Folder `src` contains the code related to find optimal hyperparamer for model, model training, model evaluation. Code in this folder use colab or kaggle to run.


## Dataset
Key details:
- **Source**: Roboflow dataset with images of various waste types. Access the dataset [here](https://app.roboflow.com/detectionclassificationgarbage/detection-garbage-jkww2/5).
- **Classes**: Multiple waste categories (e.g., plastic, paper, metal, organic) as defined in the dataset.
- **Format**: Images with annotations in YOLO, COCO, or Pascal VOC format (depending on the model).

Ensure the dataset is downloaded from the provided Roboflow link. You can download the dataset in the appropriate format (e.g., YOLO for YOLO11, COCO for Faster R-CNN) using the Roboflow platform.

## Models
Three object detection models are used:
1. **YOLO11**: A real-time model optimized for speed and accuracy.
2. **RT-DETR**: A transformer-based model for high-precision real-time detection.
3. **Faster R-CNN**: A two-stage model for robust detection in complex scenes.

Each model is trained on the Roboflow dataset and fine-tuned for waste detection tasks.

Link to 3 models has been finetune: [here](https://drive.google.com/drive/folders/1Qhn4AzVIjlA902Zj0uF8ijNUQ5xYjQ33?usp=drive_link)

## Link product: https://trash.dnggnd.online/

## Cách chạy file predict
- Chạy file trên Colab.
- Sửa lại đường dẫn ảnh cần predict từ Driver.
- Sửa lại đường dẫn file tệp lưu mô hình đã huấn luyện trong Driver.
- Chạy file.
