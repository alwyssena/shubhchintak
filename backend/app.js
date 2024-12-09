const express = require("express");
const bcrypt = require("bcryptjs");  // To hash passwords
const jwt = require("jsonwebtoken");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();

// Assuming 'user.db' is your SQLite database
const dbPath = path.join(__dirname, 'taskmanger.db');
const cors = require('cors');
app.use(cors());

// Open the SQLite database connection
async function openDb() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
}

// Middleware to parse JSON requests
app.use(express.json());


const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1]; // Get the token from the Authorization header
  
    if (!token) {
      return res.status(403).json({ message: 'Access denied. No token provided.' });
    }
  
    jwt.verify(token, 'indra', (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
      }
      req.user = user;  // Add user info to the request object (user contains payload from the token)
      next();  // Proceed to the next middleware or route handler
    });
  };

// Simple email validation regex
const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

// POST route for user registration
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // Validate input fields
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }

  try {
    const db = await openDb();

    // Check if the email already exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10

    // Insert the new user with the hashed password
    const result = await db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);

    // Generate JWT token
    const payload = { id: result.lastID, name, email };
    const token = jwt.sign(payload, 'indra', { expiresIn: '1d' }); // Sign token with user info

    res.status(201).json({ message: 'User registered successfully', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    // Validate input fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
  
    try {
      const db = await openDb();
  
      // Check if the user exists
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  
      if (!user) {
        return res.status(400).json({ message: 'Invalid email or password.' });
      }
  
      // Compare the provided password with the stored hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
  
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Invalid email or password.' });
      }
  
      // Generate JWT token
      const payload = { id: user.id, name: user.name, email: user.email };
      const token = jwt.sign(payload, 'indra', { expiresIn: '1d' });  // You can replace 'indra' with your secret key
  
      res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });



  // GET /api/tasks: Fetch tasks for the logged-in user
app.get('/api/tasks', authenticateJWT, async (req, res) => {
    try {
      const db = await openDb();
      const userId = req.user.id; // Get the user ID from the token payload
  
      // Fetch tasks for the logged-in user (userId should be in the token payload)
      const tasks = await db.all('SELECT * FROM task WHERE user_id = ?', [userId]);
  
      if (!tasks) {
        return res.status(404).json({ message: 'No tasks found for this user.' });
      }
  
      res.status(200).json({ tasks });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error while fetching tasks.' });
    }
  });



  // POST /api/tasks: Create a new task
  app.post('/api/tasks', authenticateJWT, async (req, res) => {
    const { title, description, status } = req.body; // Get task details from the request body
    
    // Check if title is missing or empty
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Task title is required.' });
    }
  
    // Default the status to 'pending' if not provided
    const taskStatus = status || 'pending';
  
    try {
      const db = await openDb();
      const userId = req.user.id; // Get the userId from the JWT token payload
  
      // Insert the new task into the database
      const result = await db.run(
        'INSERT INTO tasks (user_id, title, description, status) VALUES (?, ?, ?, ?)',
        [userId, title, description || '', taskStatus]
      );
  
      // Fetch the newly created task to return
      const newTask = {
        id: result.lastID,
        user_id: userId,
        title,
        description: description || '',
        status: taskStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
  
      res.status(201).json({ message: 'Task created successfully', task: newTask });
    } catch (error) {
      console.error(error);
      
      // Check for specific errors, such as database errors
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ message: 'Constraint error, check input fields.' });
      }
      
      // General server error
      res.status(500).json({ message: 'Server error while creating task.' });
    }
  });
  
  
// Starting the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
