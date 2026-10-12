/**
 * =============================================================================
 * FILEFERRY - VALIDATION LANDING PAGE CONFIGURATION & SCRIPT
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// CONFIGURATION (All customizable settings in one spot)
// -----------------------------------------------------------------------------
const CONFIG = {
  // TODO: Set your form submission endpoint URL here (e.g. Formspree, Loops, ConvertKit, Zapier webhook)
  FORM_ENDPOINT: "", 

  // TODO: Set your analytics tracking ID or snippet hook here (e.g. Plausible, PostHog, Google Analytics)
  ANALYTICS_ID: "", 

  // Pricing values - placeholders easily editable here
  PRICING: {
    starter: {
      name: "Starter",
      price: "free",
      features: "50 downloads a month, 2 GB storage, expiring links."
    },
    pro: {
      name: "Pro",
      price: "$19 a month",
      features: "unlimited downloads, 100 GB storage, license keys, version email blasts."
    }
  },

  // Default selected plan on page load
  DEFAULT_PLAN: "Pro"
};

// -----------------------------------------------------------------------------
// ANALYTICS TRACKING HELPER
// -----------------------------------------------------------------------------
function trackEvent(eventName, properties = {}) {
  // TODO: Replace or extend with your preferred analytics tracker (e.g., plausible('Signup', ...))
  if (CONFIG.ANALYTICS_ID) {
    if (window.plausible) {
      window.plausible(eventName, { props: properties });
    } else if (window.gtag) {
      window.gtag("event", eventName, properties);
    }
  }
  // Console logging for debugging intent during validation phase
  console.log(`[FileFerry Analytics] Event: ${eventName}`, properties);
}

// -----------------------------------------------------------------------------
// STATE MANAGEMENT
// -----------------------------------------------------------------------------
let selectedPlan = CONFIG.DEFAULT_PLAN;

/**
 * Updates selected plan across picker, pricing cards, and forms.
 * @param {'Starter'|'Pro'} plan 
 */
function setSelectedPlan(plan) {
  if (plan !== "Starter" && plan !== "Pro") return;
  selectedPlan = plan;

  // 1. Update picker buttons
  const starterBtn = document.getElementById("picker-btn-starter");
  const proBtn = document.getElementById("picker-btn-pro");
  if (starterBtn && proBtn) {
    if (plan === "Starter") {
      starterBtn.classList.add("active");
      starterBtn.setAttribute("aria-checked", "true");
      proBtn.classList.remove("active");
      proBtn.setAttribute("aria-checked", "false");
    } else {
      proBtn.classList.add("active");
      proBtn.setAttribute("aria-checked", "true");
      starterBtn.classList.remove("active");
      starterBtn.setAttribute("aria-checked", "false");
    }
  }

  // 2. Update pricing card highlights
  const starterCard = document.getElementById("pricing-card-starter");
  const proCard = document.getElementById("pricing-card-pro");
  if (starterCard && proCard) {
    if (plan === "Starter") {
      starterCard.classList.add("plan-selected");
      proCard.classList.remove("plan-selected");
    } else {
      proCard.classList.add("plan-selected");
      starterCard.classList.remove("plan-selected");
    }
  }

  // 3. Update hidden form values
  const heroPlanInput = document.getElementById("hero-selected-plan");
  const finalPlanInput = document.getElementById("final-selected-plan");
  if (heroPlanInput) heroPlanInput.value = plan;
  if (finalPlanInput) finalPlanInput.value = plan;

  // 4. Update visible labels
  document.querySelectorAll(".active-plan-name").forEach(el => {
    el.textContent = plan;
  });

  // Track plan pick event
  trackEvent("plan_selected", { plan });
}

