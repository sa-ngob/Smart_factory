####
# Multi-stage Dockerfile สำหรับโครงการ Node.js
# - Stage 1: ติดตั้ง dependencies และ build ไฟล์ (ถ้ามีขั้นตอน build)
# - Stage 2: เตรียม image สำหรับ production (ลดขนาด และ ใช้ non-root user)
####

### Stage 1: Builder
FROM node:18-alpine AS builder
WORKDIR /home/node/app

# คัดลอกเฉพาะ package.json และ package-lock.json ก่อน เพื่อให้มี cache layer ของ npm
COPY package*.json ./

# ติดตั้ง dependencies (ถ้ามี lockfile จะใช้ npm ci)
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --production; fi

### Stage 2: Production image
FROM node:18-alpine
WORKDIR /home/node/app

# เราจะ copy ไฟล์ node_modules จาก stage ก่อน
COPY --from=builder /home/node/app/node_modules ./node_modules

# คัดลอกโค้ดโปรเจกต์ทั้งหมดลงใน image
COPY . .

# Ensure files are owned by the non-root node user
RUN chown -R node:node /home/node/app

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=3000

# สร้าง non-root user เพื่อรันแอป (alpine image มี user 'node')
USER node

# เปิด port ที่ใช้
EXPOSE 3000

# ใช้ command ที่เป็นมาตรฐานสำหรับรันแอป
CMD [ "node", "server.js" ]