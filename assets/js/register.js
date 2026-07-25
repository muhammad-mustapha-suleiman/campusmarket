const registerForm = document.getElementById("registerForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const campusInput = document.getElementById("campus");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const registerBtn = document.getElementById("registerBtn");
const passwordMatch = document.getElementById("passwordMatch");
const toast = document.getElementById("toast");
let phone = "";
let toastTimer;
const BASE_URL = "https://campusmarketserver.onrender.com";

const showToast = (message)=>{
    clearTimeout(toastTimer);

    toast.textContent = message;
    toast.classList.add("show");

    toastTimer = setTimeout(()=>{
        hideToast();
    }, 3000);
}

const hideToast = ()=>{
    toast.classList.remove("show");
}

const highlight= (input)=>{
    input.classList.add("input-error");
}

const clearHighlight = (input)=>{
    input.classList.remove("input-error");
}

const validateName = ()=>{
    const name = nameInput.value.trim();

    if(!name){
        showToast("Name is required");
        highlight(nameInput);
        nameInput.focus();
        return false;
    }

    if(name.length < 3){
        showToast("Name must contain at least 3 characters");
        highlight(nameInput);
        nameInput.focus();
        return false;
    }

    clearHighlight(nameInput);
    return true;
}

const validateEmail = ()=>{
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if(!email){
        showToast("Email is required");
        highlight(emailInput);
        emailInput.focus();
        return false;
    }

    if(!emailRegex.test(email)){
        showToast("Enter a valid email address");
        highlight(emailInput);
        emailInput.focus();
        return false;
    }

    clearHighlight(emailInput);
    return true;
}

const validatePhone = ()=>{
    phone = phoneInput.value.trim();

    if(!phone){
        showToast("Phone number is required");
        highlight(phoneInput);
        phoneInput.focus();
        return false;
    }

    if(phone.startsWith("+234")){
        phone = phone.slice(1);
    } else if(phone.startsWith("0")){
        phone = "234" + phone.slice(1);
    } else if(/^\d{10}$/.test(phone)){
        phone = "234" + phone;
    }

    
    if(!/^234\d{10}$/.test(phone)){
        showToast("Enter a valid Nigerian WhatsApp Number");
        highlight(phoneInput);
        phoneInput.focus();
        return false;
    }

    clearHighlight(phoneInput);
    return true;
}

const validateCampus = ()=>{
    const campus = campusInput.value;
    if(!campus){
        showToast("Select your campus");
        highlight(campusInput);
        campusInput.focus();
        return false;
    }

    clearHighlight(campusInput);
    return true;
}

const validatePassword = ()=>{
    const lengthRule = document.getElementById("lengthRule");
    const upperRule = document.getElementById("upperRule");
    const lowerRule = document.getElementById("lowerRule");
    const numberRule = document.getElementById("numberRule");
    const specialRule = document.getElementById("specialRule");

    const password = passwordInput.value;
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    toggleRule(lengthRule,hasLength);
    toggleRule(upperRule,hasUpper);
    toggleRule(lowerRule,hasLower);
    toggleRule(numberRule,hasNumber);
    toggleRule(specialRule,hasSpecial);

    if(!password){
        showToast("Password is required");
        highlight(passwordInput);
        passwordInput.focus();
        return false;
    }

    if(!hasLength){
        showToast("Please match password rules");
        highlight(passwordInput);
        passwordInput.focus();
        highlight(passwordInput);
        return false;
    }

    clearHighlight(passwordInput);
    return true;
}

const toggleRule = (element,valid)=>{
    if(valid){
        element.classList.add("valid");
        element.textContent = "✓ " + element.textContent.substring(2);
    }else{
        element.classList.remove("valid");
        element.textContent = "○ " + element.textContent.substring(2);
    }
}

const validatePasswordMatch = ()=>{

    if(passwordInput.value !== confirmPasswordInput.value){
        showToast("Passwords mismatch");
        highlight(confirmPasswordInput);
        confirmPasswordInput.focus();
        return false;
    }

    clearHighlight(confirmPasswordInput);
    return true;
}

passwordInput.addEventListener("input",() => {
    document.getElementById("passwordRules").classList.toggle("hidden");
    validatePassword();
});

confirmPasswordInput.addEventListener("input",() => {
    if(confirmPasswordInput.value === ""){
        passwordMatch.textContent = "";
    } else if(passwordInput.value === confirmPasswordInput.value){
        passwordMatch.textContent = "✓ Passwords match";
        passwordMatch.style.color = "#22C55E";
    }else{
        passwordMatch.textContent = "✗ Passwords do not match";
        passwordMatch.style.color = "#EF4444";
    }
});

nameInput.addEventListener("input", ()=>{
    if(nameInput.value.trim() >=3 ){
        clearHighlight(nameInput);
        hideToast();
    }
});

emailInput.addEventListener("input", ()=>{
    if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())){
        clearHighlight(emailInput);
        hideToast();
    }
});
phoneInput.addEventListener("input", ()=>{
    let phone = phoneInput.value.trim();
    if(phone.startsWith("+234")){
        phone = phone.slice(1);
    } else if(phone.startsWith("0")){
        phone = "234" + phone.slice(1);
    } else if(/^\d{10}$/.test(phone)){
        phone = "234" + phone;
    }
    
    if(!/^234\d{10}$/.test(phone)){
        clearHighlight(phoneInput);
        hideToast();
    }
});
campusInput.addEventListener("change", ()=>{
    const campus = campusInput.value;
    if(campus){
        showToast("Select your campus");
        clearHighlight(campusInput);
        hideToast();
    }
});


registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if(!validateName()) return;
    if(!validateEmail()) return;
    if(!validatePhone()) return;
    if(!validateCampus()) return;
    if(!validatePassword()) return;
    if(!validatePasswordMatch()) return;

    hideToast();

    registerBtn.disabled = true;
    registerBtn.textContent = "Creating Account...";

    const user = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        campus: campusInput.value,
        password: passwordInput.value
    };

    try {
        const response =await fetch(`${BASE_URL}/api/auth/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(user)
            });

            const data = await response.json();
            if(response.status === 201){
                showToast("✅ Account created successfully! Redirecting to Sign In...");
                registerBtn.textContent = "Success";
                setTimeout(() => { window.location.href = "login.html"; }, 1000);
            } else {
                showToast(data.message || "Registration failed.");
                registerBtn.disabled = false;
                registerBtn.textContent = "Join Campus Market";
            }
        } catch (error) {
            showToast(error.message);
            registerBtn.textContent = "Join Campus Market";
        }
});

