// animation / helper script
// Position overlay regions so they stay locked to the same parts of the
// source image when the image is displayed with `object-fit: cover`.
(function(){
	function initBgOverlayMapping(){
		const wrapper = document.querySelector('.bg-wrapper');
		if(!wrapper) return;
		const img = wrapper.querySelector('.bg-img');
		const links = wrapper.querySelectorAll('.bg-link');

		function updatePositions(){
			const containerW = wrapper.clientWidth, containerH = wrapper.clientHeight;
			let naturalW = img.naturalWidth, naturalH = img.naturalHeight;
			let useImageMapping = !!(naturalW && naturalH);
			let dispW, dispH, offsetX, offsetY;
			if(useImageMapping){
				// use `contain` so the full image is visible; letterbox (black bars)
				const scale = Math.min(containerW / naturalW, containerH / naturalH); // contain
				dispW = naturalW * scale; dispH = naturalH * scale;
				// when contained, the image is smaller than the container and is centered
				offsetX = (containerW - dispW) / 2;
				offsetY = (containerH - dispH) / 2;
				// expose displayed image rectangle to CSS via variables
				wrapper.style.setProperty('--img-left', offsetX + 'px');
				wrapper.style.setProperty('--img-top', offsetY + 'px');
				wrapper.style.setProperty('--img-w', dispW + 'px');
				wrapper.style.setProperty('--img-h', dispH + 'px');
				// reveal frame/scanline after positioning is calculated
				wrapper.style.setProperty('--img-frame-opacity', '1');
				wrapper.style.setProperty('--img-scan-opacity', '0.95');

			} else {
				// fallback: image fills wrapper
				offsetX = 0; offsetY = 0;
				wrapper.style.setProperty('--img-left', '0px');
				wrapper.style.setProperty('--img-top', '0px');
				wrapper.style.setProperty('--img-w', containerW + 'px');
				wrapper.style.setProperty('--img-h', containerH + 'px');
				// reveal frame/scanline for fallback mapping
				wrapper.style.setProperty('--img-frame-opacity', '1');
				wrapper.style.setProperty('--img-scan-opacity', '0.95');
				// fallback: treat the displayed image as occupying the full wrapper
				dispW = containerW; dispH = containerH; offsetX = 0; offsetY = 0;
			}

			links.forEach(link => {
				const x = parseFloat(link.dataset.x) || 0;
				const y = parseFloat(link.dataset.y) || 0;
				const w = parseFloat(link.dataset.w) || 0.18;
				const h = parseFloat(link.dataset.h) || 0.22;

				const displayedX = x * dispW; // image-relative coords -> displayed image coords
				const displayedY = y * dispH;
				const displayedW = w * dispW;
				const displayedH = h * dispH;

				// displayedX/Y are coords inside the displayed image; convert to container coords
				let left = (offsetX + displayedX) / containerW * 100;
				let top = (offsetY + displayedY) / containerH * 100;
				let widthPct = displayedW / containerW * 100;
				let heightPct = displayedH / containerH * 100;

				// fallback / sanitize in case of bad math or zero container size
				if(!isFinite(left)) left = x * 100;
				if(!isFinite(top)) top = y * 100;
				if(!isFinite(widthPct)) widthPct = w * 100;
				if(!isFinite(heightPct)) heightPct = h * 100;

				// clamp values to reasonable ranges so elements stay visible
				left = Math.max(-100, Math.min(200, left));
				top = Math.max(-100, Math.min(200, top));
				widthPct = Math.max(0.5, Math.min(200, widthPct));
				heightPct = Math.max(0.5, Math.min(200, heightPct));

				link.style.left = left + '%';
				link.style.top = top + '%';
				link.style.width = widthPct + '%';
				link.style.height = heightPct + '%';

				// prepare hover preview data for this link
				const srcImg = link.dataset.img ? link.dataset.img : (img && img.src ? img.src : null);
				link._hp = {
					image: srcImg ? ('url("' + srcImg + '")') : null,
					size: dispW + 'px ' + dispH + 'px',
					pos: offsetX + 'px ' + offsetY + 'px'
				};
			});

			// create hover-preview if not present
			let hoverPreview = wrapper.querySelector('.hover-preview');
			if(!hoverPreview){
				hoverPreview = document.createElement('div');
				hoverPreview.className = 'hover-preview';
				wrapper.appendChild(hoverPreview);
			}

			// position any anchored elements (e.g. .site-title with data-x/data-y)
			const anchored = wrapper.querySelectorAll('.anchored');
			anchored.forEach(el => {
				const ax = parseFloat(el.dataset.x);
				const ay = parseFloat(el.dataset.y);
				const x = isFinite(ax) ? ax : 0.5;
				const y = isFinite(ay) ? ay : 0.05;
				const displayedX = x * dispW;
				const displayedY = y * dispH;
				let left = (offsetX + displayedX) / containerW * 100;
				let top = (offsetY + displayedY) / containerH * 100;
				if(!isFinite(left)) left = x * 100;
				if(!isFinite(top)) top = y * 100;
				left = Math.max(-200, Math.min(300, left));
				top = Math.max(-200, Math.min(300, top));
				el.style.left = left + '%';
				el.style.top = top + '%';
				el.style.transform = 'translate(-50%, -50%)';
			});

			// attach hover handlers to show the full-image preview
			links.forEach(link => {
				if(link._hp_listenersAdded) return;
				function enter(){
					if(link._hp && link._hp.image) hoverPreview.style.setProperty('--hp-bg-image', link._hp.image);
					if(link._hp && link._hp.size) hoverPreview.style.setProperty('--hp-bg-size', link._hp.size);
					if(link._hp && link._hp.pos) hoverPreview.style.setProperty('--hp-bg-pos', link._hp.pos);
					// dim / desaturate the original background while hovering
					wrapper.classList.add('link-hovered');
					// mark which section is hovered so other labels can be grayscaled
					const sectionClass = Array.from(link.classList).find(c => c.indexOf('link-') === 0);
					if(sectionClass){
						wrapper.setAttribute('data-hover', sectionClass.replace('link-',''));
					}
					hoverPreview.classList.add('visible');
				}
				function leave(){
					hoverPreview.classList.remove('visible');
					wrapper.classList.remove('link-hovered');
					wrapper.removeAttribute('data-hover');
				}
				link.addEventListener('mouseenter', enter);
				link.addEventListener('focus', enter);
				link.addEventListener('mouseleave', leave);
				link.addEventListener('blur', leave);
				// secret link click: toggle audioplayer
				if(link.classList.contains('link-secret')){
					link.addEventListener('click', function(ev){
						ev.preventDefault();
						// create or toggle audioplayer
						let player = document.getElementById('audioplayer');
						if(player){
							const nowVisible = player.classList.toggle('visible');
							const aud = player.querySelector('audio');
							if(nowVisible){ aud.play().catch(()=>{}); } else { aud.pause(); }
							return;
						}
						player = document.createElement('div');
						player.id = 'audioplayer';
						player.className = 'audioplayer visible';
						// audio element
						const audio = document.createElement('audio');
						audio.controls = true;
						audio.preload = 'auto';
						if(link.dataset.audio && link.dataset.audio.trim()) audio.src = link.dataset.audio;
						audio.autoplay = true;
						// close button
						const close = document.createElement('button');
						close.className = 'close';
						close.textContent = '✕';
						close.addEventListener('click', function(){ player.remove(); });
						player.appendChild(audio);
						player.appendChild(close);
						document.body.appendChild(player);
						// attempt to play (user click should allow autoplay)
						audio.play().catch(()=>{});
					});
				}
				link._hp_listenersAdded = true;
			});
		}

		window.addEventListener('resize', updatePositions);
		if(img.complete && img.naturalWidth){
			updatePositions();
		} else {
			img.addEventListener('load', updatePositions);
		}
		const ro = new ResizeObserver(updatePositions);
		ro.observe(wrapper);
	}

	if(document.readyState === 'loading'){
		document.addEventListener('DOMContentLoaded', initBgOverlayMapping);
	} else {
		initBgOverlayMapping();
	}
})();

