/**
 * Login Page Script
 * 
 * Handles client-side form submission, demo quick-fill buttons,
 * and error feedback.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('submit-btn');
  const alertBox = document.getElementById('login-alert');
  const alertText = document.getElementById('login-alert-text');
  const rolePills = document.querySelectorAll('.role-pill');

  // Handle Quick-Fill Role Pills: fills ONLY the email and puts cursor into password field
  rolePills.forEach(pill => {
    pill.addEventListener('click', () => {
      const email = pill.getAttribute('data-email');
      emailInput.value = email;
      passwordInput.value = ''; // Leave password empty so the user enters it
      passwordInput.focus();   // Focus directly into password box for smooth typing
      hideAlert();
      // Highlight selected pill briefly
      pill.style.transform = 'scale(0.95)';
      setTimeout(() => { pill.style.transform = ''; }, 150);
    });
  });

  // Handle Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showAlert('Please enter both your university email and password.');
      return;
    }

    // Disable button to prevent duplicate clicks while request is processing
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Successful login: redirect to dashboard
        window.location.href = '/index.html';
      } else {
        showAlert(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      showAlert('Unable to connect to the server. Please ensure the server is running.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });

  function showAlert(message) {
    alertText.textContent = message;
    alertBox.style.display = 'block';
  }

  function hideAlert() {
    alertBox.style.display = 'none';
  }
});
