"""
Image enhancement pipeline for handwritten pages.

Runs a sequence of classic CV operations tuned for photographed
handwriting (phone-camera notes): grayscale, denoise, deskew,
adaptive threshold, and contrast boost. This is intentionally
model-free (no ML) so it works instantly with zero setup, and it
sits behind a single enhance_image() entry point so it can later be
swapped for a learned model without touching callers.
"""
import cv2
import numpy as np
from PIL import Image


def _deskew(gray: np.ndarray) -> np.ndarray:
    coords = np.column_stack(np.where(gray < 255))
    if coords.size == 0:
        return gray
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    if abs(angle) < 0.5:
        return gray
    (h, w) = gray.shape[:2]
    center = (w // 2, h // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(gray, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def enhance_image(input_path: str, output_path: str) -> dict:
    """
    Enhances the handwriting image and writes the result to output_path.
    Returns a dict of quality metrics used by the quality analyzer.
    """
    img = cv2.imread(input_path)
    if img is None:
        # Fallback for formats OpenCV can't read directly (e.g. some PDFs/webp variants)
        pil_img = Image.open(input_path).convert("RGB")
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Sharpness estimate (variance of Laplacian) — used later by quality analyzer
    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()

    # Brightness estimate
    brightness = float(np.mean(gray))

    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    deskewed = _deskew(denoised)

    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    contrasted = clahe.apply(deskewed)

    thresh = cv2.adaptiveThreshold(
        contrasted, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 25, 12
    )

    cv2.imwrite(output_path, thresh)

    return {
        "sharpness": round(float(sharpness), 2),
        "brightness": round(brightness, 2),
        "width": img.shape[1],
        "height": img.shape[0],
    }
