# Production Deployment Guide

Guide for deploying the local-dev MCP server to production environments.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Options](#deployment-options)
3. [Environment Configuration](#environment-configuration)
4. [Security Hardening](#security-hardening)
5. [Monitoring & Logging](#monitoring--logging)
6. [Backup & Recovery](#backup--recovery)
7. [Performance Tuning](#performance-tuning)
8. [Maintenance](#maintenance)

---

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] Code reviewed and approved
- [ ] Dependencies audited: `npm audit`
- [ ] Environment variables configured
- [ ] Security hardening applied
- [ ] Monitoring set up
- [ ] Backup strategy defined
- [ ] Rollback plan ready
- [ ] Documentation updated

---

## Deployment Options

### Option 1: Windows Service (Recommended for Windows)

Use `node-windows` to run as a system service:

#### Installation

```bash
npm install -g node-windows
npm link node-windows
```

#### Create Service Script

**create-service.js:**
```javascript
const Service = require('node-windows').Service;

// Create service object
const svc = new Service({
  name: 'Local Dev MCP Server',
  description: 'MCP server for local development integration',
  script: 'C:\\Projects\\mcp-server\\dist\\index.js',
  nodeOptions: [
    '--max-old-space-size=2048'  // 2GB heap
  ],
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    },
    {
      name: "LOG_LEVEL",
      value: "info"
    }
  ]
});

// Event handlers
svc.on('install', () => {
  console.log('Service installed successfully');
  svc.start();
});

svc.on('start', () => {
  console.log('Service started');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

// Install the service
svc.install();
```

#### Usage

```bash
# Install service
node create-service.js

# Manage service via Windows Services
services.msc
# Look for "Local Dev MCP Server"
```

#### Uninstall

**uninstall-service.js:**
```javascript
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'Local Dev MCP Server',
  script: 'C:\\Projects\\mcp-server\\dist\\index.js'
});

svc.on('uninstall', () => {
  console.log('Service uninstalled');
});

svc.uninstall();
```

---

### Option 2: PM2 Process Manager (Cross-Platform)

PM2 provides process management, monitoring, and auto-restart.

#### Installation

```bash
npm install -g pm2
```

#### Configuration

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'mcp-local-dev',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

#### Usage

```bash
# Start server
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs mcp-local-dev

# Restart
pm2 restart mcp-local-dev

# Stop
pm2 stop mcp-local-dev

# Save process list
pm2 save

# Auto-start on system boot
pm2 startup
# Follow the instructions output by the command
```

#### Management Commands

```bash
# List all processes
pm2 list

# Show process details
pm2 show mcp-local-dev

# Flush logs
pm2 flush

# Reload (zero-downtime)
pm2 reload mcp-local-dev

# Delete from PM2
pm2 delete mcp-local-dev
```

---

### Option 3: Docker Container

Containerize for consistent deployment across environments.

#### Dockerfile

```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled code
COPY dist ./dist

# Set environment
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')"

# Run server
CMD ["node", "dist/index.js"]
```

#### Build and Run

```bash
# Build image
docker build -t mcp-local-dev:1.0.0 .

# Run container
docker run -d \
  --name mcp-local-dev \
  --restart unless-stopped \
  -v /path/to/data:/app/data \
  mcp-local-dev:1.0.0

# View logs
docker logs -f mcp-local-dev

# Stop container
docker stop mcp-local-dev

# Remove container
docker rm mcp-local-dev
```

#### Docker Compose

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    container_name: mcp-local-dev
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('healthy')"]
      interval: 30s
      timeout: 3s
      retries: 3
```

Usage:
```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

---

### Option 4: Systemd Service (Linux)

For Linux servers using systemd.

#### Service File

**/etc/systemd/system/mcp-local-dev.service:**
```ini
[Unit]
Description=Local Dev MCP Server
After=network.target

[Service]
Type=simple
User=mcp
Group=mcp
WorkingDirectory=/opt/mcp-server
ExecStart=/usr/bin/node /opt/mcp-server/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mcp-local-dev

Environment=NODE_ENV=production
Environment=LOG_LEVEL=info

[Install]
WantedBy=multi-user.target
```

#### Setup

```bash
# Create user
sudo useradd -r -s /bin/false mcp

# Copy files
sudo mkdir -p /opt/mcp-server
sudo cp -r dist package.json node_modules /opt/mcp-server/
sudo chown -R mcp:mcp /opt/mcp-server

# Install service
sudo cp mcp-local-dev.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mcp-local-dev
sudo systemctl start mcp-local-dev

# Check status
sudo systemctl status mcp-local-dev

# View logs
sudo journalctl -u mcp-local-dev -f
```

---

## Environment Configuration

### Production Environment Variables

Create `.env.production`:

```bash
# Server Configuration
NODE_ENV=production
MCP_SERVER_NAME=local-dev-mcp-server
MCP_SERVER_VERSION=1.0.0

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/mcp-server/app.log

# Performance
MAX_CONCURRENT_REQUESTS=10
REQUEST_TIMEOUT=30000
MAX_FILE_SIZE=10485760

# Storage
DATA_DIR=/var/lib/mcp-server/data
TEMP_DIR=/tmp/mcp-server
TASK_FILE=/var/lib/mcp-server/tasks.json

# Features
ENABLE_FILE_OPS=true
ENABLE_TASKS=true
ENABLE_DOCS=true
```

### Loading Environment Variables

**src/config.ts:**
```typescript
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment-specific config
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
config({ path: resolve(process.cwd(), envFile) });

export const CONFIG = {
  server: {
    name: process.env.MCP_SERVER_NAME || 'local-dev-mcp-server',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE,
  },
  performance: {
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '10'),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
  },
  storage: {
    dataDir: process.env.DATA_DIR || './data',
    tempDir: process.env.TEMP_DIR || './tmp',
    taskFile: process.env.TASK_FILE || './tasks.json',
  },
  features: {
    fileOps: process.env.ENABLE_FILE_OPS === 'true',
    tasks: process.env.ENABLE_TASKS === 'true',
    docs: process.env.ENABLE_DOCS === 'true',
  }
};
```

---

## Security Hardening

### 1. Input Validation

Always validate all inputs:

```typescript
import { z } from 'zod';

const PathSchema = z.string()
  .min(1)
  .max(255)
  .regex(/^[a-zA-Z0-9\/\\_.-]+$/, 'Invalid path characters');

function validatePath(path: string): string {
  return PathSchema.parse(path);
}
```

### 2. Path Traversal Prevention

```typescript
import { resolve, normalize, relative } from 'path';

function isSafePath(basePath: string, targetPath: string): boolean {
  const normalizedBase = resolve(basePath);
  const normalizedTarget = resolve(targetPath);
  const relativePath = relative(normalizedBase, normalizedTarget);
  
  // Prevent '..' escaping base directory
  return !relativePath.startsWith('..') && !relativePath.startsWith('/');
}

// Usage
if (!isSafePath('/allowed/directory', userProvidedPath)) {
  throw new Error('Invalid path: directory traversal detected');
}
```

### 3. Rate Limiting

```typescript
class RateLimiter {
  private requests = new Map<string, number[]>();
  private maxRequests = 100;
  private windowMs = 60000; // 1 minute
  
  checkLimit(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(
      ts => now - ts < this.windowMs
    );
    
    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }
    
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }
}

const limiter = new RateLimiter();

// In tool handler
if (!limiter.checkLimit('tool-name')) {
  return {
    content: [{
      type: 'text',
      text: 'Rate limit exceeded. Please try again later.'
    }],
    isError: true
  };
}
```

### 4. Sanitize Error Messages

Never expose internal details:

```typescript
function sanitizeError(error: Error): string {
  if (process.env.NODE_ENV === 'production') {
    // Generic message in production
    return 'An error occurred. Please try again.';
  } else {
    // Detailed message in development
    return error.message;
  }
}
```

### 5. Secure File Permissions

```bash
# Set restrictive permissions on sensitive files
chmod 600 .env.production
chmod 600 tasks.json
chmod 700 data/

# Ensure log files are writable but not world-readable
chmod 640 logs/*.log
```

---

## Monitoring & Logging

### 1. Structured Logging

**logger.ts:**
```typescript
import { appendFileSync } from 'fs';

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel;
  private logFile?: string;
  
  constructor(level: string = 'info', logFile?: string) {
    this.level = LogLevel[level.toUpperCase() as keyof typeof LogLevel];
    this.logFile = logFile;
  }
  
  private log(level: LogLevel, message: string, meta?: any) {
    if (level < this.level) return;
    
    const entry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      meta
    };
    
    const formatted = JSON.stringify(entry);
    
    // Write to stderr
    console.error(formatted);
    
    // Write to file if configured
    if (this.logFile) {
      appendFileSync(this.logFile, formatted + '\n');
    }
  }
  
  debug(message: string, meta?: any) {
    this.log(LogLevel.DEBUG, message, meta);
  }
  
  info(message: string, meta?: any) {
    this.log(LogLevel.INFO, message, meta);
  }
  
  warn(message: string, meta?: any) {
    this.log(LogLevel.WARN, message, meta);
  }
  
  error(message: string, meta?: any) {
    this.log(LogLevel.ERROR, message, meta);
  }
}

export const logger = new Logger(
  process.env.LOG_LEVEL,
  process.env.LOG_FILE
);
```

### 2. Performance Metrics

```typescript
class Metrics {
  private counters = new Map<string, number>();
  private timings = new Map<string, number[]>();
  
  increment(name: string, value: number = 1) {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }
  
  timing(name: string, duration: number) {
    const timings = this.timings.get(name) || [];
    timings.push(duration);
    this.timings.set(name, timings);
  }
  
  getStats() {
    const stats: any = { counters: {}, timings: {} };
    
    // Counters
    this.counters.forEach((value, key) => {
      stats.counters[key] = value;
    });
    
    // Timings
    this.timings.forEach((values, key) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      stats.timings[key] = { avg, min, max, count: values.length };
    });
    
    return stats;
  }
}

export const metrics = new Metrics();

// Usage in tool
const start = Date.now();
// ... tool execution
const duration = Date.now() - start;
metrics.timing('tool.read-file', duration);
metrics.increment('tool.read-file.calls');
```

### 3. Health Check Endpoint

Add basic health monitoring:

```typescript
// In main()
setInterval(() => {
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics: metrics.getStats()
  };
  
  logger.info('Health check', health);
}, 60000); // Every minute
```

---

## Backup & Recovery

### 1. Backup Strategy

**backup.sh:**
```bash
#!/bin/bash

BACKUP_DIR="/var/backups/mcp-server"
DATA_DIR="/var/lib/mcp-server"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup data
tar -czf "$BACKUP_DIR/data_$TIMESTAMP.tar.gz" "$DATA_DIR"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "data_*.tar.gz" -mtime +7 -delete

echo "Backup completed: data_$TIMESTAMP.tar.gz"
```

### 2. Automated Backups

**Cron job** (Linux):
```bash
# Edit crontab
crontab -e

# Add backup job (daily at 2 AM)
0 2 * * * /opt/mcp-server/backup.sh >> /var/log/mcp-backup.log 2>&1
```

**Task Scheduler** (Windows):
```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\Scripts\backup.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "MCP Server Backup" -Action $action -Trigger $trigger
```

### 3. Recovery Procedure

```bash
# Stop server
pm2 stop mcp-local-dev

# Restore data
cd /var/lib/mcp-server
tar -xzf /var/backups/mcp-server/data_20240130_020000.tar.gz

# Restart server
pm2 start mcp-local-dev

# Verify
pm2 logs mcp-local-dev
```

---

## Performance Tuning

### 1. Node.js Optimization

```bash
# Increase heap size
node --max-old-space-size=2048 dist/index.js

# Enable performance profiling
node --prof dist/index.js

# Analyze profile
node --prof-process isolate-*.log > processed.txt
```

### 2. Connection Pooling

For database or API connections:

```typescript
class ConnectionPool {
  private pool: any[] = [];
  private maxSize = 10;
  
  async acquire(): Promise<any> {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    
    if (this.pool.length < this.maxSize) {
      return await this.createConnection();
    }
    
    // Wait for available connection
    await this.waitForConnection();
    return this.acquire();
  }
  
  release(connection: any) {
    this.pool.push(connection);
  }
}
```

### 3. Caching Strategy

```typescript
class Cache {
  private store = new Map<string, { value: any; expires: number }>();
  
  set(key: string, value: any, ttlMs: number = 3600000) {
    this.store.set(key, {
      value,
      expires: Date.now() + ttlMs
    });
  }
  
  get(key: string): any | null {
    const entry = this.store.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  clear() {
    this.store.clear();
  }
}
```

---

## Maintenance

### Regular Maintenance Tasks

**Weekly:**
```bash
# Check logs for errors
grep -i error /var/log/mcp-server/app.log

# Monitor disk usage
df -h /var/lib/mcp-server

# Review metrics
pm2 show mcp-local-dev
```

**Monthly:**
```bash
# Update dependencies
npm outdated
npm update

# Security audit
npm audit
npm audit fix

# Rebuild
npm run build

# Restart with new version
pm2 restart mcp-local-dev
```

**Quarterly:**
```bash
# Major version updates
npm install @modelcontextprotocol/sdk@latest
npm install zod@latest

# Full test suite
npm test

# Review and update documentation
```

### Monitoring Checklist

- [ ] CPU usage < 70%
- [ ] Memory usage < 80%
- [ ] Disk space available > 20%
- [ ] No error spikes in logs
- [ ] Response times < 1s
- [ ] Uptime > 99.9%
- [ ] Backups completing successfully

---

## Rollback Plan

If deployment fails:

1. **Stop new version**
   ```bash
   pm2 stop mcp-local-dev
   ```

2. **Restore previous version**
   ```bash
   cd /opt/mcp-server
   rm -rf dist node_modules
   tar -xzf backups/mcp-server-v1.0.0.tar.gz
   ```

3. **Restore data**
   ```bash
   tar -xzf /var/backups/mcp-server/data_latest.tar.gz
   ```

4. **Restart**
   ```bash
   pm2 start mcp-local-dev
   ```

5. **Verify**
   ```bash
   pm2 logs mcp-local-dev --lines 50
   ```

---

## Production Checklist

Before going live:

- [ ] Environment variables set correctly
- [ ] Security hardening applied
- [ ] Monitoring configured
- [ ] Logging working
- [ ] Backups automated
- [ ] Health checks passing
- [ ] Performance tested
- [ ] Documentation updated
- [ ] Team trained
- [ ] Rollback plan tested

---

**Deploy with confidence! 🚀**
