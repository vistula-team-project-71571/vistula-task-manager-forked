let config = null;

const taskForm = document.getElementById('task-form');
const taskTitle = document.getElementById('task-title');
const taskDescription = document.getElementById('task-description');
const taskSubmit = document.getElementById('task-submit');
const editIdInput = document.getElementById('edit-id');
const cancelEditBtn = document.getElementById('cancel-edit');
const taskList = document.getElementById('task-list');
const statusMessage = document.getElementById('status-message');

function showMessage(msg, isError = true) {
  statusMessage.textContent = msg;
  statusMessage.style.color = isError ? '#d32f2f' : '#2e7d32';
  if (!isError) {
    setTimeout(() => { statusMessage.textContent = ''; }, 3000);
  }
}

async function apiRequest(endpoint, options = {}) {
  const url = `${config.supabaseUrl}/rest/v1/${config.tableName}${endpoint}`;
  const headers = {
    'apikey': config.supabasePublishableKey,
    'Authorization': `Bearer ${config.supabasePublishableKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorBody}`);
  }
  return response.json();
}

async function loadTasks() {
  try {
    const tasks = await apiRequest('?select=*&order=id.asc');
    renderTasks(tasks);
  } catch (err) {
    showMessage(err.message);
  }
}

function renderTasks(tasks) {
  taskList.innerHTML = '';
  tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = `task-item ${task.completed ? 'completed' : ''}`;
    item.setAttribute('data-id', task.id);

    item.innerHTML = `
      <h3 class="task-title">${escapeHtml(task.title)}</h3>
      <p class="task-description">${escapeHtml(task.description || '')}</p>
      <p>Status: <span class="task-status">${task.completed ? 'Completed' : 'Incomplete'}</span></p>
      <button class="toggle-task">${task.completed ? 'Mark Incomplete' : 'Mark Complete'}</button>
      <button class="edit-task">Edit</button>
      <button class="delete-task">Delete</button>
    `;

    item.querySelector('.toggle-task').addEventListener('click', () => toggleTask(task));
    item.querySelector('.edit-task').addEventListener('click', () => startEditing(task));
    item.querySelector('.delete-task').addEventListener('click', () => deleteTask(task.id));

    taskList.appendChild(item);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&', '<': '<', '>': '>', '"': '"', "'": '''
  }[m]));
}

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = editIdInput.value;
  const payload = {
    title: taskTitle.value.trim(),
    description: taskDescription.value.trim()
  };

  try {
    if (id) {
      await apiRequest(`?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      showMessage('Task updated successfully!', false);
    } else {
      await apiRequest('', {
        method: 'POST',
        body: JSON.stringify({ ...payload, completed: false })
      });
      showMessage('Task created successfully!', false);
    }
    resetForm();
    await loadTasks();
  } catch (err) {
    showMessage(err.message);
  }
});

function startEditing(task) {
  editIdInput.value = task.id;
  taskTitle.value = task.title;
  taskDescription.value = task.description || '';
  taskSubmit.textContent = 'Save Changes';
  cancelEditBtn.style.display = 'inline-block';
}

function resetForm() {
  editIdInput.value = '';
  taskTitle.value = '';
  taskDescription.value = '';
  taskSubmit.textContent = 'Add Task';
  cancelEditBtn.style.display = 'none';
}

cancelEditBtn.addEventListener('click', resetForm);

async function toggleTask(task) {
  try {
    await apiRequest(`?id=eq.${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !task.completed })
    });
    await loadTasks();
  } catch (err) {
    showMessage(err.message);
  }
}

async function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  try {
    await apiRequest(`?id=eq.${id}`, { method: 'DELETE' });
    showMessage('Task deleted.', false);
    await loadTasks();
  } catch (err) {
    showMessage(err.message);
  }
}

fetch('config.json')
  .then(res => res.json())
  .then(data => {
    config = data;
    loadTasks();
  })
  .catch(err => showMessage('Failed to load config.json: ' + err.message));
