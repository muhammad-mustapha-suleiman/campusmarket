
const requireAuth = ()=>{
    const token = localStorage.getItem("token");

    if(!token){
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
