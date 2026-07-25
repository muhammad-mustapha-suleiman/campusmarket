const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById( "email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const toast = document.getElementById("toast");
const BASE_URL = "https://campusmarketserver.onrender.com";
let toastTimer;

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

loginForm.addEventListener("submit",async (e) => {
    e.preventDefault();
    loginBtn.disabled = true;
    loginBtn.textContent = "Signing In...";
    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                })

            });

        const data = await response.json();
        if (response.status === 200) {
            localStorage.setItem("token", data.token);
            showToast("✅ Login Successful! Redirecting...");
            loginBtn.textContent = "Success";
            setTimeout(() => {window.location.href ="index.html";}, 800);
        } else {
            showToast(data.message || "Invalid email or password.")
            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";
        }
    } catch (error){
        showToast(error.message);
        loginBtn.disabled = false;
        loginBtn.textContent = "Sign In";
    }
});