self.addEventListener("install", (event)=>{
    console.log("Service web worker installed");
});

self.addEventListener("activate", (event)=>{
    console.log("Service web worker activated");
});

self.addEventListener("fetch", (event)=>{

});