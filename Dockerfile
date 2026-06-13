# Use official Bun image
FROM oven/bun:1.3.14-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --production

# Copy source code
COPY src ./src

# Create directory for scan results
RUN mkdir -p /root/.codeprobe/scans

# Expose port (Cloud Run uses PORT env var, defaults to 8080)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun run src/cli/index.ts --version || exit 1

# Start the API server
CMD ["bun", "run", "src/api/server.ts"]
