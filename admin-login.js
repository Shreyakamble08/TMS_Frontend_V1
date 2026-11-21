// admin-login.js
// ==============================================
// TRANSPORT MANAGEMENT SYSTEM – ADMIN LOGIN
// Level 1 · Frontend-only authentication
// ==============================================

// ==============================================
// DEMO AUTHENTICATION CONFIGURATION
// Replace this section with API authentication
// when backend integration is implemented.
// ==============================================
const DUMMY_PHONE = "8830750491";
const DUMMY_PASSWORD = "Admin@123";

// ==============================================
// DOM ELEMENTS
// ==============================================
const loginForm = document.getElementById("login-form");
const phoneInput = document.getElementById("phone");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.getElementById("toggle-password");
const eyeOpen = document.getElementById("eye-open");
const eyeClosed = document.getElementById("eye-closed");
const phoneError = document.getElementById("phone-error");
const passwordError = document.getElementById("password-error");
const formStatus = document.getElementById("form-status");
const loginBtn = document.getElementById("login-btn");

// ==============================================
// UTILITY: SHOW / HIDE INLINE ERRORS
// ==============================================
function showError(element, message) {
    element.textContent = message;
    element.classList.remove("hidden");
}

function clearError(element) {
    element.textContent = "";
    element.classList.add("hidden");
}

// ==============================================
// UTILITY: SHOW FORM STATUS (success / failure)
// ==============================================
function showStatus(message, type) {
    formStatus.textContent = message;
    formStatus.classList.remove("hidden", "bg-red-50", "text-red-700", "border", "border-red-200",
        "bg-green-50", "text-green-700", "border-green-200");

    if (type === "error") {
        formStatus.classList.add("bg-red-50", "text-red-700", "border", "border-red-200");
    } else if (type === "success") {
        formStatus.classList.add("bg-green-50", "text-green-700", "border", "border-green-200");
    }
}

function clearStatus() {
    formStatus.textContent = "";
    formStatus.classList.add("hidden");
    formStatus.classList.remove("bg-red-50", "text-red-700", "border", "border-red-200",
        "bg-green-50", "text-green-700", "border-green-200");
}

// ==============================================
// PASSWORD VISIBILITY TOGGLE
// ==============================================
togglePasswordBtn.addEventListener("click", function () {
    const isPassword = passwordInput.type === "password";

    if (isPassword) {
        passwordInput.type = "text";
        eyeOpen.classList.add("hidden");
        eyeClosed.classList.remove("hidden");
        togglePasswordBtn.setAttribute("aria-label", "Hide password");
        togglePasswordBtn.setAttribute("aria-pressed", "true");
    } else {
        passwordInput.type = "password";
        eyeOpen.classList.remove("hidden");
        eyeClosed.classList.add("hidden");
        togglePasswordBtn.setAttribute("aria-label", "Show password");
        togglePasswordBtn.setAttribute("aria-pressed", "false");
    }
});

// ==============================================
// VALIDATION HELPERS
// ==============================================
function validatePhone(phone) {
    if (!phone.trim()) {
        return { valid: false, message: "Phone number is required." };
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.trim())) {
        return { valid: false, message: "Please enter a valid 10-digit phone number." };
    }
    return { valid: true, message: "" };
}

function validatePassword(password) {
    if (!password) {
        return { valid: false, message: "Password is required." };
    }
    return { valid: true, message: "" };
}

// ==============================================
// AUTHENTICATION LOGIC
// ==============================================
function authenticateUser(phone, password) {
    const isPhoneMatch = phone.trim() === DUMMY_PHONE;
    const isPasswordMatch = password === DUMMY_PASSWORD;

    if (isPhoneMatch && isPasswordMatch) {
        return { success: true, message: "Login successful. Redirecting…" };
    }

    return {
        success: false,
        message: "Invalid phone number or password. Please try again."
    };
}

// ==============================================
// FORM SUBMISSION HANDLER
// ==============================================
loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    clearError(phoneError);
    clearError(passwordError);
    clearStatus();

    const phone = phoneInput.value;
    const password = passwordInput.value;

    let isValid = true;

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
        showError(phoneError, phoneValidation.message);
        isValid = false;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        showError(passwordError, passwordValidation.message);
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in…";

    setTimeout(function () {
        const result = authenticateUser(phone, password);

        if (result.success) {
            showStatus(result.message, "success");
            loginBtn.textContent = "Success!";

            // --------------------------------------------------
            // UPDATED REDIRECT: Point to admin-template.html
            // --------------------------------------------------
            const REDIRECT_URL = "/pages/dashboard/dashboard.html"; // Update this to the actual admin dashboard URL

            setTimeout(function () {
                window.location.href = REDIRECT_URL;
            }, 900);
        } else {
            showStatus(result.message, "error");
            loginBtn.disabled = false;
            loginBtn.textContent = "Login";
            phoneInput.focus();
        }
    }, 400);
});

// ==============================================
// REAL-TIME CLEARING OF FIELD ERRORS
// ==============================================
phoneInput.addEventListener("input", function () {
    clearError(phoneError);
    clearStatus();
});

passwordInput.addEventListener("input", function () {
    clearError(passwordError);
    clearStatus();
});