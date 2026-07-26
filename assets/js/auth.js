const toast = document.getElementById("toast");
let toastTimer;
const showToast = (message, type = "error")=>{
    clearTimeout(toastTimer);

    toast.textContent = message;
    toast.classList.remove("toast-success", "toast-error");
    toast.classList.add(type === "success" ? "toast-success" : "toast-error");
    toast.classList.add("show");

    toastTimer = setTimeout(()=>{
        hideToast();
    }, 4000);
}

const hideToast = ()=>{
    toast.classList.remove("show");
}

const requireAuth = ()=>{
    const token = localStorage.getItem("token");

    if(!token){
        showToast("You're not logged in");
        setTimeout(()=>{
            window.location.href = "login.html";
        }, 1000);
    }
}

requireAuth();

const logOut = ()=>{
    document.getElementById("logout").addEventListener("click", ()=>{
        localStorage.removeItem("token");
        requireAuth();
    });
}
