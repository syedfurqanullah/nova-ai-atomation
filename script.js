/* ========== DOM ELEMENT REFERENCES ========== */
const body = document.body;
const menuButton = document.querySelector(".menu-button");
const navMenu = document.querySelector(".nav-menu");
const modal = document.getElementById("authModal");
const dialog = modal.querySelector(".auth-dialog");
const toast = document.getElementById("toast");
const authEntry = document.getElementById("authEntry");
const logoutButton = document.getElementById("logoutButton");
const accountStatus = document.getElementById("accountStatus");
const checkoutModal = document.getElementById("checkoutModal");
const checkoutDialog = checkoutModal.querySelector(".checkout-dialog");

/* ========== STATE & CONFIGURATION ========== */
let lastFocusedElement;
let checkoutAfterAuth = false;
let selectedCheckoutPlan = "professional";

/* ========== NOTIFICATION SYSTEM ========== */
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(
    () => toast.classList.remove("is-visible"),
    4000,
  );
}

/* ========== DEMO ACCOUNT & USER MANAGEMENT ========== */
function getDemoUsers() {
  try {
    return JSON.parse(localStorage.getItem("novaAIUsers") || "[]");
  } catch {
    return [];
  }
}

function saveDemoUsers(users) {
  localStorage.setItem("novaAIUsers", JSON.stringify(users));
}

function getCurrentUser() {
  const email = localStorage.getItem("novaAICurrentUser");
  return getDemoUsers().find((user) => user.email === email) || null;
}

function updateAuthUI() {
  const currentUser = getCurrentUser();
  const hasAccount = getDemoUsers().length > 0;
  authEntry.hidden = Boolean(currentUser);
  logoutButton.hidden = !currentUser;
  accountStatus.hidden = !currentUser;
  accountStatus.textContent = currentUser
    ? `Hi, ${currentUser.name.split(" ")[0]}`
    : "";
  authEntry.textContent = hasAccount ? "Sign in" : "Create account";
}

/* ========== AUTHENTICATION MODAL & UI ========== */
async function hashPassword(value) {
  if (!window.crypto?.subtle) {
    return btoa(unescape(encodeURIComponent(`demo:${value}`)));
  }
  const bytes = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function showFormMessage(form, message, isError = true) {
  const output = form.querySelector(".form-message");
  output.textContent = message;
  output.style.color = isError ? "#bf3545" : "#16835a";
}

function setAuthView(viewName) {
  document.querySelectorAll(".auth-view").forEach((view) => {
    view.hidden = view.dataset.view !== viewName;
  });
  setTimeout(
    () =>
      modal.querySelector(`.auth-view[data-view="${viewName}"] input`)?.focus(),
    0,
  );
}

function openAuthModal(viewName) {
  lastFocusedElement = document.activeElement;
  setAuthView(viewName);
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  body.classList.add("modal-open");
}

function closeAuthModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  body.classList.remove("modal-open");
  lastFocusedElement?.focus();
}

/* ========== NAVIGATION & MENU ========== */
menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  menuButton.setAttribute(
    "aria-label",
    isOpen ? "Open navigation menu" : "Close navigation menu",
  );
  navMenu.classList.toggle("is-open", !isOpen);
});

document.querySelectorAll(".nav-menu a").forEach((link) => {
  link.addEventListener("click", () => {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation menu");
    navMenu.classList.remove("is-open");
  });
});

authEntry.addEventListener("click", () =>
  openAuthModal(getDemoUsers().length ? "login" : "register"),
);
logoutButton.addEventListener("click", () => {
  localStorage.removeItem("novaAICurrentUser");
  updateAuthUI();
  showToast("Logged out successfully");
});

function closeMobileMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation menu");
  navMenu.classList.remove("is-open");
}

