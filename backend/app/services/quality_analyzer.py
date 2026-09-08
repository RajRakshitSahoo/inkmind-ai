"""
Turns raw CV metrics from image_processing into a user-facing
quality report (section 21 of the spec): lighting, sharpness, skew,
and an overall score with a plain-language recommendation.
"""


def analyze_quality(metrics: dict) -> dict:
    sharpness = metrics.get("sharpness", 0)
    brightness = metrics.get("brightness", 128)

    sharpness_label = "High" if sharpness > 150 else "Medium" if sharpness > 60 else "Low"
    lighting_label = (
        "Good" if 90 <= brightness <= 200
        else "Dim" if brightness < 90
        else "Overexposed"
    )

    score = 100
    if sharpness_label == "Low":
        score -= 35
    elif sharpness_label == "Medium":
        score -= 12
    if lighting_label != "Good":
        score -= 25
    score = max(10, min(100, score))

    recommendation = None
    if lighting_label == "Dim":
        recommendation = "Retake the photo under brighter, even lighting for better recognition."
    elif lighting_label == "Overexposed":
        recommendation = "Reduce glare or direct light — try an angled, indirect light source."
    elif sharpness_label == "Low":
        recommendation = "Hold the camera steady and refocus — the image looks blurry."

    return {
        "image_quality": score,
        "lighting": lighting_label,
        "sharpness": sharpness_label,
        "skew": "Low",  # deskew already applied in image_processing
        "recommendation": recommendation,
    }
