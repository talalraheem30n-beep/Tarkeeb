(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const fileInput = $('#fileInput');
  let allDishes = [];
  let lastPage = 'discover';

  // Auth check
  fetch('/api/me').then(r => { if (!r.ok) window.location.href = '/'; return r.json(); })
    .then(d => { $('#userName').textContent = d.name; })
    .catch(() => window.location.href = '/');

  // Logout
  $('#btnLogout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });

  // ─── PAGE ROUTING ───
  function showPage(name) {
    $$('.page').forEach(p => p.classList.remove('active'));
    const page = $(`#page${name.charAt(0).toUpperCase() + name.slice(1)}`);
    if (page) page.classList.add('active');
    $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === name));
    window.scrollTo(0, 0);
  }

  // Nav link clicks
  $$('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      lastPage = page;
      showPage(page);
      history.pushState(null, '', '#' + page);
    });
  });

  // Handle hash on load
  function routeFromHash() {
    const hash = location.hash.replace('#', '') || 'discover';
    if (hash.startsWith('recipe/')) {
      const id = parseInt(hash.split('/')[1]);
      if (id) loadDishById(id);
    } else if (['discover', 'upload', 'about'].includes(hash)) {
      showPage(hash);
    } else {
      showPage('discover');
    }
  }
  window.addEventListener('hashchange', routeFromHash);

  // ─── DISCOVER PAGE ───
  fetch('/api/dishes').then(r => r.json()).then(dishes => {
    allDishes = dishes;
    renderSlider(dishes);
    renderDishGrid(dishes.slice(5));
    renderQuickPicks(dishes);
    routeFromHash();
  });

  // ─── SLIDER LOGIC ───
  let currentSlide = 0;
  let sliderInterval;
  let topRecipes = [];

  function renderSlider(dishes) {
    const track = $('#sliderTrack');
    const dotsContainer = $('#sliderDots');
    if (!track || !dotsContainer) return;

    track.innerHTML = '';
    dotsContainer.innerHTML = '';
    
    topRecipes = dishes.slice(0, 5); // top 5
    
    topRecipes.forEach((d, i) => {
      const slide = document.createElement('div');
      slide.className = 'slide-item';
      slide.innerHTML = `
        ${d.image ? `<img src="${d.image}" alt="${d.name}" class="slide-img">` : `<div style="width:100%;height:100%;background:#ccc;display:flex;align-items:center;justify-content:center;font-size:80px;">${d.emoji}</div>`}
        <div class="slide-overlay">
          <span class="slide-category">${d.category}</span>
          <h2 class="slide-title">${d.name}</h2>
          <p class="slide-desc">${d.description}</p>
        </div>
      `;
      slide.addEventListener('click', () => {
        lastPage = 'discover';
        loadDishById(d.id);
      });
      track.appendChild(slide);

      const dot = document.createElement('div');
      dot.className = `slider-dot ${i === 0 ? 'active' : ''}`;
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });
    
    startSlider();
  }

  function goToSlide(index) {
    if (!topRecipes.length) return;
    currentSlide = (index + topRecipes.length) % topRecipes.length;
    const track = $('#sliderTrack');
    if (track) track.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    $$('.slider-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
    
    resetSliderInterval();
  }

  function startSlider() {
    sliderInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);
  }

  function resetSliderInterval() {
    clearInterval(sliderInterval);
    startSlider();
  }

  $('#sliderPrev')?.addEventListener('click', () => goToSlide(currentSlide - 1));
  $('#sliderNext')?.addEventListener('click', () => goToSlide(currentSlide + 1));

  function renderDishGrid(dishes) {
    const grid = $('#dishGrid');
    grid.innerHTML = '';
    dishes.forEach(d => {
      const card = document.createElement('div');
      card.className = 'dish-card';
      card.innerHTML = `
        <div class="dish-card-header">
          ${d.image ? `<img src="${d.image}" alt="${d.name}" class="dish-card-img">` : `<span class="dish-card-emoji">${d.emoji}</span>`}
          <span class="dish-card-cat">${d.category}</span>
        </div>
        <h3 class="dish-card-name">${d.name}</h3>
        <p class="dish-card-desc">${d.description}</p>
        <div class="dish-card-action">View Recipe →</div>`;
      card.addEventListener('click', () => {
        lastPage = 'discover';
        loadDishById(d.id);
      });
      grid.appendChild(card);
    });
  }

  // Category filter tabs
  $$('.cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const targetDishes = cat === 'all' ? allDishes.slice(5) : allDishes.filter(d => d.category === cat);
      renderDishGrid(targetDishes);
    });
  });

  // Quick picks on upload page
  function renderQuickPicks(dishes) {
    const picks = $('#quickPicks');
    dishes.slice(0, 8).forEach(d => {
      const btn = document.createElement('button');
      btn.className = 'quick-pick-btn';
      btn.innerHTML = d.image ? `<img src="${d.image}" alt="${d.name}" style="width: 24px; height: 24px; border-radius: 4px; object-fit: cover; vertical-align: middle; margin-right: 6px;"> ${d.name}` : `${d.emoji} ${d.name}`;
      btn.addEventListener('click', () => { lastPage = 'upload'; loadDishById(d.id); });
      picks.appendChild(btn);
    });
  }

  // ─── UPLOAD PAGE ───
  $('#browseBtn').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); fileInput.click(); });
  const dz = $('#dropzone');
  dz.addEventListener('click', e => { if (e.target.id !== 'browseBtn') fileInput.click(); });
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); if (e.dataTransfer.files.length) analyzeImage(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', () => { if (fileInput.files.length) analyzeImage(fileInput.files[0]); });

  async function analyzeImage(file) {
    if (!file.type.startsWith('image/')) { showToast('Please upload an image file'); return; }
    $('#analyzingOverlay').classList.add('show');
    $('#analyzingFile').textContent = file.name;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await res.json();
      setTimeout(() => {
        $('#analyzingOverlay').classList.remove('show');
        if (data.matched) {
          lastPage = 'upload';
          renderRecipe(data.dish, data.confidence, data.uploadedPath);
          showPage('recipe');
          history.pushState(null, '', '#recipe/' + data.dish.id);
        } else {
          $('#noMatchText').innerHTML = `Uploaded: <strong>${data.analyzedFilename}</strong><br>${data.message}`;
          showPage('noMatch');
        }
      }, 1500);
    } catch (err) {
      $('#analyzingOverlay').classList.remove('show');
      showToast('Analysis failed. Please try again.');
    }
    fileInput.value = '';
  }

  // ─── RECIPE PAGE ───
  async function loadDishById(id) {
    showPage('recipe');
    history.pushState(null, '', '#recipe/' + id);
    $('#recipeContent').innerHTML = '<div style="text-align:center;padding:80px"><div class="analyzing-spinner"></div><p style="margin-top:16px;color:#757575">Loading recipe…</p></div>';
    try {
      const res = await fetch(`/api/dishes/${id}`);
      const dish = await res.json();
      renderRecipe(dish, 100, null);
    } catch (err) { showToast('Failed to load dish'); showPage('discover'); }
  }

  function renderRecipe(dish, confidence, imagePath) {
    const imgSrc = imagePath || dish.image;
    let heroImageHtml = '';
    
    if (imgSrc) {
      const isAntiGravity = imgSrc.includes('image_cd6120.png') ? ' anti-gravity' : '';
      heroImageHtml = `
        <div class="recipe-hero-wrapper">
          <img src="${imgSrc}" alt="${dish.name}" class="recipe-hero-image${isAntiGravity}">
          <span class="recipe-badge">${dish.category}</span>
        </div>`;
    } else {
      heroImageHtml = `
        <div class="recipe-hero-wrapper" style="background: linear-gradient(135deg, var(--accent-brand), var(--accent-brand));">
          <span class="result-emoji-header" style="opacity:1">${dish.emoji}</span>
          <span class="recipe-badge">${dish.category}</span>
        </div>`;
    }

    // Dynamic placeholders for time and cost based on data
    const prepTime = (dish.ingredients.length * 3 + 5) + ' mins';
    
    // Realistic PKR estimates based on latest market data for the dishes
    const mealCostsPKR = {
      "Chicken Biryani": "Rs 450", "Nihari": "Rs 800", "Haleem": "Rs 500",
      "Chicken Karahi": "Rs 750", "Seekh Kebab": "Rs 600", "Chapli Kebab": "Rs 550",
      "Daal Chawal": "Rs 300", "Aloo Gosht": "Rs 650", "Butter Chicken": "Rs 900",
      "Palak Paneer": "Rs 750", "Zinger Burger": "Rs 850", "Beef Burger": "Rs 950",
      "Shawarma": "Rs 350", "Pepperoni Pizza": "Rs 1200", "French Fries": "Rs 250",
      "Chicken Wings": "Rs 700", "Chicken Nuggets": "Rs 550", "Hot Dog": "Rs 400",
      "Fish and Chips": "Rs 1100", "Loaded Nachos": "Rs 800"
    };
    const estCost = mealCostsPKR[dish.name] || 'Rs 500';

    // Helper to map ingredients to emojis
    const getIngredientEmoji = (name) => {
      const lower = name.toLowerCase();
      if (lower.includes('beef') || lower.includes('meat') || lower.includes('mutton') || lower.includes('lamb') || lower.includes('gosht') || lower.includes('qeema')) return '🥩';
      if (lower.includes('chicken') || lower.includes('poultry')) return '🍗';
      if (lower.includes('fish') || lower.includes('seafood')) return '🐟';
      if (lower.includes('cheese') || lower.includes('paneer') || lower.includes('mozzarella')) return '🧀';
      if (lower.includes('tomato')) return '🍅';
      if (lower.includes('onion')) return '🧅';
      if (lower.includes('garlic') || lower.includes('ginger')) return '🧄';
      if (lower.includes('potato') || lower.includes('fries') || lower.includes('aloo')) return '🥔';
      if (lower.includes('spinach') || lower.includes('lettuce') || lower.includes('palak') || lower.includes('leaves') || lower.includes('mint') || lower.includes('cilantro') || lower.includes('coriander leaves')) return '🥬';
      if (lower.includes('bread') || lower.includes('bun') || lower.includes('pita') || lower.includes('dough') || lower.includes('naan') || lower.includes('roti') || lower.includes('tortilla')) return '🍞';
      if (lower.includes('milk') || lower.includes('cream') || lower.includes('yogurt') || lower.includes('buttermilk')) return '🥛';
      if (lower.includes('butter') || lower.includes('ghee')) return '🧈';
      if (lower.includes('oil')) return '🫒';
      if (lower.includes('flour') || lower.includes('cornstarch') || lower.includes('rice') || lower.includes('wheat') || lower.includes('chawal') || lower.includes('lentil') || lower.includes('daal') || lower.includes('chickpea')) return '🌾';
      if (lower.includes('sauce') || lower.includes('ketchup') || lower.includes('mustard') || lower.includes('mayo') || lower.includes('paste')) return '🥫';
      if (lower.includes('salt') || lower.includes('pepper') || lower.includes('spice') || lower.includes('cumin') || lower.includes('coriander powder') || lower.includes('chili') || lower.includes('paprika') || lower.includes('masala') || lower.includes('turmeric')) return '🌶️';
      if (lower.includes('egg')) return '🥚';
      if (lower.includes('water')) return '💧';
      if (lower.includes('lemon') || lower.includes('lime')) return '🍋';
      return '🥘'; // Default
    };

    // Map ingredients to the new layout
    const ingredientsHtml = dish.ingredients.map(i => `
      <div class="ingredient-item">
        <div class="ingredient-icon">${getIngredientEmoji(i)}</div>
        <div class="ingredient-name">${i}</div>
      </div>
    `).join('');

    // Map steps to the new layout
    const stepsHtml = dish.steps.map((s, idx) => `
      <div class="step-item">
        <div class="step-item-title">Step ${idx + 1}</div>
        <div class="step-item-text">${s}</div>
      </div>
    `).join('');

    $('#recipeContent').innerHTML = `
      <div class="recipe-container">
        
        <!-- Left Main Column -->
        <div class="recipe-main">
          ${heroImageHtml}
          
          <div class="recipe-header-content">
            <h1 class="recipe-title-new">${dish.name}</h1>
            <div class="recipe-author-row">
              <div class="recipe-author-avatar">T</div>
              <span>By <strong>Tarkeeb AI</strong> • 4.9 ★★★★☆ (120 Ratings)</span>
            </div>
            ${confidence < 100 ? `<div class="result-confidence" style="margin-bottom:16px;">✓ ${confidence}% match confidence</div>` : ''}
            <p class="result-description">${dish.description}</p>
          </div>

          <div class="recipe-stats-row">
            <div class="recipe-stat">
              <span class="recipe-stat-value">${prepTime}</span>
              <span class="recipe-stat-label">Total Time</span>
            </div>
            <div class="recipe-stat">
              <span class="recipe-stat-value">${estCost}</span>
              <span class="recipe-stat-label">Est. Meal Cost</span>
            </div>
            <div class="recipe-stat">
              <span class="recipe-stat-value">${dish.nutrition.serving.split(' ')[0] || '1'}</span>
              <span class="recipe-stat-label">Servings</span>
            </div>
          </div>

          <div class="recipe-section-box">
            <h3 class="recipe-h3">Ingredients <span>${dish.ingredients.length} items</span></h3>
            <div class="ingredients-list-new">
              ${ingredientsHtml}
            </div>
          </div>

          <div class="recipe-section-box">
            <h3 class="recipe-h3">Cooking Instructions</h3>
            <div class="steps-list-new">
              ${stepsHtml}
            </div>
          </div>
        </div>

        <!-- Right Sidebar Column -->
        <div class="recipe-sidebar">
          <div class="sidebar-widget">
            <h4 class="sidebar-widget-title">Love this recipe?</h4>
            <button class="sidebar-action-btn primary">★ Save Recipe</button>
            <button class="sidebar-action-btn secondary">+ Add To Plan</button>
            <button class="sidebar-action-btn secondary" onclick="window.open('https://www.foodpanda.pk/', '_blank')">🛒 Add To Shopping List</button>
          </div>

          <div class="sidebar-widget">
            <h4 class="sidebar-widget-title">Nutrition Per Serving</h4>
            <div class="nutrition-grid-new">
              <div class="nutrition-item-new full">
                <span class="nutrition-val-new">${dish.nutrition.calories}</span>
                <span class="nutrition-lbl-new">Calories</span>
              </div>
              <div class="nutrition-item-new">
                <span class="nutrition-val-new">${dish.nutrition.protein}g</span>
                <span class="nutrition-lbl-new">Protein</span>
              </div>
              <div class="nutrition-item-new">
                <span class="nutrition-val-new">${dish.nutrition.carbs}g</span>
                <span class="nutrition-lbl-new">Carbs</span>
              </div>
              <div class="nutrition-item-new">
                <span class="nutrition-val-new">${dish.nutrition.fat}g</span>
                <span class="nutrition-lbl-new">Fat</span>
              </div>
              <div class="nutrition-item-new">
                <span class="nutrition-val-new">${dish.nutrition.fiber}g</span>
                <span class="nutrition-lbl-new">Fiber</span>
              </div>
            </div>
          </div>
          
          <div class="sidebar-widget" style="background: linear-gradient(135deg, #e0f2f1, #e8eaf6); border: none;">
            <div style="font-size: 32px; margin-bottom: 12px;">🛒</div>
            <h4 class="sidebar-widget-title" style="margin-bottom: 8px;">Shop for your meal!</h4>
            <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">Ship to your local grocery store.</p>
            <button class="sidebar-action-btn primary" style="font-size: 13px; padding: 12px;" onclick="window.open('https://www.foodpanda.pk/', '_blank')">Go to Store</button>
          </div>
        </div>

      </div>`;
  }

  // Back button
  $('#btnBack').addEventListener('click', () => {
    showPage(lastPage);
    history.pushState(null, '', '#' + lastPage);
  });

  // Retry button
  $('#btnRetry').addEventListener('click', () => {
    showPage('upload');
    history.pushState(null, '', '#upload');
  });

  // Toast
  function showToast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }
})();
