/* Modern Eisenhower Matrix
 * Features: dark mode, drag & drop, search, counts, overdue highlight, PWA
 */
const STORAGE_KEY = 'eisenhower_tasks_v2';
const THEME_KEY = 'eisenhower_theme';

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveTasks(tasks) { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }

function generateId(){ return 't_'+crypto.randomUUID(); }

function getQuadrant(task){
  if(task.urgent && task.important) return 'q1';
  if(!task.urgent && task.important) return 'q2';
  if(task.urgent && !task.important) return 'q3';
  return 'q4';
}

function applyTheme(){
  const pref = localStorage.getItem(THEME_KEY);
  if(pref === 'dark') document.documentElement.classList.add('dark');
  else if(pref === 'light') document.documentElement.classList.remove('dark');
  else {
    // System default handled by CSS
  }
}
applyTheme();

const searchInput = document.getElementById('search');
searchInput.addEventListener('input', render);

document.getElementById('theme-toggle').addEventListener('click', ()=>{
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, isDark ? 'dark':'light');
});

function render(){
  const tasks = loadTasks();
  const filter = searchInput.value.toLowerCase();
  const counts = {q1:{total:0,done:0}, q2:{total:0,done:0}, q3:{total:0,done:0}, q4:{total:0,done:0}};
  ['q1','q2','q3','q4'].forEach(q=>document.getElementById(q).innerHTML='');

  tasks.sort((a,b)=>{
    if(a.done !== b.done) return a.done?1:-1;
    return (a.dueDate||'').localeCompare(b.dueDate||'');
  });

  const now = new Date().toISOString().split('T')[0];

  tasks.forEach(task=>{
    if(filter && !task.title.toLowerCase().includes(filter) && !task.description.toLowerCase().includes(filter)) return;
    const q = getQuadrant(task);
    counts[q].total++;
    if(task.done) counts[q].done++;

    const li = document.createElement('li');
    li.className = 'task-item';
    if(task.done) li.classList.add('completed');
    if(task.dueDate && task.dueDate < now) li.classList.add('overdue');

    li.setAttribute('draggable','true');
    li.dataset.id = task.id;

    li.addEventListener('dragstart', e=>{
      li.classList.add('dragging');
      e.dataTransfer.setData('text/plain', task.id);
    });
    li.addEventListener('dragend', ()=>li.classList.remove('dragging'));

    const title = document.createElement('strong');
    title.textContent = task.title;
    li.appendChild(title);

    if(task.description){
      const desc = document.createElement('div');
      desc.textContent = task.description;
      desc.className = 'desc';
      li.appendChild(desc);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    if(task.dueDate) {
      const due = document.createElement('span');
      due.textContent = 'Due '+task.dueDate;
      meta.appendChild(due);
    }
    meta.appendChild(badge(task.important?'Important':'Not Important'));
    meta.appendChild(badge(task.urgent?'Urgent':'Not Urgent'));
    li.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const toggleBtn = button(task.done?'Undo':'Done','toggle',()=>{
      task.done = !task.done; updateTask(task);
    });
    const editBtn = button('Edit','edit',()=>fillForm(task));
    const delBtn = button('Delete','delete',()=>{
      if(confirm('Delete this task?')) deleteTask(task.id);
    });

    actions.appendChild(toggleBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    li.appendChild(actions);

    document.getElementById(q).appendChild(li);
  });

  Object.entries(counts).forEach(([k,v])=>{
    document.getElementById('count-'+k).textContent = `${v.done}/${v.total}`;
  });
}

function badge(text){
  const span = document.createElement('span');
  span.textContent = text;
  return span;
}
function button(text,cls,handler){
  const b = document.createElement('button');
  b.textContent = text;
  b.className = cls;
  b.type = 'button';
  b.addEventListener('click', handler);
  return b;
}

function addTask(task){
  const tasks = loadTasks();
  tasks.push(task);
  saveTasks(tasks);
  render();
}

function updateTask(updated){
  const tasks = loadTasks().map(t=>t.id===updated.id?updated:t);
  saveTasks(tasks);
  render();
  resetForm();
}

function deleteTask(id){
  const tasks = loadTasks().filter(t=>t.id!==id);
  saveTasks(tasks);
  render();
}

function resetForm(){
  document.getElementById('task-form').reset();
  document.getElementById('task-id').value='';
  document.getElementById('save-btn').textContent='Save Task';
}

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

document.getElementById('task-form').addEventListener('submit', e=>{
  e.preventDefault();
  const idField = document.getElementById('task-id');
  const task = {
    id: idField.value || generateId(),
    title: document.getElementById('title').value.trim(),
    description: document.getElementById('description').value.trim(),
    dueDate: document.getElementById('due-date').value,
    important: document.getElementById('important').checked,
    urgent: document.getElementById('urgent').checked,
    done:false
  };
  if(!task.title){ alert('Title required'); return; }
  if(idField.value){
    const existing = loadTasks().find(t=>t.id===task.id);
    task.done = existing.done;
    updateTask(task);
  } else {
    addTask(task);
  }
  resetForm();
});
document.getElementById('reset-btn').addEventListener('click', resetForm);

// Drag & Drop handlers for quadrants
document.querySelectorAll('.quadrant').forEach(q=>{
  q.addEventListener('dragover', e=>{
    e.preventDefault();
    q.classList.add('drag-over');
  });
  q.addEventListener('dragleave', ()=>q.classList.remove('drag-over'));
  q.addEventListener('drop', e=>{
    e.preventDefault();
    q.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const tasks = loadTasks();
    const task = tasks.find(t=>t.id===id);
    if(!task) return;
    // Set urgent/important based on target quadrant
    const quad = q.getAttribute('data-quadrant');
    if(quad==='q1'){ task.urgent=true; task.important=true; }
    if(quad==='q2'){ task.urgent=false; task.important=true; }
    if(quad==='q3'){ task.urgent=true; task.important=false; }
    if(quad==='q4'){ task.urgent=false; task.important=false; }
    saveTasks(tasks);
    render();
  });
});

document.getElementById('fab').addEventListener('click', ()=>{
  resetForm();
  document.getElementById('title').focus();
  window.scrollTo({top:0,behavior:'smooth'});
});

document.getElementById('export-btn').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(loadTasks(),null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'eisenhower_tasks_backup.json';
  a.click();
});
document.getElementById('import-file').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = evt=>{
    try{
      const imported = JSON.parse(evt.target.result);
      if(!Array.isArray(imported)) throw new Error('Invalid format');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
      render();
      alert('Imported successfully');
    } catch(err){
      alert('Import failed: '+ err.message);
    }
  };
  reader.readAsText(file);
});
document.getElementById('clear-all').addEventListener('click', ()=>{
  if(confirm('This will delete all tasks permanently. Continue?')){
    localStorage.removeItem(STORAGE_KEY);
    render();
  }
});

render();