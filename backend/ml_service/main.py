from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util
import torch
import logging
import os

# Set HuggingFace token from environment to avoid rate-limit warnings
hf_token = os.environ.get('HF_TOKEN')
if hf_token:
    os.environ['HUGGING_FACE_HUB_TOKEN'] = hf_token

app = FastAPI(title="ProTrack ML Allocation Engine")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load the SBERT model at startup
# Using a lightweight, fast, and highly accurate model for semantic search
MODEL_NAME = "all-MiniLM-L6-v2"
logger.info(f"Loading SBERT model: {MODEL_NAME}...")
model = SentenceTransformer(MODEL_NAME)
logger.info("SBERT model loaded successfully.")

class SimilarityRequest(BaseModel):
    source: str
    targets: list[str]

class SimilarityResponse(BaseModel):
    scores: list[float]

@app.post("/similarity", response_model=SimilarityResponse)
def calculate_similarity(req: SimilarityRequest):
    if not req.source or not req.targets:
        return SimilarityResponse(scores=[0.0 for _ in req.targets])
    
    try:
        # Encode source (e.g., student project tags/abstract)
        source_embedding = model.encode(req.source, convert_to_tensor=True)
        
        # Encode targets (e.g., guide expertise tags)
        target_embeddings = model.encode(req.targets, convert_to_tensor=True)
        
        # Calculate cosine similarity
        cosine_scores = util.cos_sim(source_embedding, target_embeddings)[0]
        
        # Convert tensor scores to standard floats and ensure they are between 0 and 1
        # The model returns values from -1 to 1. We'll clip negative scores to 0.
        scores = [max(0.0, float(score)) for score in cosine_scores]
        
        return SimilarityResponse(scores=scores)
    except Exception as e:
        logger.error(f"Error calculating similarity: {str(e)}")
        # Fallback in case of error
        return SimilarityResponse(scores=[0.0 for _ in req.targets])

@app.get("/health")
def health_check():
    return {"status": "ok", "model": MODEL_NAME}
