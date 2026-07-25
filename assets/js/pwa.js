if ("serviceWorker" in navigator) {
    window.addEventListener("load", async()=>{
        try {
            const registration = await navigator.serviceWorker.register("service-worker.js");
            console.log("Service worker registered", registration.scope);
        } catch (error) {
            console.log("Service worker registration failed", error);
        }
    });
}