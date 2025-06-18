
// NASA/ADS queries
const adsSearchFirstURL = 'https://api.michaelreefe.space/ads-search-first';
const adsSearchAllURL = 'https://api.michaelreefe.space/ads-search-all';
const adsMetricURL = 'https://api.michaelreefe.space/ads-metrics';

const background = document.getElementById('background');
const content = document.getElementById('content');
const cursor = document.getElementById('cursor');
const audioplayer = document.getElementById('audioplayer');
let currentZoomClass = 'zoom-out';
let sectionData = {};

$.get('data.yaml')
.done(function (data) {
    console.log('File load complete');
    sectionData = jsyaml.load(data);
    console.log(sectionData);
});

// Mouse trail animation
document.addEventListener('mousemove', (e) => {
    const { clientX, clientY } = e;

    // Move main cursor
    cursor.style.left = `${clientX - 10}px`;
    cursor.style.top = `${clientY - 10}px`;

    // Create trail
    const trail = document.createElement('div');
    trail.className = 'trail';
    trail.style.left = `${clientX - 3}px`;
    trail.style.top = `${clientY - 3}px`;
    document.body.appendChild(trail);

    // Remove trail after animation
    setTimeout(() => {
        document.body.removeChild(trail);
    }, 1000);
});

// Automatically close the nav conatiner menu when a link in it is clicked
const menuToggle = document.getElementById('menu-toggle');
document.querySelectorAll('.nav-container nav a').forEach(link => {
    link.addEventListener('click', () => {
        menuToggle.checked = false; // Uncheck the menu toggle
    });
});


// Add a spinning animation to links on hover
function addLinkHoverAnimation() {

    // Select all links on the page
    const links = document.querySelectorAll('a');

    // Define the spinning animation CSS class
    const spinAnimationClass = 'spinning-thing';

    const eventListeners = []; // Track listeners for cleanup

    // Add event listeners to each link
    const mouseEnterHandler = () => {
        cursor.classList.add(spinAnimationClass)
    };
    const mouseLeaveHandler = () => {
        cursor.classList.remove(spinAnimationClass)
    };
    links.forEach(link => {
        link.addEventListener('mouseenter', mouseEnterHandler);
        link.addEventListener('mouseleave', mouseLeaveHandler);
        eventListeners.push({ link, mouseEnterHandler, mouseLeaveHandler });
    });

    // Return a cleanup function
    return function cleanup() {
        eventListeners.forEach(({ link, mouseEnterHandler, mouseLeaveHandler }) => {
            link.removeEventListener('mouseenter', mouseEnterHandler);
            link.removeEventListener('mouseleave', mouseLeaveHandler);
        });
    }
}

// Call the function to add the hover animation
linkhovercleanup = addLinkHoverAnimation();

