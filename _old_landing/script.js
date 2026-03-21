// ========================================
// KORVA AI — Landing Page Interactions
// ========================================

document.addEventListener('DOMContentLoaded', () => {

  // ---- Typing Animation for AI Demo ----
  const queryText = document.getElementById('query-text');
  const demoResponse = document.getElementById('demo-response');
  const question = 'Show me revenue breakdown by pricing tier for the last 6 months';
  let charIndex = 0;
  let typingStarted = false;

  function typeQuery() {
    if (charIndex < question.length) {
      queryText.textContent += question[charIndex];
      charIndex++;
      setTimeout(typeQuery, 35 + Math.random() * 25);
    } else {
      // Show response after typing completes
      setTimeout(() => {
        demoResponse.classList.add('visible');
      }, 400);
    }
  }

  // ---- Intersection Observer for Animations ----
  const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Start typing animation when demo section is visible
        if (entry.target.id === 'ai-demo' && !typingStarted) {
          typingStarted = true;
          setTimeout(typeQuery, 500);
        }

        // Add fade-in animation to cards
        entry.target.querySelectorAll('.step-card, .feature-card, .pricing-card').forEach((card, i) => {
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, i * 120);
        });

        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe sections
  document.querySelectorAll('#ai-demo, .how-it-works, .features, .pricing').forEach(section => {
    observer.observe(section);
  });

  // Set initial states for animated cards
  document.querySelectorAll('.step-card, .feature-card, .pricing-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  });

  // ---- Smooth Scroll for Nav Links ----
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ---- Navbar Background on Scroll ----
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.style.boxShadow = '0 1px 8px rgba(0,0,0,0.06)';
    } else {
      navbar.style.boxShadow = 'none';
    }
  });

  // ---- Mobile Menu Toggle ----
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }
});
