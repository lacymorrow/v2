FROM node:20-slim AS builder
ARG OPENAI_API_KEY
ENV OPENAI_API_KEY=${OPENAI_API_KEY}

# Install build dependencies for native module compilation
RUN apt-get update && apt-get install -y python3 python3-distutils build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies using pnpm
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN pnpm run build

FROM node:20-slim
ARG OPENAI_API_KEY
ENV OPENAI_API_KEY=${OPENAI_API_KEY}

# Install runtime dependencies
RUN apt-get update && apt-get install -y python3 python3-distutils build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built application from the builder stage
COPY --from=builder /app ./

# Expose default port (Railway will use env PORT variable if provided)
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
