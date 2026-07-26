const myListingsContainer = document.getElementById("myListingsContainer");
const deleteModal = document.getElementById("deleteModal");
const confirmDelete = document.getElementById("confirmDelete");
const cancelDelete = document.getElementById("cancelDelete");
const token = localStorage.getItem("token");
const toast = document.getElementById("toast");
const BASE_URL = "https://campusmarketserver.onrender.com";
let listingToDelete = null;
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

const fetchMyListings = async ()=>{

    myListingsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p> Loading My listings </p>
        </div>
    `;

    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${BASE_URL}/api/listings/myListings`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        if(data.data.length === 0){
        myListingsContainer.innerHTML = `
            <div class="empty-state">
                <h2> No listings found </h2>
                <p> Try another search or create a listing </p>
                <a href="sell.html">Create a listing</a>
            </div>
        `;
        return;
    }
     
    myListingsContainer.innerHTML = "";
        data.data.forEach(listing => {
            const card = document.createElement("div");
            card.classList.add("listing-card");

            card.innerHTML = `
                <image  src="${listing.image_url}" class="card-images">
                <h3>${listing.title}</h3>
                <summary class="listing-content">Description: ${listing.description}</summary>
                <p class="price" >Price: &#8358;${listing.price}</p>
                <p class="category" >Category: ${listing.category}</p>
                <div class="action-btns">
                <button class="del-btn" data-id=${listing.id}>Delete</button>
                <button class="sold-btn" data-id=${listing.id} data-status=${listing.status}>Mark as Sold</button>
                </div>
            `;

            const deleteBtn = card.querySelectorAll(".del-btn");

            deleteBtn.forEach(button => button.addEventListener("click", ()=>{
                openDeleteModal(button.dataset.id);
            }));

            const soldBtn = card.querySelectorAll(".sold-btn");
            console.log(soldBtn.length);

            soldBtn.forEach(button => {
                if(button.dataset.status === 'available'){
                    button.textContent = "Mark as Sold";
                } else{
                    button.textContent = "Mark as Available";
                }
            });

            soldBtn.forEach(button=>{
                button.addEventListener("click", async()=>{
                    try {
                        const nextStatus = button.dataset.status === 'available'? "sold" : "available";

                        const response = await fetch(`${BASE_URL}/api/listings/${button.dataset.id}/status`,
                            {
                                method: "PATCH",
                                headers: {
                                    "content-Type": "application/json",
                                    Authorization: `Bearer ${token}`
                                },

                                body: JSON.stringify({ status: nextStatus})
                            }
                        );

                        const data = await response.json();

                        if(!response.status == 200){
                            showToast(data.message);
                        }

                        button.dataset.status = nextStatus;

                        button.textContent = nextStatus === "available" ? "Mark as Sold" : "Mark as available";

                        showToast(data.message);
                    } catch (error) {
                        showToast(error.message);
                    }
                });
            });

            myListingsContainer.appendChild(card);
            
        });
    } catch (error) {
        console.log(error);
    }
}

const openDeleteModal= (id)=>{
    listingToDelete = id;
    deleteModal.style.display = "flex";
}

cancelDelete.addEventListener("click", ()=>{
    listingToDelete = null;
    deleteModal.style.display = "none";
});

confirmDelete.addEventListener("click", async()=>{
    if(!listingToDelete) return;

    confirmDelete.disabled = true;
    confirmDelete.textContent = "Deleting....";

    try {
        const response = await fetch(`${BASE_URL}/api/listings/${listingToDelete}`,
            {
                method: "DELETE",
                headers:{
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        if(!response.ok){
            throw new Error(result.message);
        }

        deleteModal.style.display = "none";
        listingToDelete = null;
        await fetchMyListings();
    } catch (error) {
        alert(error.message);
    }

    finally{
        confirmDelete.disabled = false;
        confirmDelete.textContent = "Delete";
    }
});


fetchMyListings();