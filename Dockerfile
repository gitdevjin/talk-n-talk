# -----------------------------
# Stage 0: Install dependencies
# -----------------------------
FROM node:22.18-bookworm AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci




# -----------------------------
# Stage 1: Build the app
# -----------------------------
FROM node:22.18-bookworm AS build

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json ./package.json
COPY --from=dependencies /app/package-lock.json ./package-lock.json

# Copy source code and config files
COPY ./src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Build TypeScript → JavaScript
RUN npm run build




# -----------------------------
# Stage 2: Deploy / Production
# -----------------------------
FROM node:22.18-bookworm AS deploy

WORKDIR /app

# Copy compiled files and production dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

# Install only production dependencies
RUN npm ci --omit=dev

# Expose default NestJS port
EXPOSE 3000

# Start the app
CMD ["node", "dist/main.js"]