// app.js  (Firebase sync version)
// Uses Firestore instead of localStorage.

import { watchTasks, addTaskRemote, updateTaskRemote, deleteTaskRemote } from "./firebase.js";

const THEME_KEY = 'eisenhower_theme';
let tasks = [];

/* ---------- THEME ---------- */
function applyTheme(){
  const pref = localStorage.getItem(THEME_KEY);
  if(pref === 'dark') document.documentElement.classList.add('dark');
  else if(pref === 'light') document.documentElement.classList.remove('dark');
}
applyTheme();
document.getElementById('theme-toggle').addEventListener('click', ()=>{
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, isDark ? 'dark':'light');
});

/* ---------- FIRESTORE LISTENER ---------- */
watchTasks(remoteTasks => {
  tasks = remoteTasks;
  render();
});

/* ---------- HELPERS ---------- */
function getQuadrant(task){
  if(task.urgent && task.important) return 'q1';
  if(!task.urgent && task.important) return 'q2';
  if(task.urgent && !task.important) return 'q3';
  return 'q4';
}

const searchInput = document.getElementById('search');
searchInput.addEventListener('input', render);

function span(text){ const s=document.createElement('span'); s.textContent=text; return s; }
function button(text,cls,handler){ const b=document.createElement('button'); b.textContent=text; b.className=cls; b.type='button'; b.onclick=handler; return b; }

/* ---------- RENDER ---------- */
function render(){
  const filter = searchInput.value.toLowerCase();
  const counts = {q1:{total:0,done:0}, q2:{total:0,done:0}, q3:{total:0,done:0}, q4:{total:0,done:0}};
  ['q1','q2','q3','q4'].forEach(q=>document.getElementById(q).innerHTML='');

  tasks.sort((a,b)=>{
    if(a.done !== b.done) return a.done?1:-1;
    return (a.dueDate||'').localeCompare(b.dueDate||'');
  });

  const today = new Date().toISOString().split('T')[0];

  tasks.forEach(task=>{
    if(filter && !task.title.toLowerCase().includes(filter) && !task.description.toLowerCase().includes(filter)) return;

    const q = getQuadrant(task);
    counts[q].total++;
    if(task.done) counts[q].done++;

    const li = document.createElement('li');
    li.className = 'task-item';
    if(task.done) li.classList.add('completed');
    if(task.dueDate && task.dueDate < today) li.classList.add('overdue');
    li.dataset.id = task.id;

    const title = document.createElement('strong');
    title.textContent = task.title;
    li.appendChild(title);

    if(task.description){
      const d = document.createElement('div');
      d.className = 'desc';
      d.textContent = task.description;
      li.appendChild(d);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    if(task.dueDate) meta.appendChild(span('Due '+task.dueDate));
    meta.appendChild(span(task.important?'Important':'Not Important'));
    meta.appendChild(span(task.urgent?'Urgent':'Not Urgent'));
    li.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.appendChild(button(task.done?'Undo':'Done','toggle',()=>toggleDone(task)));
    actions.appendChild(button('Edit','edit',()=>fillForm(task)));
    actions.appendChild(button('Delete','delete',()=>removeTask(task.id)));
    li.appendChild(actions);

    // Drag support
    li.draggable = true;
    li.addEventListener('dragstart', e=>{
      e.dataTransfer.setData('text/plain', task.id);
      li.classList.add('dragging');
    });
    li.addEventListener('dragend', ()=>li.classList.remove('dragging'));

    document.getElementById(q).appendChild(li);
  });

  Object.entries(counts).forEach(([k,v])=>{
    document.getElementById('count-'+k).textContent = `${v.done}/${v.total}`;
  });
}

/* ---------- CRUD ---------- */
async function addTask(task){
  await addTaskRemote(task); // Firestore generates id
}
async function updateTask(task){
  await updateTaskRemote(task);
  resetForm();
}
async function removeTask(id){
  if(confirm('Delete this task?')) await deleteTaskRemote(id);
}
async function toggleDone(task){
  task.done = !task.done;
  await updateTaskRemote(task);
}

/* ---------- FORM ---------- */
function resetForm(){
  document.getElementById('task-form').reset();
  document.getElementById('task-id').value='';
  document.getElementById('save-btn').textContent='Save Task';
}
document.getElementById('reset-btn').addEventListener('click', resetForm);

function fillForm(task){
  document.getElementById('task-id').value = task.id;
  document.getElementById('title').value = task.title;
  document.getElementById('description').value = task.description || '';
  document.getElementById('due-date').value = task.dueDate || '';
  document.getElementById('important').checked = task.important;
  document.getElementById('urgent').checked = task.urgent;
  document.getElementById('save-btn').textContent='Update Task';
  window.scrollTo({top:0,behavior:'smooth'});
}

document.getElementById('task-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const idField = document.getElementById('task-id');
  const existing = tasks.find(t=>t.id===idField.value);
  const task = {
    id: existing ? existing.id : undefined,
    title: document.getElementById('title').value.trim(),
    description: document.getElementById('description').value.trim(),
    dueDate: document.getElementById('due-date').value,
    important: document.getElementById('important').checked,
    urgent: document.getElementById('urgent').checked,
    done: existing ? existing.done : false
  };
  if(!task.title){ alert('Title required'); return; }
  if(existing) await updateTask(task); else await addTask(task);
  resetForm();
});

/* ---------- DRAG & DROP QUADRANTS ---------- */
document.querySelectorAll('.quadrant').forEach(q=>{
  q.addEventListener('dragover', e=>{ e.preventDefault(); q.classList.add('drag-over'); });
  q.addEventListener('dragleave', ()=>q.classList.remove('drag-over'));
  q.addEventListener('drop', async e=>{
    e.preventDefault();
    q.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const task = tasks.find(t=>t.id===id);
    if(!task) return;
    const quad = q.getAttribute('data-quadrant');
    if(quad==='q1'){ task.urgent=true; task.important=true; }
    if(quad==='q2'){ task.urgent=false; task.important=true; }
    if(quad==='q3'){ task.urgent=true; task.important=false; }
    if(quad==='q4'){ task.urgent=false; task.important=false; }
    await updateTaskRemote(task);
  });
});

/* ---------- OTHER BUTTONS ---------- */
document.getElementById('fab').addEventListener('click', ()=>{
  resetForm(); document.getElementById('title').focus(); window.scrollTo({top:0,behavior:'smooth'});
});

document.getElementById('export-btn').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(tasks,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tasks_backup.json';
  a.click();
});
document.getElementById('import-file').addEventListener('change', ()=>{
  alert('Import not implemented for Firestore version yet.');
});
document.getElementById('clear-all').addEventListener('click', ()=>{
  alert('Delete tasks one by one for now.');
});