// -----------------------------------------------------------------------------
// FORM SUBMISSION HANDLER
// -----------------------------------------------------------------------------
async function handleFormSubmit(form, messageEl, submitBtn) {
  const emailInput = form.querySelector('input[type="email"]');
  const storeUrlInput = form.querySelector('input[name="store_url"]');
  const planInput = form.querySelector('input[name="selected_plan"]');

  const email = emailInput ? emailInput.value.trim() : "";
  const storeUrl = storeUrlInput ? storeUrlInput.value.trim() : "";
  const plan = planInput ? planInput.value : selectedPlan;

  // Reset message display
  messageEl.className = "form-message";
  messageEl.textContent = "";

  // Validate Email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    messageEl.className = "form-message error";
    messageEl.textContent = "Please enter a valid email address.";
    if (emailInput) emailInput.focus();
    return;
  }

  // Payload with email, optional store URL, and selected plan
  const payload = {
    email: email,
    storeUrl: storeUrl || null,
    plan: plan,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };

  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span>Joining...</span>`;

  try {
    if (CONFIG.FORM_ENDPOINT && CONFIG.FORM_ENDPOINT.trim() !== "") {
      // Send to real endpoint if configured
      const response = await fetch(CONFIG.FORM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }
    } else {
      // Validation stub: no endpoint connected yet
      console.log("[FileFerry Demand Test] Recorded signup submission:", payload);
      
      // Store in localStorage for easy inspection during local testing
      try {
        const signups = JSON.parse(localStorage.getItem("fileferry_signups") || "[]");
        signups.push(payload);
        localStorage.setItem("fileferry_signups", JSON.stringify(signups));
      } catch (storageErr) {
        console.warn("Could not save to localStorage:", storageErr);
      }
      
      // Simulate brief network feedback
      await new Promise(resolve => setTimeout(resolve, 350));
    }

    // Success response
    trackEvent("signup_success", { plan, hasStoreUrl: Boolean(storeUrl) });
    messageEl.className = "form-message success";
    messageEl.innerHTML = `<strong>You're on the early list for ${plan}!</strong><br>We'll notify you as soon as FileFerry is ready.`;
    
    // Clear inputs
    if (emailInput) emailInput.value = "";
    if (storeUrlInput) storeUrlInput.value = "";

  } catch (error) {
    console.error("[FileFerry] Form submission error:", error);
    messageEl.className = "form-message error";
    messageEl.textContent = "Something went wrong. Please check your connection or try again.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Set current year in footer
  const yearEl = document.getElementById("current-year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Populate pricing config values dynamically if they differ
  const priceStarter = document.getElementById("price-starter");
  const pricePro = document.getElementById("price-pro");
  const featuresStarter = document.getElementById("features-starter");
  const featuresPro = document.getElementById("features-pro");

  if (priceStarter && CONFIG.PRICING.starter.price) {
    priceStarter.textContent = CONFIG.PRICING.starter.price;
  }
  if (pricePro && CONFIG.PRICING.pro.price) {
    pricePro.textContent = CONFIG.PRICING.pro.price;
  }
  if (featuresStarter && CONFIG.PRICING.starter.features) {
    featuresStarter.textContent = CONFIG.PRICING.starter.features;
  }
  if (featuresPro && CONFIG.PRICING.pro.features) {
    featuresPro.textContent = CONFIG.PRICING.pro.features;
  }

  // Initialize selected plan
  setSelectedPlan(CONFIG.DEFAULT_PLAN);

  // Setup Plan Picker Buttons under Pricing
  const pickerStarter = document.getElementById("picker-btn-starter");
  const pickerPro = document.getElementById("picker-btn-pro");
  if (pickerStarter) {
    pickerStarter.addEventListener("click", () => setSelectedPlan("Starter"));
  }
  if (pickerPro) {
    pickerPro.addEventListener("click", () => setSelectedPlan("Pro"));
  }

  // Setup Pricing Cards Click/Keyboard Selection
  const starterCard = document.getElementById("pricing-card-starter");
  const proCard = document.getElementById("pricing-card-pro");
  if (starterCard) {
    starterCard.addEventListener("click", () => setSelectedPlan("Starter"));
    starterCard.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelectedPlan("Starter");
      }
    });
  }
  if (proCard) {
    proCard.addEventListener("click", () => setSelectedPlan("Pro"));
    proCard.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelectedPlan("Pro");
      }
    });
  }

  // Setup Hero Signup Form
  const heroForm = document.getElementById("hero-signup-form");
  const heroMessage = document.getElementById("hero-form-message");
  const heroBtn = document.getElementById("hero-submit-btn");
  if (heroForm && heroMessage && heroBtn) {
    heroForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleFormSubmit(heroForm, heroMessage, heroBtn);
    });
  }

  // Setup Final CTA Signup Form
  const finalForm = document.getElementById("final-signup-form");
  const finalMessage = document.getElementById("final-form-message");
  const finalBtn = document.getElementById("final-submit-btn");
  if (finalForm && finalMessage && finalBtn) {
    finalForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleFormSubmit(finalForm, finalMessage, finalBtn);
    });
  }
});