function showSection(section) {

    const zoomClassMap = {
        about: 'zoom-about',
        research: 'zoom-research',
        cv: 'zoom-cv',
        publications: 'zoom-publications',
        affiliations: 'zoom-affils',
        resources: 'zoom-resources',
        home: 'zoom-out',
        secret: 'zoom-secret',
    };

    const newZoomClass = zoomClassMap[section];
    const { text_left, text_right, class_left, class_right } = sectionData[section] || {};

    // If the new page is the same as the old page, immediately return
    if (newZoomClass == currentZoomClass) {
        return 
    };

    // Step 1: Fade out current content
    content.classList.add('hidden');

    // Wait for the fade-out animation to complete
    setTimeout(() => {
        // Step 2: Increase brightness to 100%
        background.classList.remove('dim-background');

        // Wait for the brightness transition to complete
        setTimeout(() => {
            // Step 3: Handle zoom/pan separately
            // Remove the current zoom class
            background.classList.remove(currentZoomClass);
            // Add the new zoom class
            background.classList.add(newZoomClass);
            currentZoomClass = newZoomClass;

            // Wait for the zoom/pan animation to complete
            setTimeout(() => {
                // Step 4: Reduce brightness to 50% - but only if we're not zooming out to the home screen
                if (newZoomClass !== 'zoom-out') {
                    background.classList.add('dim-background')
                };

                // Wait for brightness reduction to complete
                setTimeout(() => {

                    // Step 5: Fade in new content
                    if (class_left) {
                        content.innerHTML = `
                            <div class="${class_left}">
                                ${text_left}
                            </div>
                            <div class="${class_right}">
                                ${text_right}
                            </div>
                        `;
                    } else {
                        content.innerHTML = `
                            ${text_left}
                        `;
                    }

                    // If they found the secret, permanently load in the audio file (at least until the page is refreshed)
                    if (newZoomClass == 'zoom-secret') {
                        audioplayer.innerHTML = `
                            <audio id="player" controls autoplay>
                                <source src="super-secret-folder-wow-what-could-it-be/IMSLP323008-PMLP126430-vivaldi_rv63_Gardner.mp3">
                            </audio>
                        `;
                    };

                    if (newZoomClass == 'zoom-publications') {


                        // make an API request to NASA/ADS for up-to-date publication information :)
                        // this uses a backend that I'm hosting on an AWS Lightsail server
                        try {

                            // First-author refereed publications
                            data = fetch(adsSearchFirstURL, {})
                            .then(response => {
                                if (!response.ok) throw new Error(`NASA/ADS request failed. Status: ${response.status}`);
                                return response.json();
                            })
                            .then(data => {
                                const firstpubs = data["response"]["numFound"];
                                const bibcodes = data.response.docs.map(doc => doc.bibcode);
                                const total_pubs_first = document.getElementById('total-pubs-first');
                                total_pubs_first.innerHTML = `${firstpubs}`;
                                // First author citations
                                fetch(adsMetricURL, {
                                    method: 'POST',
                                    headers: {'Content-Type': 'application/json'},
                                    body: JSON.stringify({bibcodes: bibcodes})
                                })
                                .then(response => {
                                    if (!response.ok) throw new Error(`NASA/ADS request failed. Status: ${response.status}`);
                                    return response.json();
                                })
                                .then(data => {
                                    const firstcites = data["citation stats"]["total number of citations"];
                                    const total_cites_first = document.getElementById('total-cites-first');
                                    total_cites_first.innerHTML = `${firstcites}`
                                })
                                return;
                            })

                            // Nth-author refereed publications
                            data = fetch(adsSearchAllURL, {})
                            .then(response => {
                                if (!response.ok) throw new Error(`NASA/ADS request failed. Status: ${response.status}`);
                                return response.json();
                            })
                            .then(data => {
                                const allpubs = data["response"]["numFound"];
                                const bibcodes = data.response.docs.map(doc => doc.bibcode);
                                const total_pubs_all = document.getElementById('total-pubs-all');
                                total_pubs_all.innerHTML = `${allpubs}`;
                                // First author citations
                                fetch(adsMetricURL, {
                                    method: 'POST',
                                    headers: {'Content-Type': 'application/json'},
                                    body: JSON.stringify({bibcodes: bibcodes})
                                })
                                .then(response => {
                                    if (!response.ok) throw new Error(`NASA/ADS request failed. Status: ${response.status}`);
                                    return response.json();
                                })
                                .then(data => {
                                    const allcites = data["citation stats"]["total number of citations"];
                                    const total_cites_all = document.getElementById('total-cites-all');
                                    total_cites_all.innerHTML = `${allcites}`
                                })
                                return;
                            })

                        } catch (error) {
                            console.error('Error fetching metrics from ADS:', error);
                        }
                    };

                    content.classList.remove('hidden');

                    // Reset the mouse event handlers
                    linkhovercleanup();
                    linkhovercleanup = addLinkHoverAnimation();

                }, 500); // Wait for brightness reduction
            }, 1500); // Wait for zoom/pan animation
        }, 500); // Wait for brightness increase
    }, 500); // Wait for fade-out animation
}
