# Use official Bun runtime as base image
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --production

# Copy application code
COPY src ./src

# Expose port (Cloud Run requires this)
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Start the API server
CMD ["bun", "run", "src/api/server.ts"]
