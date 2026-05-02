document.addEventListener('DOMContentLoaded', () => {
  const cardLogin = document.getElementById('cardLogin');
  const cardRegister = document.getElementById('cardRegister');
  const cardSuccess = document.getElementById('cardSuccess');

  // Toggle to Register
  document.getElementById('linkToRegister').addEventListener('click', () => {
    cardLogin.style.display = 'none';
    cardRegister.style.display = 'block';
  });

  // Toggle to Login
  document.getElementById('linkToLogin').addEventListener('click', () => {
    cardRegister.style.display = 'none';
    cardLogin.style.display = 'block';
  });

  // Handle Registration Submit
  document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    cardRegister.style.display = 'none';
    cardSuccess.style.display = 'block';
  });

  // Handle Success Proceed (Auto Login as demo admin)
  document.getElementById('btnProceed').addEventListener('click', () => {
    document.getElementById('username').value = 'admin';
    document.getElementById('password').value = 'admin123';
    document.getElementById('loginBtn').click();
  });

  // Toggle Password Visibility
  document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input.type === 'password') {
        input.type = 'text';
        this.textContent = '🙈'; // Or some crossed-eye icon
      } else {
        input.type = 'password';
        this.textContent = '👁️';
      }
    });
  });

  // Existing Login Logic
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    errorEl.textContent = '';
    btn.textContent = 'Signing in…';
    btn.disabled = true;
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: document.getElementById('username').value,
          password: document.getElementById('password').value
        })
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/app';
      } else {
        errorEl.textContent = data.error || 'Login failed';
      }
    } catch (err) {
      errorEl.textContent = 'Connection error. Is the server running?';
    }
    btn.textContent = 'Sign In';
    btn.disabled = false;
  });
});