document.querySelectorAll("[data-scroll-pricing]").forEach((button) => {
  button.addEventListener("click", () => {
    closeMobileMenu();
    document
      .getElementById("pricing")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.querySelectorAll("[data-open-auth]").forEach((button) => {
  button.addEventListener("click", () =>
    openAuthModal(getDemoUsers().length ? "login" : "register"),
  );
});
document
  .querySelectorAll("[data-close-auth]")
  .forEach((button) => button.addEventListener("click", closeAuthModal));
document.querySelectorAll("[data-auth-view]").forEach((button) => {
  button.addEventListener("click", () => setAuthView(button.dataset.authView));
});

document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.parentElement.querySelector("input");
    const shouldShow = input.type === "password";
    input.type = shouldShow ? "text" : "password";
    button.textContent = shouldShow ? "Hide" : "Show";
    button.setAttribute(
      "aria-label",
      shouldShow ? "Hide password" : "Show password",
    );
    button.setAttribute("aria-pressed", String(shouldShow));
  });
});

document
  .getElementById("registerForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) return form.reportValidity();
    const name = document.getElementById("registerName").value.trim();
    const email = document
      .getElementById("registerEmail")
      .value.trim()
      .toLowerCase();
    const password = document.getElementById("registerPassword").value;
    const users = getDemoUsers();
    if (users.some((user) => user.email === email)) {
      showFormMessage(
        form,
        "An account with this email already exists. Please sign in.",
      );
      return;
    }
    users.push({ name, email, passwordHash: await hashPassword(password) });
    saveDemoUsers(users);
    localStorage.setItem("novaAICurrentUser", email);
    form.reset();
    closeAuthModal();
    updateAuthUI();
    showToast("Account created successfully");
    if (checkoutAfterAuth) {
      checkoutAfterAuth = false;
      openCheckout();
    }
  });
/* ========== AUTHENTICATION FORMS ========== */ document
  .getElementById("loginForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) return form.reportValidity();
    const email = document
      .getElementById("loginEmail")
      .value.trim()
      .toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const account = getDemoUsers().find((user) => user.email === email);
    if (!account || account.passwordHash !== (await hashPassword(password))) {
      showFormMessage(form, "Email or password is incorrect.");
      return;
    }
    localStorage.setItem("novaAICurrentUser", account.email);
    form.reset();
    closeAuthModal();
    updateAuthUI();
    showToast(`Welcome back, ${account.name}!`);
    if (checkoutAfterAuth) {
      checkoutAfterAuth = false;
      openCheckout();
    }
  });

document.getElementById("forgotForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.checkValidity()) return form.reportValidity();
  const email = document
    .getElementById("forgotEmail")
    .value.trim()
    .toLowerCase();
  const account = getDemoUsers().find((user) => user.email === email);
  if (!account) {
    showFormMessage(
      form,
      "No account was found for this email. You can create another account instead.",
    );
    return;
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  localStorage.setItem(
    "novaAIPasswordReset",
    JSON.stringify({ email, code, expiresAt: Date.now() + 10 * 60 * 1000 }),
  );
  document.getElementById("resetCodeHint").textContent =
    `Demo verification code: ${code}. This code expires in 10 minutes.`;
  form.reset();
  setAuthView("reset");
  showToast("Verification code sent");
});

document
  .getElementById("resetForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) return form.reportValidity();
    let request;
    try {
      request = JSON.parse(
        localStorage.getItem("novaAIPasswordReset") || "null",
      );
    } catch {
      request = null;
    }
    const enteredCode = document.getElementById("resetCode").value.trim();
    if (!request || request.expiresAt < Date.now()) {
      localStorage.removeItem("novaAIPasswordReset");
      showFormMessage(
        form,
        "This verification code has expired. Request a new one.",
      );
      return;
    }
    if (request.code !== enteredCode) {
      showFormMessage(form, "That verification code is incorrect.");
      return;
    }
    const users = getDemoUsers();
    const accountIndex = users.findIndex(
      (user) => user.email === request.email,
    );
    if (accountIndex === -1) {
      showFormMessage(
        form,
        "This account is no longer available. Create another account instead.",
      );
      return;
    }
    users[accountIndex].passwordHash = await hashPassword(
      document.getElementById("resetPassword").value,
    );
    saveDemoUsers(users);
    localStorage.removeItem("novaAIPasswordReset");
    form.reset();
    closeAuthModal();
    showToast("Password updated");
    openAuthModal("login");
  });

