# Stage 1: Install dependencies and build the application
FROM node:18-alpine AS builder
WORKDIR /app

# Set environment to production for build optimizations if any
ENV NODE_ENV=production

# Copy package.json and lock file
# Ensure you have pnpm-lock.yaml if you are using pnpm
COPY package.json ./
COPY pnpm-lock.yaml ./
# If you were using npm, you'd copy package-lock.json
# COPY package-lock.json ./


# Enable Corepack and prepare pnpm (recommended for Node.js 16.10+)
RUN corepack enable
RUN corepack prepare pnpm@9 --activate # Use the major version from your pnpm-lock.yaml (e.g., pnpm@9)

# Install dependencies using pnpm
# The --frozen-lockfile flag is recommended for CI/CD to ensure reproducible builds
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
# Make sure you have a .dockerignore file to exclude unnecessary files (like .git, node_modules from host, .env)
COPY . .

# +++ Force cache invalidation for debugging +++
ARG CACHE_BUSTER_ARG=(date +%s)
RUN echo "Cache buster: ${CACHE_BUSTER_ARG}"
# +++ Add these lines for debugging +++
RUN echo "--- Listing /app contents ---"
RUN ls -R /app
RUN echo "--- Checking tsconfig.json ---"
RUN cat /app/tsconfig.json || echo "!!! tsconfig.json not found !!!"
RUN echo "--- Checking specific component paths ---"
RUN test -f /app/components/login-screen.tsx && echo "Found /app/components/login-screen.tsx" || echo "!!! /app/components/login-screen.tsx NOT FOUND !!!"
RUN test -f /app/components/chat-interface.tsx && echo "Found /app/components/chat-interface.tsx" || echo "!!! /app/components/chat-interface.tsx NOT FOUND !!!"
RUN test -f /app/components/theme-provider.tsx && echo "Found /app/components/theme-provider.tsx" || echo "!!! /app/components/theme-provider.tsx NOT FOUND !!!"
# Adjust .tsx to .ts or .jsx if your file extensions are different for these components.
RUN echo "--- Debugging complete ---"

# Build the Next.js application
RUN pnpm run build

# Prune development dependencies to reduce the size of node_modules copied to the next stage
RUN pnpm prune --prod

# Stage 2: Production image - only copy necessary artifacts
FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=production

# Copy built assets from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
# Copy the pruned node_modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Expose the port Next.js runs on (default is 3000)
EXPOSE 3000

# Set the user for the container to a non-root user for better security
# Create a non-root user and group called "appuser"
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Command to start the Next.js application
# This will use the start script defined in your package.json (usually `next start`)
CMD ["node_modules/.bin/next", "start"]
