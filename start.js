#!/usr/bin/env node
/**
 * ============================================
 * CRM System - Startup Script (Node.js - Cross-platform)
 * ============================================
 * This script starts both the frontend and backend services
 * Works on Windows, macOS, and Linux
 * ============================================
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  colorLog('green', `✓ ${message}`);
}

function info(message) {
  colorLog('cyan', `ℹ ${message}`);
}

function warning(message) {
  colorLog('yellow', `⚠ ${message}`);
}

function error(message) {
  colorLog('red', `✗ ${message}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const skipDeps = args.includes('--skip-deps');
const skipMigrate = args.includes('--skip-migrate');
const skipDb = args.includes('--skip-db');
const apiOnly = args.includes('--api-only');
const webOnly = args.includes('--web-only');

// Print header
console.log('');
colorLog('cyan', '============================================');
colorLog('cyan', '  CRM System - Startup Script');
colorLog('cyan', '============================================');
console.log('');

// Check Node.js version
info('Checking Node.js installation...');
const nodeVersion = process.version;
const nodeMajorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (nodeMajorVersion < 20) {
  error(`Node.js version 20 or higher is required. Current version: ${nodeVersion}`);
  process.exit(1);
}
success(`Node.js ${nodeVersion} found`);

// Check pnpm
info('Checking pnpm installation...');
const checkPnpm = spawn('pnpm', ['--version'], { shell: true, stdio: 'pipe' });

checkPnpm.on('close', (code) => {
  const pnpmInstalled = code === 0;
  
  if (!pnpmInstalled) {
    warning('pnpm not found. Attempting to use npm...');
    const useNpm = spawn('npm', ['--version'], { shell: true, stdio: 'pipe' });
    useNpm.on('close', (npmCode) => {
      if (npmCode !== 0) {
        error('Neither pnpm nor npm found. Please install pnpm: npm install -g pnpm');
        process.exit(1);
      }
      warning('Using npm instead of pnpm. Consider installing pnpm for better performance.');
      runSetup('npm');
    });
  } else {
    runSetup('pnpm');
  }
});

function runSetup(packageManager) {
  // Check environment files
  info('Checking environment configuration...');
  const envFiles = ['.env', 'apps/api/.env', 'apps/web/.env.local'];
  const missingFiles = envFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    warning('The following environment files are missing:');
    missingFiles.forEach(file => warning(`  - ${file}`));
    warning('Please create them from the template: docs/environment-template.txt');
    warning('Continuing anyway, but the application may not work correctly...');
  }

  // Install dependencies
  if (!skipDeps) {
    info('Installing dependencies...');
    const install = spawn(packageManager, ['install'], {
      shell: true,
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    
    install.on('close', (code) => {
      if (code !== 0) {
        error('Failed to install dependencies');
        process.exit(1);
      }
      success('Dependencies installed successfully');
      continueSetup(packageManager);
    });
  } else {
    info('Skipping dependency installation (--skip-deps flag set)');
    continueSetup(packageManager);
  }
}

function continueSetup(packageManager) {
  // Start Docker services if needed
  if (!skipDb && !webOnly) {
    startDockerServices(packageManager);
  } else {
    generatePrismaClient(packageManager);
  }
}

function startDockerServices(packageManager) {
  info('Starting database services (Docker)...');
  
  // Check if Docker is installed
  const checkDocker = spawn('docker', ['--version'], { shell: true, stdio: 'pipe' });
  
  checkDocker.on('close', (code) => {
    if (code !== 0) {
      warning('Docker is not installed or not running.');
      warning('Please install Docker Desktop from https://www.docker.com/products/docker-desktop/');
      warning('Skipping database startup. Make sure PostgreSQL and Redis are running manually.');
      generatePrismaClient(packageManager);
      return;
    }
    
    // Check if docker-compose.yml exists
    if (!fs.existsSync('docker-compose.yml')) {
      warning('docker-compose.yml not found. Skipping Docker services.');
      warning('Make sure PostgreSQL and Redis are running manually.');
      generatePrismaClient(packageManager);
      return;
    }
    
    // Check if services are already running
    const checkRunning = spawn('docker-compose', ['ps', '--services', '--filter', 'status=running'], {
      shell: true,
      stdio: 'pipe',
    });
    
    let output = '';
    checkRunning.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    checkRunning.on('close', (checkCode) => {
      const isRunning = output.includes('postgres') || output.includes('redis');
      
      if (isRunning) {
        info('Database services are already running.');
        generatePrismaClient(packageManager);
      } else {
        info('Starting PostgreSQL and Redis containers...');
        const startDocker = spawn('docker-compose', ['up', '-d', 'postgres', 'redis'], {
          shell: true,
          stdio: 'inherit',
        });
        
        startDocker.on('close', (startCode) => {
          if (startCode !== 0) {
            warning('Failed to start Docker services.');
            warning('Make sure Docker is running and try manually: docker-compose up -d');
            generatePrismaClient(packageManager);
          } else {
            info('Waiting for database services to be ready...');
            waitForDockerServices(packageManager);
          }
        });
      }
    });
  });
}

function waitForDockerServices(packageManager, retryCount = 0) {
  const maxRetries = 30;
  
  if (retryCount >= maxRetries) {
    warning('Services may not be fully ready. Continuing anyway...');
    generatePrismaClient(packageManager);
    return;
  }
  
  setTimeout(() => {
    const checkHealth = spawn('docker-compose', ['ps'], { shell: true, stdio: 'pipe' });
    let output = '';
    
    checkHealth.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    checkHealth.on('close', () => {
      const postgresHealthy = output.includes('postgres') && (output.includes('healthy') || output.includes('Up'));
      const redisHealthy = output.includes('redis') && (output.includes('healthy') || output.includes('Up'));
      
      if (postgresHealthy && redisHealthy) {
        success('Database services are healthy and ready!');
        generatePrismaClient(packageManager);
      } else {
        info(`Waiting for services... (${retryCount + 1}/${maxRetries})`);
        waitForDockerServices(packageManager, retryCount + 1);
      }
    });
  }, 2000);
}

function generatePrismaClient(packageManager) {
  // Run database migrations (optional)
  if (!skipMigrate && !webOnly) {
    info('Checking database migrations...');
    info('Note: Run \'pnpm db:migrate\' manually if you need to run migrations');
  }
  
  // Generate Prisma client if needed
  if (!webOnly) {
    info('Generating Prisma client...');
    const generate = spawn(packageManager, ['run', 'db:generate'], {
      shell: true,
      stdio: 'inherit',
      cwd: path.join(process.cwd(), 'apps/api'),
    });
    
    generate.on('close', (code) => {
      if (code === 0) {
        success('Prisma client generated');
      } else {
        warning('Failed to generate Prisma client. Continuing anyway...');
      }
      startServices(packageManager);
    });
  } else {
    startServices(packageManager);
  }
}

function startServices(packageManager) {
  console.log('');
  colorLog('cyan', 'Starting CRM System...');
  console.log('');

  if (apiOnly) {
    info('Starting API backend only...');
    info('  - Backend API: http://localhost:4000');
    console.log('');
    colorLog('yellow', 'Press Ctrl+C to stop the service');
    console.log('');
    
    const dev = spawn(packageManager, ['run', 'dev'], {
      shell: true,
      stdio: 'inherit',
      cwd: path.join(process.cwd(), 'apps/api'),
    });

    dev.on('close', (code) => {
      process.exit(code || 0);
    });
  } else if (webOnly) {
    info('Starting frontend only...');
    info('  - Frontend: http://localhost:3000');
    console.log('');
    colorLog('yellow', 'Press Ctrl+C to stop the service');
    console.log('');
    
    const dev = spawn(packageManager, ['run', 'dev'], {
      shell: true,
      stdio: 'inherit',
      cwd: path.join(process.cwd(), 'apps/web'),
    });

    dev.on('close', (code) => {
      process.exit(code || 0);
    });
  } else {
    info('Starting both frontend and backend...');
    info('  - Frontend: http://localhost:3000');
    info('  - Backend API: http://localhost:4000');
    console.log('');
    colorLog('yellow', 'Press Ctrl+C to stop all services');
    console.log('');
    
    const dev = spawn(packageManager, ['run', 'dev'], {
      shell: true,
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      info('Shutting down application services...');
      dev.kill('SIGINT');
      setTimeout(() => {
        info('Note: Docker services (PostgreSQL, Redis) are still running.');
        info('To stop them, run: docker-compose down');
        success('Application services stopped');
        process.exit(0);
      }, 1000);
    });

    dev.on('close', (code) => {
      process.exit(code || 0);
    });
  }
}

