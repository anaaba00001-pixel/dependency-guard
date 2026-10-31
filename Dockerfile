FROM golang:1.27-alpine AS scanner
ARG OSV_SCANNER_VERSION=v2.7.0
RUN CGO_ENABLED=0 go install github.com/google/osv-scanner/v2/cmd/osv-scanner@${OSV_SCANNER_VERSION}
FROM node:24-alpine
RUN addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm install --omit=dev --workspace=@dependency-guard/api
COPY apps/api apps/api
COPY --from=scanner /go/bin/osv-scanner /usr/local/bin/osv-scanner
USER app
ENV NODE_ENV=production PORT=8080 OSV_SCANNER_PATH=/usr/local/bin/osv-scanner
EXPOSE 8080
CMD ["node","apps/api/src/server.js"]
