const listingForm = document.getElementById("listingForm");
const categoryButtons = document.querySelectorAll(".category-btn" );
const uploadBox = document.querySelector(".upload-box");
const sellBtn = document.getElementById("sellBtn");
const toast = document.getElementById("toast");
const BASE_URL = "https://campusmarketserver.onrender.com";
const image = document.getElementById("image");
let category = "";
let toastTimer;

// Holds the compressed version of whatever file is currently selected,
// produced in the background as soon as the user picks it — so by the
// time they hit submit, no compression work is left to do.
let compressedImageFile = null;
let compressionPromise = null;

sellBtn.disabled = false;

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

    // Instant local preview — unchanged from before, so selecting an
    // image still feels immediate. This uses the raw file only for
    // on-screen display; it is never uploaded.
    const image_url = URL.createObjectURL(file);

    uploadBox.innerHTML = `
        <img src="${image_url}" style=" width:100%; height:100%;
        object-fit:cover; border-radius:12px; ">
    `;

    // Compress in the background, silently. The user keeps filling in
    // title/price/description while this runs — by the time they hit
    // "Sell", compressedImageFile is already populated and submit adds
    // no extra wait in the common case.
    compressedImageFile = null;
    compressionPromise = compressImage(file)
        .then((result) => {
            compressedImageFile = result;
            return result;
        })
        .catch((error) => {
            console.error("Background compression failed, will fall back to original file:", error);
            compressedImageFile = file;
            return file;
        });
});

listingForm.addEventListener("submit", async(event)=>{
    event.preventDefault();

    const title = document.getElementById("title").value;
    const price = document.getElementById("price").value;
    const description = document.getElementById("description").value;
    const imagFile = document.getElementById("image").files[0];

    if(!category){
        showToast("Choose a category");
        return;
    }

    if(!imagFile){
        showToast("Choose an image");
        return;
    }

    if(imagFile.size > 5 * 1024 * 1024){
        showToast("image must be less than 5MB");
        return;
    }

    sellBtn.disabled = true;
    sellBtn.textContent = "Creating your listing";

    try {
        const token = localStorage.getItem("token");

        // In almost every real submit, this promise already resolved
        // while the user was typing — this await returns immediately.
        // It only actually waits if they upload and submit within the
        // same instant.
        const uploadFile = compressionPromise
            ? await compressionPromise
            : imagFile;

        const formData = new FormData();

        formData.append("title", title);
        formData.append("price", price);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("image_url", uploadFile, "listing.webp");

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
            window.location.href = "marketplace.html";
        } else {
            showToast(data.message || "Something went wrong");
            sellBtn.disabled = false;
            sellBtn.textContent = "Creating your listing";
        }

    } catch (error) {
        console.log(error);
        showToast(error.message);
        sellBtn.disabled = false;
        sellBtn.textContent = "Creating your listing";
    }
});
