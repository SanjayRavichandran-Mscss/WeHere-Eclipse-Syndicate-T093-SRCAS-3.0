// const express = require('express');
// const cors = require('cors');
// const os = require('os');
// const http = require('http');
// const { Server } = require('socket.io');

// const { connectDB } = require('./config/db');
// const authRoutes = require('./routes/authRoutes');
// const sosRoutes = require('./routes/sosRoutes');
// const offlineRoutes = require('./routes/offlineRoutes');
// const feedRoutes = require('./routes/feedRoutes');
// const homeRoutes = require('./routes/homeRoutes');

// const ambulanceAlertRoutes = require('./routes/ambulanceAlertRoutes');
// const notificationRoutes = require('./routes/notificationRoutes');
// const sosController = require('./controllers/sosController');

// const app = express();
// const server = http.createServer(app);
// const PORT = 5000;

// app.use(express.json());

// // ────────────────────────────────────────────────
// //             GET ALL NETWORK IPS
// // ────────────────────────────────────────────────
// const getAllIps = () => {
//   const ips = [];
//   const interfaces = os.networkInterfaces();
  
//   for (const name of Object.keys(interfaces)) {
//     for (const iface of interfaces[name] || []) {
//       if (iface.family === 'IPv4' && !iface.internal) {
//         ips.push({
//           interface: name,
//           address: iface.address,
//         });
//       }
//     }
//   }
//   return ips;
// };

// const allIps = getAllIps();
// const primaryIp = allIps.length > 0 ? allIps[0].address : 'localhost';

// // ────────────────────────────────────────────────
// //                  CORS CONFIG
// // ────────────────────────────────────────────────
// const allowedOrigins = [
//   'http://localhost:19006',
//   'http://localhost:8081',
//   'http://localhost:5173',
//   'http://10.0.2.2:8081',
//   'http://10.0.2.2:5000',
//   'http://127.0.0.1:5000',
//   'http://127.0.0.1:5500',
//   `http://${primaryIp}:5000`,
//   // Add all found IPs to allowed origins
//   ...allIps.map(ip => `http://${ip.address}:5000`),
// ];

// // Remove duplicates
// const uniqueOrigins = [...new Set(allowedOrigins)];

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin) return callback(null, true);
//       if (origin.startsWith('exp://') || uniqueOrigins.includes(origin)) {
//         return callback(null, true);
//       }
//       console.warn(`[CORS] Blocked origin: ${origin}`);
//       return callback(new Error('Not allowed by CORS'));
//     },
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
//     optionsSuccessStatus: 204,
//   })
// );

// app.use('/api/auth', authRoutes);
// app.use('/api/sos', sosRoutes);
// app.use('/api/ambulance-alerts', ambulanceAlertRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/offline', offlineRoutes);
// app.use('/api/feed', feedRoutes);
// app.use('/api/home',homeRoutes);


// // ── Test endpoint to check server status ──
// app.get('/api/test', (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: 'Server is running',
//     timestamp: new Date().toISOString(),
//     serverIp: primaryIp,
//     allIps: allIps.map(ip => ip.address),
//   });
// });

// // ────────────────────────────────────────────────
// //                  SOCKET.IO SETUP
// // ────────────────────────────────────────────────
// const io = new Server(server, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST'],
//   },
// });

// app.set('io', io);

// io.on('connection', (socket) => {
//   console.log(`[Socket.IO] Client connected: ${socket.id}`);
//   socket.on('disconnect', () => {
//     console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
//   });
// });

// const startServer = async () => {
//   await connectDB();

//   // ── Sync active broadcast locations every 5 seconds ──
//   setInterval(async () => {
//     await sosController.syncAllActiveBroadcastLocations();
//   }, 5000);
//   console.log('[Broadcast Sync] Location poller started (every 5s)');

//   app.listen(PORT, '0.0.0.0', () => {
//     // Build the table
//     const rows = [];
    
//     // Localhost
//     rows.push(['Local', `http://localhost:${PORT}`]);
    
//     // All network IPs
//     allIps.forEach((ip, index) => {
//       const label = index === 0 ? 'Network' : '';
//       rows.push([label, `http://${ip.address}:${PORT}`]);
//     });
    
//     // Expo Go (highlighted)
//     if (allIps.length > 0) {
//       rows.push(['Expo Go', `http://${allIps[0].address}:${PORT}`]);
//     }

//     const title = '🚀 WeHere Backend Running on Port ' + PORT;
//     const labelWidth = Math.max(...rows.map((r) => r[0].length)) + 2;
//     const valueWidth = Math.max(...rows.map((r) => r[1].length), title.length) + 2;
//     const totalWidth = labelWidth + valueWidth + 3;

//     const pad = (str, len) => str + ' '.repeat(Math.max(0, len - str.length));

