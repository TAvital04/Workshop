const WebSocket = require('ws');
const { Pool } = require('pg');

process.env.TZ = 'UTC';

// Create a pool instance set up for our time-series database, QuestDB
const pool = new Pool({
  host: '127.0.0.1',
  port: 8812,
  user: 'admin',
  password: 'quest',
  database: 'qdb',
  max: 10,
  idleTimeoutMillis: 30000
});

// Create a web socket instance that will send the data to the front end (the client)
const wss = new WebSocket.Server({ port: 8080 });

// Create a reference to all the clients that will connect to the pool
const clients = new Set();

// Create a reference to the time stamp of the latest message from the pool
let lastTimestamp = null;

// Function to perform when the web socket client connects to a web socket server
wss.on('connection', (ws) => {
  // Announce the connection
  console.log('Client connected');

  // Add the web socket client to the set of clients
  clients.add(ws);

  // Signify that no data base been received yet
  lastTimestamp = null;

  // Function to perform when the web socket client disconnects from the web socket server
  ws.on('close', () => {
    // Announce the disconnection
    console.log('Client disconnected');

    // Remove the web socket client from the set of clients
    clients.delete(ws);
  });

  // Function to perform upon an error between the web socket client and web socket server
  ws.on('error', (error) => {
    // Announce the error
    console.error('WebSocket error:', error);

    // Remove the web socket from the set of clients
    clients.delete(ws);
  });
});

// A function that repeatedly sends a message from the pool to all the clients that the web socket
  // server is connected to
const broadcast = async () => {
  // If there are no clients, do nothing
  if (clients.size === 0) return;

  // There are clients, try to send the message
  try {
    // Prepare a query based on whether one has been made before
    const query = lastTimestamp ?
      // If one has been made before, start sending data over from the time stamp of the last query
      'SELECT * FROM sin-table WHERE timestamp > $1 ORDER BY timestamp ASC' :

      // Else, send all of the data in the table
      'SELECT * FROM sin-table ORDER BY timestamp ASC';

    // Send an array of all the parameters, where there is one, $1, which is a reference to the
      // latest time stamp
    const params = lastTimestamp ? [lastTimestamp] : [];

    // Store the query result
    const result = await pool.query(query, params);

    // If there is data in the query response, send all of it
    if (result.rows.length > 0) {
      // Create a message instance that will be sent
      const message = {
        type: 'update',
        data: result.rows
      };

      // Recreate the message instance as a JSON object
      const messageString = JSON.stringify(message);

      // Send the JSON object to every web socket client in the set of web socket clients
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageString);
        }
      });

      // Set the latest time stamp to the time stamp of the last row of data sent
      lastTimestamp = result.rows[result.rows.length - 1].timestamp;

      // Announce the broadcast
      console.log(`Broadcasted ${result.rows.length} data points to ${clients.size} clients`);
    }
  } catch (error) {
    console.error('Broadcast error:', error);
  }
};

// Call the broadcast function at 60Hz
setInterval(broadcast, 16.67);

// Function to perform when the web socket server starts listening for clients
wss.on('listening', () => {
  // Announce server configurations
  console.log('WebSocket server listening on port 8080');
  console.log('Polling at 60Hz');
});

// Function to perform to close the web socket server
process.on('SIGINT', async () => {
  // Announce server shut down
  console.log('Shutting down...');

  // Close every web socket client in the set of web socket clients
  clients.forEach(client => client.close());

  // Close the pool
  await pool.end();

  // Close the server
  process.exit(0);
});