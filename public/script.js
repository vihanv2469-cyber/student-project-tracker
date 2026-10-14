
const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');
const message = document.querySelector('#message');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');

// Projects come from the API.
let projects = [];
let editingId = null;
let isBusy = false;

function showMessage(text) {
  message.textContent = text;
}

async function getErrorMessage(response) {
  try {
    const data = await response.json();

    if (typeof data.error === 'string' && data.error.trim() !== '') {
      return data.error;
    }
  } catch (error) {
    // The response did not contain JSON.
  }

  return `Request failed with status ${response.status}.`;
}

function setBusy(busy) {
  isBusy = busy;
  saveButton.disabled = busy;
  cancelButton.disabled = busy;

  projectList.querySelectorAll('button').forEach(function(button) {
    button.disabled = busy;
  });
}

async function loadProjects() {
  showMessage('Loading projects...');

  try {
    const response = await fetch('/api/projects');

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('The server returned an invalid project list.');
    }

    projects = data;

    if (
      editingId !== null &&
      !projects.some(function(project) {
        return project.id === editingId;
      })
    ) {
      resetForm();
    }

    renderProjects();

    if (projects.length === 0) {
      showMessage('No projects have been added yet.');
    } else {
      showMessage('');
    }

    return true;
  } catch (error) {
    if (error instanceof TypeError) {
      showMessage(
        'Could not connect to the server. Check that the app is running and try again.'
      );
    } else {
      showMessage(error.message || 'Could not load projects.');
    }

    emptyState.hidden = true;
    return false;
  }
}

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

    editButton.textContent = 'Edit';
    editButton.type = 'button';
    editButton.disabled = isBusy;

    editButton.addEventListener('click', function() {
      if (isBusy) {
        return;
      }

      editingId = project.id;
      nameInput.value = project.name;
      statusInput.value = project.status;

      saveButton.textContent = 'Save changes';
      cancelButton.hidden = false;
      showMessage('');
      nameInput.focus();
    });

    deleteButton.textContent = 'Delete';
    deleteButton.type = 'button';
    deleteButton.disabled = isBusy;

    deleteButton.addEventListener('click', async function() {
      if (isBusy) {
        return;
      }

      const confirmed = window.confirm(
        'Are you sure you want to delete "' + project.name + '"?'
      );

      if (!confirmed) {
        return;
      }

      await deleteProject(project);
    });

    listItem.appendChild(projectName);
    listItem.appendChild(projectStatus);
    listItem.appendChild(editButton);
    listItem.appendChild(deleteButton);

    projectList.appendChild(listItem);
  }

  emptyState.hidden = projects.length > 0;
}

function resetForm() {
  form.reset();
  editingId = null;
  saveButton.textContent = 'Save Project';
  cancelButton.hidden = true;
}

form.addEventListener('submit', async function(event) {
  event.preventDefault();

  if (isBusy) {
    return;
  }

  const name = nameInput.value.trim();
  const status = statusInput.value;

  if (name === '') {
    showMessage('Please enter a project name.');
    nameInput.focus();
    return;
  }

  const projectData = {
    name: name,
    status: status
  };

  const isEditing = editingId !== null;
  const url = isEditing
    ? '/api/projects/' + encodeURIComponent(editingId)
    : '/api/projects';

  const method = isEditing ? 'PUT' : 'POST';

  setBusy(true);
  showMessage(isEditing ? 'Saving changes...' : 'Saving project...');

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectData)
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    const loaded = await loadProjects();

    resetForm();

    if (loaded) {
      showMessage(
        isEditing
          ? 'Project updated successfully.'
          : 'Project added successfully.'
      );
    } else {
      showMessage(
        'The project was saved, but the list could not be refreshed. Try reloading the projects.'
      );
    }
  } catch (error) {
    if (error instanceof TypeError) {
      showMessage(
        'Network error: could not reach the server. Your form values have been kept.'
      );
    } else {
      showMessage(
        (error.message || 'Could not save the project.') +
        ' Your form values have been kept.'
      );
    }
  } finally {
    setBusy(false);
  }
});

async function deleteProject(project) {
  setBusy(true);
  showMessage('Deleting project...');

  try {
    const response = await fetch(
      '/api/projects/' + encodeURIComponent(project.id),
      {
        method: 'DELETE'
      }
    );

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    if (editingId === project.id) {
      resetForm();
    }

    const loaded = await loadProjects();

    if (loaded) {
      showMessage('Project deleted successfully.');
    } else {
      showMessage(
        'The project was deleted, but the list could not be refreshed. Try reloading the projects.'
      );
    }
  } catch (error) {
    if (error instanceof TypeError) {
      showMessage(
        'Network error: could not reach the server. The deletion could not be confirmed.'
      );
    } else {
      showMessage(error.message || 'Could not delete the project.');
    }
  } finally {
    setBusy(false);
  }
}

cancelButton.addEventListener('click', function() {
  if (isBusy) {
    return;
  }

  resetForm();
  showMessage('Edit cancelled.');
});

// Cursor-following button glow.
document.addEventListener('pointermove', function(event) {
  if (event.pointerType === 'touch') {
    return;
  }

  const button = event.target.closest('button');

  if (!button) {
    return;
  }

  const rect = button.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    return;
  }

  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;

  button.style.setProperty('--mouse-x', x + '%');
  button.style.setProperty('--mouse-y', y + '%');
});

// Load projects when the page starts.
setBusy(true);

loadProjects().finally(function() {
  setBusy(false);
});