//     console.log('\n╔' + '═'.repeat(totalWidth) + '╗');
//     console.log('║ ' + pad(title, totalWidth - 1) + '║');
//     console.log('╠' + '═'.repeat(labelWidth + 1) + '╦' + '═'.repeat(valueWidth + 1) + '╣');

//     rows.forEach(([label, value]) => {
//       console.log(
//         '║ ' + pad(label, labelWidth) + '║ ' + pad(value, valueWidth) + '║'
//       );
//     });

//     console.log('╚' + '═'.repeat(labelWidth + 1) + '╩' + '═'.repeat(valueWidth + 1) + '╝');


//   });
// };

// startServer();













const express = require('express');
const cors = require('cors');
const os = require('os');
const http = require('http');
const { Server } = require('socket.io');

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const sosRoutes = require('./routes/sosRoutes');
const offlineRoutes = require('./routes/offlineRoutes');
const feedRoutes = require('./routes/feedRoutes');
const homeRoutes = require('./routes/homeRoutes');
const networksRoutes = require('./routes/networksRoutes');

const ambulanceAlertRoutes = require('./routes/ambulanceAlertRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const sosController = require('./controllers/sosController');
const activitiesRoutes = require('./routes/activitiesRoutes');
const supportRoutes = require('./routes/supportRoutes');


const app = express();
const server = http.createServer(app);
const PORT = 5000;

app.use(express.json());

// ────────────────────────────────────────────────
//             GET ALL NETWORK IPS
// ────────────────────────────────────────────────
const getAllIps = () => {
  const ips = [];
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({
          interface: name,
          address: iface.address,
        });
      }
    }
  }
  return ips;
};

const allIps = getAllIps();
const primaryIp = allIps.length > 0 ? allIps[0].address : 'localhost';

// ────────────────────────────────────────────────
//                  CORS CONFIG
// ────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:19006',
  'http://localhost:8081',
  'http://localhost:5173',
  'http://10.0.2.2:8081',
  'http://10.0.2.2:5000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5500',
  `http://${primaryIp}:5000`,
  // Add all found IPs to allowed origins
  ...allIps.map(ip => `http://${ip.address}:5000`),
];

// Remove duplicates
const uniqueOrigins = [...new Set(allowedOrigins)];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.startsWith('exp://') || uniqueOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  })
);

// ────────────────────────────────────────────────
//             SERVE STATIC FILES
// ────────────────────────────────────────────────
// This line allows access to files in the uploads folder
// Example: http://localhost:5000/uploads/posts/image.jpg
app.use('/uploads', express.static('uploads'));

// ────────────────────────────────────────────────
//                  ROUTES
// ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/ambulance-alerts', ambulanceAlertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/offline', offlineRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/networks', networksRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/support', supportRoutes);

// ── Test endpoint to check server status ──
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    serverIp: primaryIp,
    allIps: allIps.map(ip => ip.address),
  });
});

// ────────────────────────────────────────────────
//                  SOCKET.IO SETUP
// ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  await connectDB();

  // ── Sync active broadcast locations every 5 seconds ──
  setInterval(async () => {
    await sosController.syncAllActiveBroadcastLocations();
  }, 5000);
  console.log('[Broadcast Sync] Location poller started (every 5s)');

  server.listen(PORT, '0.0.0.0', () => {
    // Build the table
    const rows = [];
    
    // Localhost
    rows.push(['Local', `http://localhost:${PORT}`]);
    
    // All network IPs
    allIps.forEach((ip, index) => {
      const label = index === 0 ? 'Network' : '';
      rows.push([label, `http://${ip.address}:${PORT}`]);
    });
    
    // Expo Go (highlighted)
    if (allIps.length > 0) {
      rows.push(['Expo Go', `http://${allIps[0].address}:${PORT}`]);
    }

    const title = 'WeHere Backend Running on Port ' + PORT;
    const labelWidth = Math.max(...rows.map((r) => r[0].length)) + 2;
    const valueWidth = Math.max(...rows.map((r) => r[1].length), title.length) + 2;
    const totalWidth = labelWidth + valueWidth + 3;

    const pad = (str, len) => str + ' '.repeat(Math.max(0, len - str.length));

    console.log('\n╔' + '═'.repeat(totalWidth) + '╗');
    console.log('║ ' + pad(title, totalWidth - 1) + '║');
    console.log('╠' + '═'.repeat(labelWidth + 1) + '╦' + '═'.repeat(valueWidth + 1) + '╣');

    rows.forEach(([label, value]) => {
      console.log(
        '║ ' + pad(label, labelWidth) + '║ ' + pad(value, valueWidth) + '║'
      );
    });

    console.log('╚' + '═'.repeat(labelWidth + 1) + '╩' + '═'.repeat(valueWidth + 1) + '╝');
  });
};

startServer();