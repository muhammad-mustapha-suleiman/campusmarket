const listingForm = document.getElementById("listingForm");
const categoryButtons = document.querySelectorAll(".category-btn" );
const uploadBox = document.querySelector(".upload-box");
const sellBtn = document.getElementById("sellBtn");
const toast = document.getElementById("toast");
const BASE_URL = "https://campusmarketserver.onrender.com";
let category = "";
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

categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
        categoryButtons.forEach((btn) => {
            btn.classList.remove("active");
        });
        button.classList.add("active");
        category = button.dataset.category;
    });
});
 
image.addEventListener("change", () => {
    const file = image.files[0];  
        if (!file) return;

        const image_url = URL.createObjectURL(file);

        uploadBox.innerHTML = `
            <img src="${image_url}" style=" width:100%; height:100%;
            object-fit:cover; border-radius:12px; ">
        `;
});

listingForm.addEventListener("submit", async(event)=>{
    event.preventDefault();
    sellBtn.ariaDisabled = true;
    try {
        const token = localStorage.getItem("token");
        const title = document.getElementById("title").value;
        const price = document.getElementById("price").value;
        const description = document.getElementById("description").value;
        const imagFile = document.getElementById("image").files[0];

        if(!category){
            showToast("Choose a category");
            return;
        }
        
        const formData = new FormData();

        formData.append("title", title);
        formData.append("price", price);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("image_url", imagFile);

         if(imagFile.size > 5 * 1024 * 1024){
            showToast("image must be less than 5MB");
            return;
        } 

        const response = await fetch(`${BASE_URL}/api/listings`, 
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            }
        );

        const data = await response.json();
        if(data.success){
            showToast(data.message);
            window.location.href = "index.html";
        }

    } catch (error) {
        console.log(error);
        showToast(error.message);
    }
});
