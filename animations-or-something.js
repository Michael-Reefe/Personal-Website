
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

// DEPRECATED

// // Toggles the visibility of the navigation bar's arrows
// const scrollableElement = document.getElementById('nav-container-nav')
// const scrollArrowContainerRight = document.getElementById('scrollarrow-container-right')
// const scrollArrowContainerLeft = document.getElementById('scrollarrow-container-left')
// const isFull = scrollableElement.scrollWidth === scrollableElement.clientWidth;
// // Start without any arrows
// if (isFull) {
//     scrollArrowContainerRight.innerHTML = ``;
//     scrollArrowContainerRight.classList.add('noback');
// };

// scrollableElement.addEventListener("scroll", () => {
//     const isAtRight = scrollableElement.scrollWidth - scrollableElement.scrollLeft === scrollableElement.clientWidth;
//     const isAtLeft = scrollableElement.scrollLeft === 0;

//     // Dynamically update the visibility of both arrows
//     if (isAtRight) {
//         scrollArrowContainerRight.innerHTML = ``;
//         scrollArrowContainerRight.classList.add('noback');
//     } else {
//         scrollArrowContainerRight.innerHTML = `&#8250`;
//         scrollArrowContainerRight.classList.remove('noback');
//     };
//     if (isAtLeft) {
//         scrollArrowContainerLeft.innerHTML = ``;
//         scrollArrowContainerLeft.classList.add('noback');
//     } else {
//         scrollArrowContainerLeft.innerHTML = `&#8249`;
//         scrollArrowContainerLeft.classList.remove('noback');
//     };
// });


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
        groups: 'zoom-groups',
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

                    content.classList.remove('hidden');

                    // Reset the mouse event handlers
                    linkhovercleanup();
                    linkhovercleanup = addLinkHoverAnimation();

                }, 500); // Wait for brightness reduction
            }, 1500); // Wait for zoom/pan animation
        }, 500); // Wait for brightness increase
    }, 500); // Wait for fade-out animation
}
