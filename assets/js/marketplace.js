const listingsContainer = document.getElementById("listingsContainer");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");
const BASE_URL = "https://campusmarketserver.onrender.com";
let searchKeyword = "";
const disclaimerModal = document.getElementById("disclaimer-modal");
const continueBtn = document.getElementById("continue-btn");
let selectedCategory = "";
let allListings = [];

// Local fallback asset shown on load failure — never a broken image icon.
const FALLBACK_IMAGE = "assets/images/Placeholder.png";

window.addEventListener("DOMContentLoaded", () => {

    const showDisclaimer = localStorage.getItem("showDisclaimer");

    if (showDisclaimer === "true") {

        disclaimerModal.classList.add("show");

        localStorage.removeItem("showDisclaimer");

    }

});

continueBtn.addEventListener("click", () => {

    disclaimerModal.classList.remove("show");

});


const fetchListings = async () => {
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

/**
 * Cloudinary transformation pipeline
 * ------------------------------------------------------------------
 * A Cloudinary delivery URL always has the shape:
 *   https://res.cloudinary.com/<cloud>/image/upload/<public_id>
 * Any transformation string dropped right after "/upload/" is applied
 * on the fly by Cloudinary's CDN — nothing is re-uploaded or stored
 * again, and the "original" bytes are never sent to the browser.
 * ------------------------------------------------------------------
 */

// Low-level helper: inject a transformation string into a Cloudinary URL.
const cloudinaryTransform = (url, transformation) => {
    if (!url || typeof url !== "string" || !url.includes("/upload/")) {
        return url;
    }
    return url.replace("/upload/", `/upload/${transformation}/`);
}

// Card thumbnail: matches the ~300x220 rendered size with headroom for
// retina, auto format (WebP/AVIF) and auto quality.
const optimizeImage = (url, width = 500, height = 450) => {
    return cloudinaryTransform(
        url,
        `f_auto,q_auto,c_fit,w_${width},h_${height}`
    );
}

// Responsive srcset so phones/tablets/desktops each pull an
// appropriately-sized asset instead of one fixed size for everyone.
const buildCardSrcset = (url) => {
    const widths = [400, 500, 600, 800];
    return widths
        .map((w) => {
            const h = Math.round(w * 0.9);
            return `${optimizeImage(url, w, h)} ${w}w`;
        })
        .join(", ");
}

// Full-resolution (but still capped + auto-format) version, used only
// when the user explicitly opens the image in a new tab.
const optimizeFullImage = (url) => {
    return cloudinaryTransform(url, "f_auto,q_auto,w_1600");
}

// Tiny, heavily-blurred, near-instant placeholder (a few KB) shown
// behind the real image while it loads — a cheap LQIP without needing
// a separate placeholder asset per listing.
const optimizeLQIP = (url) => {
    return cloudinaryTransform(url, "f_auto,q_auto:low,e_blur:1000,w_40");
}

const renderListings = (listings) => {
    listingsContainer.innerHTML = "";

    if (listings.length === 0) {
        listingsContainer.innerHTML = `
            <div class="empty-state">
                <h2> No listings found </h2>
                <p> Try another search or <a href="sell.html">create a listing</a></p>
            </div>
        `;
        return;
    }

    listings.forEach((listing) => {
        const card = document.createElement("div");
        card.classList.add("listing-card");

        const thumbUrl = optimizeImage(listing.image_url);
        const srcset = buildCardSrcset(listing.image_url);
        const lqipUrl = optimizeLQIP(listing.image_url);
        const fullUrl = optimizeFullImage(listing.image_url);

        card.innerHTML = `
            <a href="${fullUrl}" target="_blank" rel="noopener" class="image-link">
                <img
                    src="${thumbUrl}"
                    srcset="${srcset}"
                    sizes="(max-width: 480px) 90vw, (max-width: 768px) 45vw, 300px"
                    class="card-images"
                    loading="lazy"
                    decoding="async"
                    alt="${listing.title}"
                    style="background-image:url('${lqipUrl}');background-size:cover;background-position:center;opacity:0;transition:opacity .35s ease;"
                    onload="this.style.opacity=1;this.style.backgroundImage='none';"
                    onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';this.srcset='';this.style.backgroundImage='none';this.style.opacity=1;this.classList.add('image-fallback');"
                >
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
}

//
const filterListings = () => {
    const filteredListings = allListings.filter((listing) => {
        const matchesSearch =
            searchKeyword === "" ||
            listing.title.toLowerCase().includes(searchKeyword) ||
            listing.description.toLowerCase().includes(searchKeyword) ||
            listing.category.toLowerCase().includes(searchKeyword);

        const matchesCategory = selectedCategory === "" || listing.category.toLowerCase() === selectedCategory.toLowerCase();

        return (
            matchesSearch && matchesCategory
        );
    });

    renderListings(filteredListings);
}
//search
searchInput.addEventListener("input", () => {
    searchKeyword = searchInput.value.trim().toLowerCase();
    filterListings();
});

//filter
filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        filterButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        selectedCategory = button.dataset.category;
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
