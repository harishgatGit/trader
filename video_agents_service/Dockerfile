FROM node:20-slim AS node-base

FROM python:3.11-slim

# Copy Node binary and npm
COPY --from=node-base /usr/local/bin/node /usr/local/bin/node
COPY --from=node-base /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && \
    ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# Install system dependencies (including ffmpeg and headless Chrome requirements for Remotion)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libgbm1 \
    libasound2 \
    libxrandr2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrender1 \
    libxtst6 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libfontconfig1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Install Remotion packages
RUN cd templates/remotion && npm install

ENV PORT=8090
ENV OUTPUT_BASE_DIR=/outputs/videos
ENV FFMPEG_PATH=ffmpeg
ENV FFPROBE_PATH=ffprobe

EXPOSE 8090

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090"]
