FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for OpenCV, pyMuPDF, chromadb etc)
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . /app/backend/

# Set working directory to backend so imports work correctly
WORKDIR /app/backend

# Variables environment
ENV EDEN_DATA_DIR=/app/data
ENV EDEN_BACKEND_HOST=0.0.0.0
ENV EDEN_BACKEND_PORT=8000
ENV PYTHONPATH=/app/backend

# Create data directory
RUN mkdir -p /app/data

EXPOSE 8000

CMD ["python", "main.py"]
