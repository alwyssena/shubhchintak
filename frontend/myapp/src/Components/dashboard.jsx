import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'pending' });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get('http://localhost:3000/api/tasks', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTasks(response.data.tasks);
    } catch (err) {
      setError('Failed to fetch tasks.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  // Handle editing a task
  const handleEditTask = async (taskId) => {
    // Find the task by its ID
    const taskToEdit = tasks.find(task => task.id === taskId);
    if (!taskToEdit) {
      setError('Task not found');
      return;
    }

    // Modify the task by setting the form state (for simplicity, we can use form data here)
    setNewTask({
      title: taskToEdit.title,
      description: taskToEdit.description,
      status: taskToEdit.status,
    });

    // Optionally, you can open a modal or navigate to an edit page
    // For now, I'm just showing how you might update the task in the same component
    // (you would probably add more logic for actual updates)
    console.log('Editing task: ', taskToEdit);
  };

  // Handle adding a new task
  const handleAddTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.post('http://localhost:3000/api/tasks', newTask, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTasks([...tasks, response.data.task]);
      setNewTask({ title: '', description: '', status: 'pending' });
    } catch (err) {
      setError('Failed to add task.');
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a task
  const handleDeleteTask = async (taskId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.delete(`http://localhost:3000/api/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Remove the task from the state
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (err) {
      setError('Failed to delete task.');
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks based on the selected filter
  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>

      {/* Filter Tasks */}
      <div className="task-filter">
        <select onChange={handleFilterChange} value={filter}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Add New Task */}
      <form className="new-task-form" onSubmit={handleAddTask}>
        <input
          type="text"
          placeholder="Task Title"
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          required
        />
        <textarea
          placeholder="Task Description"
          value={newTask.description}
          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          required
        ></textarea>
        <select
          value={newTask.status}
          onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
        >
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Adding Task...' : 'Add Task'}
        </button>
      </form>

      {/* Display Task List */}
      <div className="task-list">
        {filteredTasks.map((task) => (
          <div key={task.id} className="task-card">
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <span className={`status ${task.status}`}>{task.status}</span>
            <button onClick={() => handleEditTask(task.id)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDeleteTask(task.id)}>Delete</button>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && <p className="error">{error}</p>}

      {/* Loading Spinner */}
      {loading && <div className="loading-spinner"><div></div></div>}
    </div>
  );
};

export default Dashboard;
