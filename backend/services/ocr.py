from __future__ import annotations
import os
import uuid
import numpy as np
import cv2
import easyocr
import fitz  # PyMuPDF

READER: easyocr.Reader | None = None
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_reader() -> easyocr.Reader:
    global READER
    if READER is None:
        READER = easyocr.Reader(["fr", "en"], gpu=False)
    return READER


def _deskew(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLines(edges, 1, np.pi / 180, 100)
    if lines is None:
        return image
    angles = []
    for line in lines[:20]:
        rho, theta = line[0]
        angle = (theta - np.pi / 2) * 180 / np.pi
        if abs(angle) < 45:
            angles.append(angle)
    if not angles:
        return image
    median_angle = float(np.median(angles))
    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
    rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated


def preprocess_image(image_path: str) -> np.ndarray:
    image = cv2.imread(image_path)
    image = _deskew(image)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    thresh = cv2.adaptiveThreshold(
        enhanced, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )
    return thresh


def reconstruct_text(ocr_results: list) -> str:
    """Sort OCR results spatially (Y then X) and join text."""
    boxes = []
    for (bbox, text, confidence) in ocr_results:
        if confidence < 0.4:
            continue
        y = min(pt[1] for pt in bbox)
        x = min(pt[0] for pt in bbox)
        boxes.append((y, x, text))
    boxes.sort(key=lambda b: (round(b[0] / 20), b[1]))
    return " ".join(b[2] for b in boxes)


def scan_image_to_pdf(image_path: str) -> tuple[str, str]:
    """
    Process an image through OCR, generate a PDF with the text overlay.
    Returns (output_pdf_path, extracted_text).
    """
    reader = get_reader()
    preprocessed = preprocess_image(image_path)

    # Save preprocessed for OCR
    temp_path = image_path + "_preprocessed.png"
    cv2.imwrite(temp_path, preprocessed)

    results = reader.readtext(temp_path)
    os.remove(temp_path)

    extracted_text = reconstruct_text(results)

    # Create PDF using PyMuPDF
    output_name = f"scan_{uuid.uuid4().hex[:8]}.pdf"
    output_path = os.path.join(UPLOAD_DIR, output_name)

    pdf_doc = fitz.open()
    page = pdf_doc.new_page(width=595, height=842)  # A4

    # Insert extracted text
    page.insert_textbox(
        fitz.Rect(40, 40, 555, 800),
        extracted_text,
        fontsize=11,
        fontname="helv",
    )

    # Insert original image as background (smaller)
    try:
        img_rect = fitz.Rect(440, 680, 555, 800)
        page.insert_image(img_rect, filename=image_path)
    except Exception:
        pass

    pdf_doc.save(output_path)
    pdf_doc.close()

    return output_path, extracted_text