/* ========== PLAN CHECKOUT & PAYMENT DEMO ========== */
function getPlanCard(plan) {
  return (
    document.querySelector(`[data-plan-card="${plan}"]`) ||
    document.querySelector('[data-plan-card="professional"]')
  );
}

function getSelectedBillingPeriod() {
  return document.querySelector("[data-billing].is-selected").dataset.billing;
}

function getCardBrand(number) {
  const digits = number.replace(/\D/g, "");
  if (/^4/.test(digits)) return "Visa debit";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard debit";
  if (/^3[47]/.test(digits)) return "Amex debit";
  return "Debit card";
}

function formatCardNumber(value) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
    : digits;
}

function passesLuhn(value) {
  const digits = value.replace(/\D/g, "");
  let sum = 0;
  let shouldDouble = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return digits.length >= 12 && sum % 10 === 0;
}

function hasValidExpiry(value) {
  const [monthText, yearText] = value.split("/");
  const month = Number(monthText);
  const year = Number(`20${yearText}`);
  if (!month || month < 1 || month > 12 || !yearText || yearText.length !== 2)
    return false;
  const expiryDate = new Date(year, month);
  return expiryDate > new Date();
}

function updateCardPreview() {
  const cardNumber = document.getElementById("checkoutCard").value;
  const cardName = document.getElementById("checkoutName").value.trim();
  const expiry = document.getElementById("checkoutExpiry").value;
  document.getElementById("cardBrand").textContent = getCardBrand(cardNumber);
  document.getElementById("previewCardNumber").textContent =
    cardNumber || "4242 4242 4242 4242";
  document.getElementById("previewCardName").textContent = cardName
    ? cardName.toUpperCase()
    : "YOUR NAME";
  document.getElementById("previewCardExpiry").textContent = expiry || "MM/YY";
}

function setCheckoutPlan(plan) {
  selectedCheckoutPlan = plan || "professional";
  const card = getPlanCard(selectedCheckoutPlan);
  const billingPeriod = getSelectedBillingPeriod();
  const planName = card.querySelector("h3").textContent.trim();
  const price = card.querySelector("[data-monthly]").dataset[billingPeriod];
  const features = [...card.querySelectorAll("li")]
    .slice(0, 3)
    .map((item) => item.textContent.trim());
  document.getElementById("checkoutTitle").textContent = `Start ${planName}`;
  document.getElementById("checkoutPlanName").textContent = `${planName} plan`;
  document.getElementById("checkoutPrice").innerHTML =
    `$${price} <small>${billingPeriod === "yearly" ? "/ month, billed yearly" : "/ month"}</small>`;
  document.getElementById("checkoutFeatures").replaceChildren(
    ...features.map((feature) => {
      const item = document.createElement("li");
      item.textContent = feature;
      return item;
    }),
  );
}

function openCheckout(plan = selectedCheckoutPlan) {
  const currentUser = getCurrentUser();
  setCheckoutPlan(plan);
  if (!currentUser) {
    checkoutAfterAuth = true;
    openAuthModal(getDemoUsers().length ? "login" : "register");
    return;
  }
  document.getElementById("checkoutName").value = currentUser.name;
  document.getElementById("checkoutEmail").value = currentUser.email;
  showFormMessage(document.getElementById("checkoutForm"), "", false);
  updateCardPreview();
  lastFocusedElement = document.activeElement;
  checkoutModal.classList.add("is-open");
  checkoutModal.setAttribute("aria-hidden", "false");
  body.classList.add("modal-open");
  setTimeout(() => document.getElementById("checkoutCard").focus(), 0);
}

function closeCheckout() {
  checkoutModal.classList.remove("is-open");
  checkoutModal.setAttribute("aria-hidden", "true");
  body.classList.remove("modal-open");
  lastFocusedElement?.focus();
}

document.querySelectorAll("[data-open-checkout]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openCheckout(button.dataset.plan);
  });
});
document.querySelectorAll("[data-plan-card]").forEach((card) => {
  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a")) return;
    openCheckout(card.dataset.planCard);
  });
});
document
  .querySelectorAll("[data-close-checkout]")
  .forEach((button) => button.addEventListener("click", closeCheckout));

