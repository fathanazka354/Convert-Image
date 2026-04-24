// app.js
// Handles UI interactions and pure client-side image conversion.

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

  async function handleFile(file) {
    if (!file) return;

    // Handle HEIC/HEIF images using heic2any
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic');
    
    if (isHeic) {
        showStatus('⏳ Reading HEIC format... (might take a moment)', 'success');
        loader.classList.replace('hidden', 'flex');
        convertBtn.disabled = true;
        
        try {
            // Convert HEIC to JPEG Blob using the heic2any library we added in HTML
            const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
            
            // Create a new File object from the blob
            const newName = file.name.replace(/\.heic$/i, '.jpg');
            selectedFile = new File([convertedBlob], newName, { type: 'image/jpeg' });
            
            fileName.textContent = '✅ ' + newName + ' (Ready)';
            fileName.classList.remove('hidden');
            convertBtn.disabled = false;
            showStatus('');
        } catch (err) {
            showStatus('❌ Failed to read HEIC: ' + err.message, 'error');
            fileName.classList.add('hidden');
        } finally {
            loader.classList.replace('flex', 'hidden');
        }
        return;
    }

    if (!file.type.startsWith('image/')) {
        showStatus('❌ Please select a valid image file', 'error');
        return;
    }
    
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

  // ── Client-Side Convert Action ──────────────────────────────────────────────
  convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    const fmt = document.querySelector('input[name=fmt]:checked').value;
    const quality = parseInt(qualSlider.value) / 100; // Canvas expects 0.0 to 1.0

    loader.classList.replace('hidden', 'flex');
    convertBtn.disabled = true;
    showStatus('');

    try {
      // 1. Read image file into an Image object
      const img = new Image();
      const objectUrl = URL.createObjectURL(selectedFile);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = objectUrl;
      });

      // 2. Draw image on canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      // If converting to JPEG, fill background with white first (in case of transparent PNG)
      if (fmt === 'JPEG') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl); // Clean up

      // 3. Export canvas to new format
      const mimeType = `image/${fmt.toLowerCase()}`;
      
      const blob = await new Promise((resolve) => {
          if (fmt === 'PNG') {
              canvas.toBlob(resolve, mimeType); // PNG doesn't use quality param
          } else {
              canvas.toBlob(resolve, mimeType, quality);
          }
      });

      if (!blob) throw new Error('Conversion failed');

      // 4. Trigger download
      const ext = fmt.toLowerCase() === 'jpeg' ? 'jpg' : fmt.toLowerCase();
      const base = selectedFile.name.replace(/\.[^.]+$/, '');
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      a.href = downloadUrl; 
      a.download = `${base}_converted.${ext}`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

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
