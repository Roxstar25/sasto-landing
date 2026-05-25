'use strict';

/* ==========================================================================
   [DATA]
   ========================================================================== */

const STORAGE_KEY = 'pipelined_jobs';

// Centralized state read ensures we never hold stale memory references
function getJobs() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Write-through caching pattern (direct to disk) guarantees persistence
function saveJobs(jobs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

function createJob(data) {
    const now = new Date().toISOString();
    return {
        id: crypto.randomUUID(),
        company: data.company,
        role: data.role,
        url: data.url,
        salaryMin: data.salaryMin ? Number(data.salaryMin) : null,
        salaryMax: data.salaryMax ? Number(data.salaryMax) : null,
        notes: data.notes,
        status: data.status,
        statusHistory: [{ status: data.status, changedAt: now }],
        createdAt: now
    };
}

function calculateDaysInStage(job) {
    // Relying on the last entry in statusHistory ensures we measure from the exact moment of the column drop
    const lastChange = job.statusHistory[job.statusHistory.length - 1].changedAt;
    const diffTime = Math.abs(new Date() - new Date(lastChange));
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getUrgencyColor(days) {
    if (days < 7) return 'green';
    if (days <= 14) return 'amber';
    return 'red';
}


/* ==========================================================================
   [RENDER]
   ========================================================================== */

// Helper to prevent XSS while avoiding repetitive document.createElement lines
function el(tag, className = '', textContent = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
}

// Using innerHTML safely here because the input is strictly hardcoded developer strings
function createSvgIcon(pathData) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none">${pathData}</svg>`;
    return wrapper.firstElementChild;
}

function createCard(job) {
    const card = el('article', 'job-card');
    card.draggable = true;
    card.dataset.id = job.id;

    const header = el('header', 'card-header');
    const titleGroup = el('div');
    titleGroup.appendChild(el('h3', 'card-title', job.role));
    titleGroup.appendChild(el('div', 'card-company', job.company));
    
    const actions = el('div', 'card-actions');
    
    const editBtn = el('button', 'icon-btn edit');
    editBtn.setAttribute('aria-label', 'Edit job');
    editBtn.appendChild(createSvgIcon('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>'));
    editBtn.onclick = () => openModal(job.status, job.id);

    const deleteBtn = el('button', 'icon-btn delete');
    deleteBtn.setAttribute('aria-label', 'Delete job');
    deleteBtn.appendChild(createSvgIcon('<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>'));
    
    // Deferring delete confirmation to browser native keeps bundle size down and accessibility high
    deleteBtn.onclick = () => {
        if (confirm(`Delete application for ${job.company}?`)) {
            const jobs = getJobs().filter(j => j.id !== job.id);
            saveJobs(jobs);
            renderAll();
        }
    };

    actions.append(editBtn, deleteBtn);
    header.append(titleGroup, actions);

    const meta = el('footer', 'card-meta');
    const daysInStage = calculateDaysInStage(job);
    const badge = el('div', 'days-badge');
    
    const dot = el('span', `dot ${getUrgencyColor(daysInStage)}`);
    const daysText = el('span', '', `${daysInStage}d in stage`);
    
    badge.append(dot, daysText);
    meta.append(badge);

    card.append(header, meta);

    // Bind Drag events directly to the card instance
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    return card;
}

function renderAll() {
    const jobs = getJobs();
    
    // Clear all dropzones to guarantee DOM strictly matches data state
    document.querySelectorAll('.column-dropzone').forEach(zone => {
        zone.innerHTML = ''; 
    });

    jobs.forEach(job => {
        const dropzone = document.querySelector(`.column-dropzone[data-status="${job.status}"]`);
        if (dropzone) {
            dropzone.appendChild(createCard(job));
        }
    });

    updateStats(jobs);
}


/* ==========================================================================
   [DRAG]
   ========================================================================== */

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    // setTimeout defers the visual hide until *after* the browser captures the drag image
    setTimeout(() => e.target.classList.add('is-dragging'), 0);
}

