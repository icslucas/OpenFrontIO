async function checkAuth() {
  try {
    const response = await fetch('/api/auth/status');
    const data = await response.json();
    
    if (!data.authenticated) {
      
      window.location.href = '/';
      return null;
    }
    
    return data.user;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return null;
  }
}
async function initApp() {
  const user = await checkAuth();
  if (user) {
    console.log('Logged in as:', user.username);
    // Initialize your game with the user info
    // e.g., displayWelcomeMessage(user.username);
  }
}
document.addEventListener('DOMContentLoaded', initApp);
