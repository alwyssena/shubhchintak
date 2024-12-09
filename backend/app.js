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
app.post('/api/auth/register', async (req, res) => {
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


app.post('/api/auth/login', async (req, res) => {
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



  app.post('/api/tasks', authenticateJWT, async (req, res) => {
    console.log(req.body);  // Log the request body to check for undefined values

const { title, description, status } = req.body;

    // Validate that title is provided
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Task title is required.' });
    }
  
    // Default status to 'pending' if not provided
    const taskStatus = status || 'pending';
  
    try {
      const db = await openDb();
      const userId = req.user.id; // Get the userId from the JWT token payload
  
      // Insert the new task into the database
      const result = await db.run(
        'INSERT INTO task (user_id, title, description, status) VALUES (?, ?, ?, ?)',
        [userId, title, description || '', taskStatus]  // Ensure description is defaulted if missing
      );
  
      // Return the newly created task
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
  
      // Catch the error and return a proper message
      if (error.code === 'SQLITE_ERROR') {
        return res.status(400).json({ message: `Database error: ${error.message}` });
      }
  
      res.status(500).json({ message: 'Server error while creating task.' });
    }
  });
  
  // app.put('/api/tasks/:id', authenticateJWT, async (req, res) => {
  //   const { id } = req.params; // Extract task ID from URL
  //   const { title, description, status } = req.body; // Extract updated task details from request body
  // console.log(req.body)
  //   // Validate the inputs
  //   if (!title || title.trim() === '') {
  //     return res.status(400).json({ message: 'Task title is required.' });
  //   }
  
  //   const updatedStatus = status || 'pending'; // Default to 'pending' if status is not provided
  
  //   try {
  //     const db = await openDb();
  //     const userId = req.user.id;  // Extract user ID from JWT token payload
  
  //     // Check if the task exists for the current user
  //     const existingTask = await db.get(
  //       'SELECT * FROM task WHERE id = ? AND user_id = ?',
  //       [id, userId]
  //     );
  
  //     if (!existingTask) {
  //       return res.status(404).json({ message: 'Task not found or you are not authorized to update it.' });
  //     }
  
  //     // Update the task in the database
  //     const result = await db.run(
  //       'UPDATE task SET title = ?, description = ?, status = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  //       [title, description || '', updatedStatus, new Date().toISOString(), id, userId]
  //     );
  
  //     if (result.changes === 0) {
  //       return res.status(400).json({ message: 'Failed to update task. No changes made.' });
  //     }
  
  //     // Fetch the updated task details
  //     const updatedTask = {
  //       id,
  //       user_id: userId,
  //       title,
  //       description: description || '',
  //       status: updatedStatus,
  //       created_at: existingTask.created_at,
  //       updated_at: new Date().toISOString(),
  //     };
  
  //     res.status(200).json({ message: 'Task updated successfully', task: updatedTask });
  
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ message: 'Server error while updating task.' });
  //   }
  // });



  app.put('/api/tasks/:id', authenticateJWT, async (req, res) => {
    const taskId = req.params.id;
    const { status, title, description } = req.body;
  console.log(req.body)
    try {
      if (!status) {
        return res.status(400).json({ message: 'Status is required.' });
      }
  
      const db = await openDb();
      const userId = req.user.id;  // Ensure this is coming from the token
  
      // Find the task
      const task = await db.get('SELECT * FROM task WHERE id = ? AND user_id = ?', [taskId, userId]);
  
      if (!task) {
        return res.status(404).json({ message: 'Task not found or unauthorized.' });
      }
  
      // Update task
      await db.run(
        'UPDATE task SET status = ?, title = ?, description = ?, updated_at = ? WHERE id = ?',
        [status, title || task.title, description || task.description, new Date().toISOString(), taskId]
      );
  
      res.status(200).json({ message: 'Task updated successfully', task: { ...task, status, title, description } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error while updating task.' });
    }
  });
  
  app.delete('/api/tasks/:id', authenticateJWT, async (req, res) => {
    const { id } = req.params;  // Get task ID from URL
    const userId = req.user.id; // Extract user ID from the JWT token
  
    try {
      const db = await openDb();
  
      // Check if the task exists and belongs to the logged-in user
      const existingTask = await db.get(
        'SELECT * FROM task WHERE id = ? AND user_id = ?',
        [id, userId]
      );
  
      if (!existingTask) {
        return res.status(404).json({ message: 'Task not found or you are not authorized to delete it.' });
      }
  
      // Delete the task from the database
      const result = await db.run('DELETE FROM task  WHERE id = ? AND user_id = ?', [id, userId]);
  
      // If no rows are deleted, it indicates the task wasn't deleted
      if (result.changes === 0) {
        return res.status(400).json({ message: 'Failed to delete task.' });
      }
  
      res.status(200).json({ message: 'Task deleted successfully.' });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error while deleting task.' });
    }
  });
  
  
// Starting the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