function handleDragEnd(e) {
    e.target.classList.remove('is-dragging');
    document.querySelectorAll('.column-dropzone').forEach(zone => {
        zone.classList.remove('drag-over');
    });
}

function setupDragAndDrop() {
    const dropzones = document.querySelectorAll('.column-dropzone');
    
    dropzones.forEach(zone => {
        zone.addEventListener('dragover', e => {
            e.preventDefault(); // Required to allow dropping
            e.dataTransfer.dropEffect = 'move';
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            
            const jobId = e.dataTransfer.getData('text/plain');
            const newStatus = zone.dataset.status;
            
            const jobs = getJobs();
            const jobIndex = jobs.findIndex(j => j.id === jobId);
            
            // Only update history if the column actually changed
            if (jobIndex > -1 && jobs[jobIndex].status !== newStatus) {
                jobs[jobIndex].status = newStatus;
                jobs[jobIndex].statusHistory.push({
                    status: newStatus,
                    changedAt: new Date().toISOString()
                });
                saveJobs(jobs);
                renderAll();
            }
        });
    });
}


/* ==========================================================================
   [MODAL]
   ========================================================================== */

const modal = document.getElementById('job-modal');
const form = document.getElementById('job-form');

function openModal(targetStatus, jobId = null) {
    form.reset();
    document.getElementById('job-target-status').value = targetStatus;
    document.getElementById('job-id').value = jobId || '';
    document.getElementById('modal-title').textContent = jobId ? 'Edit Job' : 'Add Job';

    if (jobId) {
        const job = getJobs().find(j => j.id === jobId);
        if (job) {
            document.getElementById('company').value = job.company;
            document.getElementById('role').value = job.role;
            document.getElementById('url').value = job.url || '';
            document.getElementById('salary-min').value = job.salaryMin || '';
            document.getElementById('salary-max').value = job.salaryMax || '';
            document.getElementById('notes').value = job.notes || '';
        }
    }

    modal.showModal();
}

function closeModal() {
    modal.close();
    form.reset();
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const jobId = document.getElementById('job-id').value;
    const targetStatus = document.getElementById('job-target-status').value;
    
    const formData = {
        company: document.getElementById('company').value.trim(),
        role: document.getElementById('role').value.trim(),
        url: document.getElementById('url').value.trim(),
        salaryMin: document.getElementById('salary-min').value,
        salaryMax: document.getElementById('salary-max').value,
        notes: document.getElementById('notes').value.trim(),
        status: targetStatus
    };

    const jobs = getJobs();

    if (jobId) {
        // Updating existing requires mutating specifically non-history fields
        const index = jobs.findIndex(j => j.id === jobId);
        if (index > -1) {
            jobs[index] = { ...jobs[index], ...formData };
            // Ensure numeric conversions are maintained on edit
            jobs[index].salaryMin = formData.salaryMin ? Number(formData.salaryMin) : null;
            jobs[index].salaryMax = formData.salaryMax ? Number(formData.salaryMax) : null;
        }
    } else {
        jobs.push(createJob(formData));
    }

    saveJobs(jobs);
    closeModal();
    renderAll();
}


/* ==========================================================================
   [STATS]
   ========================================================================== */

function updateStats(jobs) {
    const container = document.getElementById('stats-container');
    const total = jobs.length;
    const interviews = jobs.filter(j => j.status === 'interview').length;
    const offers = jobs.filter(j => j.status === 'offer').length;

    container.textContent = `${total} tracked · ${interviews} interviews · ${offers} offers`;
}


/* ==========================================================================
   [INIT]
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Attach global click listeners for Add buttons
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', () => openModal(btn.dataset.status));
    });

    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    
    // Native dialogs don't automatically close when clicking the backdrop, this handles it
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener('submit', handleFormSubmit);

    setupDragAndDrop();
    renderAll();
});