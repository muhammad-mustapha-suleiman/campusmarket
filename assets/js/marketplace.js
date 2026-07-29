const listingsContainer = document.getElementById("listingsContainer");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");
const BASE_URL = "https://campusmarketserver.onrender.com";
let searchKeyword = "";
const disclaimerModal = document.getElementById("disclaimer-modal");
const continueBtn = document.getElementById("continue-btn");
let selectedCategory = "";
let allListings = [];

window.addEventListener("DOMContentLoaded",()=>{

    const showDisclaimer = localStorage.getItem("showDisclaimer");

    if(showDisclaimer==="true"){

        disclaimerModal.classList.add("show");

        localStorage.removeItem("showDisclaimer");

    }

});

continueBtn.addEventListener("click",()=>{

    disclaimerModal.classList.remove("show");

});


const fetchListings = async()=>{
    listingsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p> Loading listings </p>
        </div>
    `;
    try {
        const response = await fetch(`${BASE_URL}/api/listings/`);
        const data = await response.json();
        allListings = data.data;
        renderListings(allListings);

    } catch (error) {
        console.log(error);
    }
}

const renderListings = (listings)=>{
    listingsContainer.innerHTML = "";
    listings.forEach((listing) => {
        const card = document.createElement("div");
        card.classList.add("listing-card");

         card.innerHTML = `
            <a href="${listing.image_url}" target="_self" class="image-link">
                <img src="${listing.image_url}" class="card-images"
                onerror="this.src='images/Placeholder.png'">
            </a>
            <h3>${listing.title}</h3>
            <summary class="listing-content">Description: ${listing.description}</summary>
            <p class="price" >Price: &#8358;${listing.price}</p>
            <p class="category" >Category: ${listing.category}</p>
            <button onclick='chatSeller("${listing.seller_phone}", ${listing.id}, ${JSON.stringify(listing.title)})'>
    Chat Seller
</button>
            `;
            listingsContainer.appendChild(card);
    });

    if(listings.length === 0){
        listingsContainer.innerHTML = `
            <div class="empty-state">
                <h2> No listings found </h2>
                <p> Try another search or <a href="sell.html">create a listing</a></p>
            </div>
        `;
        return;
    }
}
//
const filterListings = ()=>{
    const filteredListings = allListings.filter((listing)=>{
        const matchesSearch = 
        searchKeyword === "" ||
        listing.title.toLowerCase().includes(searchKeyword) ||
        listing.description.toLowerCase().includes(searchKeyword) ||
        listing.category.toLowerCase().includes(searchKeyword);

        const matchesCategory = selectedCategory === "" || listing.category.toLowerCase() === selectedCategory.toLowerCase();

        return(
            matchesSearch && matchesCategory
        );
    });

    renderListings(filteredListings);
}
//search
searchInput.addEventListener("input", ()=>{
    searchKeyword = searchInput.value.trim().toLowerCase();
    listingsContainer.innerHTML = "";
    filterListings();
});

//filter
filterButtons.forEach((button)=>{
    button.addEventListener("click", ()=>{
        filterButtons.forEach((btn)=>{
            btn.classList.remove("active");
            button.classList.add("active");
        });
        selectedCategory = button.dataset.category;
        listingsContainer.innerHTML = "";
    filterListings();
    });
});


const chatSeller = async (phone, id, name) => {
    try {
        await fetch(`${BASE_URL}/api/listings/${id}/connects`, {
            method: "PATCH"
        });
    } catch (error) {
        console.error(error);
    }

    const message = encodeURIComponent(
        `Hi! I'm interested in ${name}. Let's talk.`
    );

    window.open(
    `https://wa.me/${phone}?text=${message}`,
    "_blank"
);
};

fetchListings();
logOut();