document.getElementById("checkoutCard").addEventListener("input", (event) => {
  event.currentTarget.value = formatCardNumber(event.currentTarget.value);
  updateCardPreview();
});
document.getElementById("checkoutExpiry").addEventListener("input", (event) => {
  event.currentTarget.value = formatExpiry(event.currentTarget.value);
  updateCardPreview();
});
document.getElementById("checkoutCvc").addEventListener("input", (event) => {
  event.currentTarget.value = event.currentTarget.value
    .replace(/\D/g, "")
    .slice(0, 4);
});
document
  .getElementById("checkoutName")
  .addEventListener("input", updateCardPreview);

document.getElementById("checkoutForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.checkValidity()) return form.reportValidity();
  if (!passesLuhn(document.getElementById("checkoutCard").value)) {
    showFormMessage(
      form,
      "Enter a valid demo debit card number. Try 4242 4242 4242 4242.",
    );
    return;
  }
  if (!hasValidExpiry(document.getElementById("checkoutExpiry").value)) {
    showFormMessage(form, "Enter a valid future expiry date.");
    return;
  }
  form.reset();
  closeCheckout();
  showToast(
    `${getPlanCard(selectedCheckoutPlan).querySelector("h3").textContent.trim()} trial activated`,
  );
});

/* ========== KEYBOARD FOCUS MANAGEMENT FOR MODALS ========== */
document.addEventListener("keydown", (event) => {
  if (!modal.classList.contains("is-open")) return;
  if (event.key === "Escape") return closeAuthModal();
  if (event.key !== "Tab") return;
  const focusable = [
    ...dialog.querySelectorAll("button, input, a[href]"),
  ].filter((item) => !item.disabled && !item.closest("[hidden]"));
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

document.addEventListener("keydown", (event) => {
  if (!checkoutModal.classList.contains("is-open")) return;
  if (event.key === "Escape") return closeCheckout();
  if (event.key !== "Tab") return;
  const focusable = [
    ...checkoutDialog.querySelectorAll("button, input"),
  ].filter((item) => !item.disabled);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

/* ========== THEME PREFERENCE & DARK MODE ========== */
const themeToggle = document.getElementById("themeToggle");
function applyTheme(isDark) {
  body.classList.toggle("dark-theme", isDark);
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Enable light mode" : "Enable dark mode",
  );
  themeToggle.innerHTML = isDark
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2m0 14v2M3 12h2m14 0h2m-3.6-5.4 1.4-1.4M5.2 18.8l1.4-1.4m0-10.8-1.4-1.4m12.2 13.6-1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/></svg>';
}
applyTheme(localStorage.getItem("novaAITheme") === "dark");
themeToggle.addEventListener("click", () => {
  const willBeDark = !body.classList.contains("dark-theme");
  applyTheme(willBeDark);
  localStorage.setItem("novaAITheme", willBeDark ? "dark" : "light");
  showToast("Theme changed");
});

/* ========== PRICING TOGGLE & SECTION NAVIGATION ========== */
document.querySelectorAll("[data-billing]").forEach((button) => {
  button.addEventListener("click", () => {
    const billingPeriod = button.dataset.billing;
    document
      .querySelectorAll("[data-billing]")
      .forEach((item) => item.classList.toggle("is-selected", item === button));
    document.querySelectorAll(".price [data-monthly]").forEach((price) => {
      price.textContent = price.dataset[billingPeriod];
    });
    document.querySelectorAll("[data-price-suffix]").forEach((suffix) => {
      suffix.textContent =
        billingPeriod === "yearly" ? "/ month, billed yearly" : "/ month";
    });
    if (checkoutModal.classList.contains("is-open"))
      setCheckoutPlan(selectedCheckoutPlan);
  });
});

const navLinks = [...document.querySelectorAll('.nav-menu a[href^="#"]')];
const trackedSections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) =>
        link.classList.toggle(
          "is-active",
          link.getAttribute("href") === `#${entry.target.id}`,
        ),
      );
    });
  },
  { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
);
trackedSections.forEach((section) => sectionObserver.observe(section));

