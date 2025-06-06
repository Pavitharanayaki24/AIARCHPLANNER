import express from 'express';
import cors from 'cors';
import { toHtml, toImage } from './Flow.js';
import { validateRFQueryParams, validateRFJsonBody } from './middleware.js';

const findAvailablePort = async (startPort) => {
  const net = await import('net');
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
};

const app = express();

// Enable CORS for all routes with proper error handling
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST'],
  credentials: true
}));

// Add body parsing middleware with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.get('/', [validateRFQueryParams], handler);
app.post('/', [validateRFJsonBody], handler);

// Route to get current port
app.get('/port', (req, res) => {
  res.json({ port: app.get('port') });
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware - MUST be defined after routes
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Send a more descriptive error
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack 
  });
});

// Start server - force port 8080 if it's available
const startServer = async () => {
  try {
    // First try port 8080 explicitly
    let port = 8080;
    try {
      const server = require('net').createServer();
      await new Promise((resolve, reject) => {
        server.once('error', (err) => {
          console.log(`Port ${port} is not available, trying alternatives...`);
          resolve(false);
        });
        server.once('listening', () => {
          server.close();
          resolve(true);
        });
        server.listen(port);
      }).then(available => {
        if (!available) {
          // If 8080 isn't available, find another port
          port = null;
        }
      });
    } catch (err) {
      console.log(`Error checking port 8080: ${err.message}`);
      port = null;
    }
    
    // If 8080 isn't available, find another port
    if (port === null) {
      port = await findAvailablePort(8081);
    }
    
    app.set('port', port);
    
    app.listen(port, () => {
      console.log(`✅ Server is running on port ${port}...`);
      console.log(`📋 Server health check available at: http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

async function handler(req, res, next) {
  try {
    const flow = res.locals.flow;
    
    console.log(`Processing ${flow.type} request with ${flow.nodes.length} nodes and ${flow.edges?.length || 0} edges`);

    switch (flow.type) {
      case 'html': {
        const html = await toHtml(flow);
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
        break;
      }

      case 'png': {
        const imageBuffer = await toImage(flow, 'png');
        res.setHeader('Content-Type', 'image/png');
        res.status(200).send(imageBuffer);
        break;
      }

      case 'jpg': {
        const imageBuffer = await toImage(flow, 'jpeg');
        res.setHeader('Content-Type', 'image/jpeg');
        res.status(200).send(imageBuffer);
        break;
      }

      default:
        res.status(400).json({ error: 'Invalid type specified' });
    }
  } catch (error) {
    console.error('Error in request handler:', error);
    next(error); // Pass to error middleware
  }
} 