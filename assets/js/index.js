const listingsContainer = document.getElementById("listingsContainer");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");
const BASE_URL = "https://campusmarketserver.onrender.com";
let searchKeyword = "";
let selectedCategory = "";
let allListings = [];


const fetchListings = async()=>{
    listingsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"><?div>
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
            <image src="${listing.image_url}" class="card-images"
            onerror="this.src='images/Placeholder.jpg'">
            <h3>${listing.title}</h3>
            <summary class="listing-content">Description: ${listing.description}</summary>
            <p class="price" >Price: &#8358;${listing.price}</p>
            <p class="category" >Category: ${listing.category}</p>
            <button onclick="chatSeller(${listing.seller_phone})">Chat Seller</button>
            `;
            listingsContainer.appendChild(card);
    });

    if(listings.length === 0){
        listingsContainer.innerHTML = `
            <div class="empty-state">
                <h2> No listings found </h2>
                <p> Try another search or create a listing </p>
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


const chatSeller = (phone)=>{
    window.location.href=`https://wa.me/${phone}`;
}

fetchListings();
logOut();