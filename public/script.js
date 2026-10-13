const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');
const message = document.querySelector('#message');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');

// The key used to store projects in localStorage
const storageKey = 'workshop-projects-v1';

// Store projects in memory
const projects = [];

// Store the ID of the project currently being edited
let editingId = null;

// Generate a unique ID for each project
function generateId() {
  return Date.now().toString() + '-' +
    Math.random().toString(36).slice(2);
}

// Check whether stored data is a valid project array
function isValidProjectArray(data) {
  if (!Array.isArray(data)) {
    return false;
  }

  const ids = [];

  for (let i = 0; i < data.length; i++) {
    const project = data[i];

    if (
      project === null ||
      typeof project !== 'object' ||
      Array.isArray(project) ||
      typeof project.id !== 'string' ||
      project.id.trim() === '' ||
      typeof project.name !== 'string' ||
      project.name.trim() === '' ||
      typeof project.status !== 'string' ||
      !['Planned', 'In Progress', 'Completed'].includes(project.status)
    ) {
      return false;
    }

    // Each project must have a unique ID
    if (ids.includes(project.id)) {
      return false;
    }

    ids.push(project.id);
  }

  return true;
}

// Load projects from localStorage when the page starts
function loadProjects() {
  try {
    const storedProjects = window.localStorage.getItem(storageKey);

    // No saved data means start with an empty collection
    if (storedProjects === null) {
      return;
    }

    // Convert the stored text back into JavaScript data
    const parsedProjects = JSON.parse(storedProjects);

    // Do not use malformed data
    if (!isValidProjectArray(parsedProjects)) {
      if (message) {
        message.textContent =
          'Saved project data is invalid. It has not been overwritten at startup.';
      }
      return;
    }

    // Restore the saved projects
    for (let i = 0; i < parsedProjects.length; i++) {
      projects.push(parsedProjects[i]);
    }
  } catch (error) {
    if (message) {
      message.textContent =
        'Saved projects could not be read from browser storage. Check your browser storage settings.';
    }
  }
}

// Save the current projects collection to localStorage
function saveProjects() {
  try {
    // Convert the collection into text for storage
    const projectsText = JSON.stringify(projects);

    window.localStorage.setItem(storageKey, projectsText);

    if (message) {
      message.textContent = '';
    }

    return true;
  } catch (error) {
    if (message) {
      message.textContent =
        'Project changes could not be saved to browser storage.';
    }

    return false;
  }
}

// Display all projects
function renderProjects() {
  projectList.replaceChildren();

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];

    const listItem = document.createElement('li');
    const projectName = document.createElement('h3');
    const projectStatus = document.createElement('p');
    const editButton = document.createElement('button');
    const deleteButton = document.createElement('button');

    projectName.textContent = project.name;
    projectStatus.textContent = 'Status: ' + project.status;

    // Edit button
    editButton.textContent = 'Edit';
    editButton.type = 'button';

    editButton.addEventListener('click', function() {
      editingId = project.id;

      nameInput.value = project.name;
      statusInput.value = project.status;

      saveButton.textContent = 'Save changes';
      cancelButton.hidden = false;

      if (message) {
        message.textContent = '';
      }

      nameInput.focus();
    });

    // Delete button
    deleteButton.textContent = 'Delete';
    deleteButton.type = 'button';

    deleteButton.addEventListener('click', function() {
      const confirmed = window.confirm(
        'Are you sure you want to delete "' +
        project.name + '"?'
      );

      // Cancel deletion without changing saved records
      if (!confirmed) {
        return;
      }

      // Find the project by its stable ID
      const projectIndex = projects.findIndex(function(item) {
        return item.id === project.id;
      });

      // Remove only the project with the matching ID
      if (projectIndex !== -1) {
        projects.splice(projectIndex, 1);
      } else {
        return;
      }

      // Reset the form if this project was being edited
      if (editingId === project.id) {
        resetForm();
      }

      // Redraw the list and update the empty state
      renderProjects();

      // Save the confirmed deletion
      saveProjects();
    });

    listItem.appendChild(projectName);
    listItem.appendChild(projectStatus);
    listItem.appendChild(editButton);
    listItem.appendChild(deleteButton);

    projectList.appendChild(listItem);
  }

  // Show the empty-state message when no projects remain
  if (emptyState) {
    emptyState.hidden = projects.length > 0;
  }
}

// Return the form to Add mode
function resetForm() {
  form.reset();

  editingId = null;
  saveButton.textContent = 'Save Project';
  cancelButton.hidden = true;

  if (message) {
    message.textContent = '';
  }
}

// Add a new project or update an existing project
form.addEventListener('submit', function(event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  const status = statusInput.value;

  // Reject an empty project name
  if (name === '') {
    if (message) {
      message.textContent = 'Please enter a project name.';
    }

    nameInput.focus();
    return;
  }

  let changed = false;

  if (editingId !== null) {
    // Find the project being edited by its ID
    const project = projects.find(function(item) {
      return item.id === editingId;
    });

    if (project) {
      // Update the existing project without changing its ID
      project.name = name;
      project.status = status;
      changed = true;
    }
  } else {
    // Create a new project
    const project = {
      id: generateId(),
      name: name,
      status: status
    };

    projects.push(project);
    changed = true;
  }

  if (changed) {
    // Refresh the displayed list
    renderProjects();

    // Return the form to Add mode
    resetForm();

    // Save the successful addition or edit
    saveProjects();
  }
});

// Cancel editing without changing saved records
cancelButton.addEventListener('click', function() {
  resetForm();
});

// Load saved projects and display them when the page starts
loadProjects();
renderProjects();