/* ========== FAQ: TOGGLE BEHAVIOR ========== */
document.querySelectorAll(".faq-list details").forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    document.querySelectorAll(".faq-list details").forEach((otherItem) => {
      if (otherItem !== item) otherItem.open = false;
    });
  });
});

/* ========== AI CHAT ASSISTANT ========== */
const chatToggle = document.getElementById("chatToggle");
const chatPanel = document.getElementById("chatPanel");
const chatClose = document.getElementById("chatClose");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const quickReplies = document.getElementById("quickReplies");
const clearChat = document.getElementById("clearChat");
const welcomeMessage =
  "Hi! I am the NovaAI assistant. How can I help you explore the product?";

function getChatHistory() {
  try {
    return JSON.parse(localStorage.getItem("novaAIChatHistory") || "[]");
  } catch {
    return [];
  }
}
function saveChatHistory(history) {
  localStorage.setItem("novaAIChatHistory", JSON.stringify(history));
}
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
function createChatMessage(message) {
  const article = document.createElement("article");
  article.className = `chat-message chat-message--${message.role}`;
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.textContent = message.text;
  const time = document.createElement("time");
  time.className = "chat-time";
  time.dateTime = new Date(message.timestamp).toISOString();
  time.textContent = formatTime(message.timestamp);
  article.append(bubble, time);
  return article;
}
function renderChat() {
  chatMessages.replaceChildren();
  const history = getChatHistory();
  const messages = history.length
    ? history
    : [{ role: "bot", text: welcomeMessage, timestamp: Date.now() }];
  messages.forEach((message) =>
    chatMessages.append(createChatMessage(message)),
  );
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
function setChatOpen(isOpen) {
  chatPanel.hidden = !isOpen;
  chatToggle.setAttribute("aria-expanded", String(isOpen));
  chatToggle.setAttribute(
    "aria-label",
    isOpen ? "Close AI chat assistant" : "Open AI chat assistant",
  );
  if (isOpen) {
    renderChat();
    setTimeout(() => chatInput.focus(), 0);
  }
}
function getBotResponse(question) {
  const text = question.toLowerCase();

  if (
    text.includes("how are you") ||
    text.includes("how r u") ||
    text.includes("how are you doing")
  ) {
    return "Doing awesome, thanks for asking! 😊 I'm here to help you explore NovaAI—from features and pricing to workflow setup. What catches your interest?";
  }
  if (
    text.includes("hi") ||
    text.includes("hello") ||
    text.includes("hey") ||
    text.includes("good morning") ||
    text.includes("good evening")
  ) {
    return "Hey there! Welcome to NovaAI 👋 I'm your assistant here. Curious about our AI automation platform, pricing, or how it all works? Let's dive in!";
  }
  if (
    text.includes("who are you") ||
    text.includes("what are you") ||
    text.includes("who created this") ||
    text.includes("who made this")
  ) {
    return "I'm the NovaAI virtual assistant—here to guide you through our product and help you find exactly what you're looking for. Think of me as your personal product tour guide! 🤖";
  }
  if (
    text.includes("what is novaai") ||
    text.includes("what is this website") ||
    text.includes("what is this") ||
    text.includes("novaai")
  ) {
    return "NovaAI is an elegant AI-powered workspace designed for modern teams. We automate repetitive workflows, deliver instant insights, and help you make smarter decisions faster. Perfect for businesses looking to scale efficiently! 🚀";
  }
  if (
    (text.includes("who are you") && text.includes("owner")) ||
    text.includes("who owns this") ||
    text.includes("who is the owner") ||
    text.includes("who is behind this")
  ) {
    return "This is the official NovaAI landing page—showcasing our modern, AI-driven workflow automation platform built for ambitious teams worldwide.";
  }
  if (
    text.includes("feature") ||
    text.includes("features") ||
    text.includes("tools") ||
    text.includes("product")
  ) {
    return "Great question! NovaAI packs powerful features: 🎯 Workflow Automation (handle routine tasks automatically), 📊 AI-Powered Insights (data analysis in seconds), 🤝 Team Collaboration (built-in permission controls), and 📈 Advanced Analytics. All designed to save time and boost productivity!";
  }
  if (
    text.includes("pricing") ||
    text.includes("price") ||
    text.includes("cost") ||
    text.includes("plan") ||
    text.includes("plans")
  ) {
    return "Our pricing is transparent and flexible! 💰 Plans start at just $19/month for individuals. Need more? Our Professional and Enterprise plans come with advanced features. Plus, save 20% with yearly billing! Check the pricing section above for full details.";
  }
  if (
    text.includes("how does it work") ||
    text.includes("how does this work") ||
    text.includes("how it works") ||
    text.includes("start")
  ) {
    return "Simple three-step process: 1️⃣ Connect your favorite tools and data sources, 2️⃣ Define your workflows visually (no coding needed!), 3️⃣ Let NovaAI automate while your team focuses on strategy and growth. It's that smooth!";
  }
  if (
    text.includes("demo") ||
    text.includes("trial") ||
    text.includes("book") ||
    text.includes("free trial")
  ) {
    return "Perfect timing! 🎁 We offer a 14-day free trial—no credit card needed. You get full access to explore all features and see how NovaAI transforms your workflow. Ready to start? Head to the pricing section and claim your trial!";
  }
  if (
    text.includes("support") ||
    text.includes("help") ||
    text.includes("need help") ||
    text.includes("can you help")
  ) {
    return "Absolutely, I've got you! 💪 I can walk you through features, explain pricing, break down workflows, or help you pick the right plan. What's on your mind?";
  }
  if (
    text.includes("nice") ||
    text.includes("good") ||
    text.includes("looks") ||
    text.includes("design") ||
    text.includes("beautiful")
  ) {
    return "Thanks so much! 🎨 We designed this interface to be clean, modern, and intuitive—because great tools shouldn't be complicated. Your experience matters to us!";
  }
  if (
    text.includes("where") ||
    text.includes("contact") ||
    text.includes("email") ||
    text.includes("call") ||
    text.includes("message")
  ) {
    return "Good question! This demo showcases our product experience. For direct inquiries about partnerships, enterprise deals, or custom solutions, most businesses would find contact details in our footer or dedicated contact page. Always happy to connect! 📧";
  }
  if (
    text.includes("your name") ||
    text.includes("what is your name") ||
    text.includes("name")
  ) {
    return "I'm your NovaAI Assistant! 🤖 My job is to guide you through everything NovaAI—features, pricing, workflows, and onboarding. Think of me as your friendly product expert right here on this page.";
  }
  return "Great question! 👀 I'm here to help with NovaAI features, pricing plans, workflow automation, getting started, or anything else product-related. What would you like to know?";
}
function addToHistory(role, text) {
  const history = getChatHistory();
  const message = { role, text, timestamp: Date.now() };
  history.push(message);
  saveChatHistory(history.slice(-40));
  chatMessages.append(createChatMessage(message));
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
function showTyping() {
  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  indicator.id = "typingIndicator";
  indicator.setAttribute("aria-label", "NovaAI is typing");
  indicator.append(
    document.createElement("span"),
    document.createElement("span"),
    document.createElement("span"),
  );
  chatMessages.append(indicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
function sendChatMessage(value) {
  const message = value.trim();
  if (!message) return;
  addToHistory("user", message);
  showToast("Message sent");
  showTyping();
  window.setTimeout(() => {
    document.getElementById("typingIndicator")?.remove();
    addToHistory("bot", getBotResponse(message));
  }, 420);
}
chatToggle.addEventListener("click", () => setChatOpen(chatPanel.hidden));
chatClose.addEventListener("click", () => setChatOpen(false));
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendChatMessage(chatInput.value);
  chatInput.value = "";
});
quickReplies.addEventListener("click", (event) => {
  if (event.target.matches("button")) sendChatMessage(event.target.textContent);
});
clearChat.addEventListener("click", () => {
  localStorage.removeItem("novaAIChatHistory");
  renderChat();
  showToast("Chat cleared");
});

document.getElementById("year").textContent = new Date().getFullYear();
updateAuthUI();
renderChat();
