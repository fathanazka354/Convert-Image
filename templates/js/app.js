// js/app.js
// Handles UI interactions and API requests.

document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const convertBtn = document.getElementById('convertBtn');
    const qualSlider = document.getElementById('qualitySlider');
    const qualVal = document.getElementById('qualityVal');
    const loader = document.getElementById('loader');
    const statusEl = document.getElementById('status');
    const qualNote = document.getElementById('qualityNote');
    const qualWrapper = document.getElementById('qualityWrapper');
  
    let selectedFile = null;
  
    // ── File Selection ──────────────────────────────────────────────────────────
    fileInput.addEventListener('change', e => handleFile(e.target.files[0]));
  
    dropzone.addEventListener('dragover', e => { 
        e.preventDefault(); 
        dropzone.classList.add('border-accent', 'bg-accent/5'); 
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-accent', 'bg-accent/5'); 
    });
    
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('border-accent', 'bg-accent/5');
      handleFile(e.dataTransfer.files[0]);
    });
  
    function handleFile(file) {
      if (!file) return;
      selectedFile = file;
      fileName.textContent = '✅ ' + file.name;
      fileName.classList.remove('hidden');
      convertBtn.disabled = false;
      showStatus('');
    }
  
    // ── Quality Slider ──────────────────────────────────────────────────────────
    qualSlider.addEventListener('input', () => {
      const v = qualSlider.value;
      qualVal.textContent = v;
      qualSlider.style.background = `linear-gradient(to right, #7c6af7 ${v}%, #2e2e52 ${v}%)`;
    });
  
    // ── Format Toggle ───────────────────────────────────────────────────────────
    document.querySelectorAll('input[name=fmt]').forEach(r => {
      r.addEventListener('change', () => {
        const needsQ = ['JPEG','WEBP'].includes(r.value);
        qualNote.classList.toggle('hidden', !needsQ);
        qualWrapper.style.opacity = needsQ ? '1' : '0.35';
        qualSlider.disabled = !needsQ;
      });
    });
  
    // ── Convert Action ──────────────────────────────────────────────────────────
    convertBtn.addEventListener('click', async () => {
      if (!selectedFile) return;
  
      const fmt = document.querySelector('input[name=fmt]:checked').value;
      const quality = parseInt(qualSlider.value);
  
      loader.classList.replace('hidden', 'flex');
      convertBtn.disabled = true;
      showStatus('');
  
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('format', fmt);
      formData.append('quality', quality);
  
      try {
        const res = await fetch('/api/convert', { method: 'POST', body: formData });
  
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Server error');
        }
  
        // Trigger download
        const blob = await res.blob();
        const ext = fmt.toLowerCase() === 'jpeg' ? 'jpg' : fmt.toLowerCase();
        const base = selectedFile.name.replace(/\.[^.]+$/, '');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url; 
        a.download = `${base}_converted.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
  
        const kb = Math.round(blob.size / 1024);
        showStatus(`✅ Converted to ${fmt} — ${kb} KB`, 'success');
  
      } catch (err) {
        showStatus('❌ ' + err.message, 'error');
      } finally {
        loader.classList.replace('flex', 'hidden');
        convertBtn.disabled = false;
      }
    });
  
    // ── Helper ──────────────────────────────────────────────────────────────────
    function showStatus(msg, type = '') {
      statusEl.textContent = msg;
      
      statusEl.className = 'mt-4 p-3 rounded-lg text-sm text-center font-medium'; // reset
      if (type === 'success') {
          statusEl.classList.add('bg-success/10', 'text-success', 'border', 'border-success/20');
      } else if (type === 'error') {
          statusEl.classList.add('bg-primary/10', 'text-primary-h', 'border', 'border-primary/20');
      }
      
      if(msg) {
          statusEl.classList.remove('hidden');
      } else {
          statusEl.classList.add('hidden');
      }
    }
  });
