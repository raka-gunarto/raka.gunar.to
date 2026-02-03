window.dataLayer = window.dataLayer || [];
			function gtag(){dataLayer.push(arguments);}
			gtag('js', new Date());
			gtag('config', 'G-H9QR43SSJG');
// Theme toggle functionality
(function() {
  const STORAGE_KEY = 'theme-preference';
  const THEME_ATTR = 'data-theme';
  
  // Get stored theme preference or system preference
  function getThemePreference() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
    // Return null to use system preference (no data-theme attribute)
    return null;
  }
  
  // Apply theme to document
  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute(THEME_ATTR, theme);
    } else {
      // Remove attribute to use system preference
      document.documentElement.removeAttribute(THEME_ATTR);
    }
    updateToggleIcon(theme);
  }
  
  // Update toggle button icon
  function updateToggleIcon(theme) {
    const toggle = document.getElementById('theme-toggle');
    const icon = toggle?.querySelector('.theme-toggle-icon');
    if (!icon) return;
    
    // Determine effective theme
    let effectiveTheme = theme;
    icon.textContent = effectiveTheme === 'dark' ? '🌙' : '☀️';

    if (!theme) {
      // Check system preference
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      icon.textContent = "🖥️"
    }
  }
  
  // Cycle through themes: system -> light -> dark -> system
  function cycleTheme() {
    const currentTheme = localStorage.getItem(STORAGE_KEY);
    let newTheme;
    
    if (!currentTheme) {
      // Currently using system preference, switch to light
      newTheme = 'light';
    } else if (currentTheme === 'light') {
      // Switch to dark
      newTheme = 'dark';
    } else {
      // Switch back to system preference
      newTheme = null;
      localStorage.removeItem(STORAGE_KEY);
      applyTheme(null);
      return;
    }
    
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }
  
  // Initialize theme on page load (before DOM content loaded to prevent flash)
  const initialTheme = getThemePreference();
  applyTheme(initialTheme);
  
  // Set up toggle button when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', cycleTheme);
    }
    
    // Listen for system theme changes when using system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', function() {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Only update if using system preference
        updateToggleIcon(null);
      }
    });
  });
})();
// Thank you to https://github.com/daviddarnes/heading-anchors
// Thank you to https://amberwilson.co.uk/blog/are-your-anchor-links-accessible/

let globalInstanceIndex = 0;

class HeadingAnchors extends HTMLElement {
	static register(tagName = "heading-anchors", registry = window.customElements) {
		if(registry && !registry.get(tagName)) {
			registry.define(tagName, this);
		}
	}

	static attributes = {
		exclude: "data-ha-exclude",
		prefix: "prefix",
		content: "content",
	}

	static classes = {
		anchor: "ha",
		placeholder: "ha-placeholder",
		srOnly: "ha-visualhide",
	}

	static defaultSelector = "h2,h3,h4,h5,h6";

	static css = `
.${HeadingAnchors.classes.srOnly} {
	clip: rect(0 0 0 0);
	height: 1px;
	overflow: hidden;
	position: absolute;
	width: 1px;
}
.${HeadingAnchors.classes.anchor} {
	position: absolute;
	left: var(--ha_offsetx);
	top: var(--ha_offsety);
	text-decoration: none;
	opacity: 0;
}
.${HeadingAnchors.classes.placeholder} {
	opacity: .3;
}
.${HeadingAnchors.classes.anchor}:is(:focus-within, :hover) {
	opacity: 1;
}
.${HeadingAnchors.classes.anchor},
.${HeadingAnchors.classes.placeholder} {
	display: inline-block;
	padding: 0 .25em;

	/* Disable selection of visually hidden label */
	-webkit-user-select: none;
	user-select: none;
}

@supports (anchor-name: none) {
	.${HeadingAnchors.classes.anchor} {
		position: absolute;
		left: anchor(left);
		top: anchor(top);
	}
}`;

	get supports() {
		return "replaceSync" in CSSStyleSheet.prototype;
	}

	get supportsAnchorPosition() {
		return CSS.supports("anchor-name: none");
	}

	constructor() {
		super();

		if(!this.supports) {
			return;
		}

		let sheet = new CSSStyleSheet();
		sheet.replaceSync(HeadingAnchors.css);
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

		this.headingStyles = {};
		this.instanceIndex = globalInstanceIndex++;
	}

	connectedCallback() {
		if (!this.supports) {
			return;
		}

		this.headings.forEach((heading, index) => {
			if(!heading.hasAttribute(HeadingAnchors.attributes.exclude)) {
				let anchor = this.getAnchorElement(heading);
				let placeholder = this.getPlaceholderElement();

				// Prefers anchor position approach for better accessibility
				// https://amberwilson.co.uk/blog/are-your-anchor-links-accessible/
				if(this.supportsAnchorPosition) {
					let anchorName = `--ha_${this.instanceIndex}_${index}`;
					placeholder.style.setProperty("anchor-name", anchorName);
					anchor.style.positionAnchor = anchorName;
				}

				heading.appendChild(placeholder);
				heading.after(anchor);
			}
		});
	}

	// Polyfill-only
	positionAnchorFromPlaceholder(placeholder) {
		if(!placeholder) {
			return;
		}

		let heading = placeholder.closest("h1,h2,h3,h4,h5,h6");
		if(!heading.nextElementSibling) {
			return;
		}

		// TODO next element could be more defensive
		this.positionAnchor(heading.nextElementSibling);
	}

	// Polyfill-only
	positionAnchor(anchor) {
		if(!anchor || !anchor.previousElementSibling) {
			return;
		}

		// TODO previous element could be more defensive
		let heading = anchor.previousElementSibling;
		this.setFontProp(heading, anchor);

		if(this.supportsAnchorPosition) {
			// quit early
			return;
		}

		let placeholder = heading.querySelector(`.${HeadingAnchors.classes.placeholder}`);
		if(placeholder) {
			anchor.style.setProperty("--ha_offsetx", `${placeholder.offsetLeft}px`);
			anchor.style.setProperty("--ha_offsety", `${placeholder.offsetTop}px`);
		}
	}

	setFontProp(heading, anchor) {
		let placeholder = heading.querySelector(`.${HeadingAnchors.classes.placeholder}`);
		if(placeholder) {
			let style = getComputedStyle(placeholder);
			let props = ["font-weight", "font-size", "line-height", "font-family"];
			let [weight, size, lh, family] = props.map(name => style.getPropertyValue(name));
			anchor.style.setProperty("font", `${weight} ${size}/${lh} ${family}`);
			let vars = style.getPropertyValue("font-variation-settings");
			if(vars) {
				anchor.style.setProperty("font-variation-settings", vars);
			}
		}
	}

	getAccessibleTextPrefix() {
		// Useful for i18n
		return this.getAttribute(HeadingAnchors.attributes.prefix) || "Jump to section titled";
	}

	getContent() {
		if(this.hasAttribute(HeadingAnchors.attributes.content)) {
			return this.getAttribute(HeadingAnchors.attributes.content);
		}
		return "#";
	}

	// Placeholder nests inside of heading
	getPlaceholderElement() {
		let ph = document.createElement("span");
		ph.setAttribute("aria-hidden", true);
		ph.classList.add(HeadingAnchors.classes.placeholder);
		let content = this.getContent();
		if(content) {
			ph.textContent = content;
		}

		ph.addEventListener("mouseover", (e) => {
			let placeholder = e.target.closest(`.${HeadingAnchors.classes.placeholder}`);
			if(placeholder) {
				this.positionAnchorFromPlaceholder(placeholder);
			}
		});

		return ph;
	}

	getAnchorElement(heading) {
		let anchor = document.createElement("a");
		anchor.href = `#${heading.id}`;
		anchor.classList.add(HeadingAnchors.classes.anchor);

		let content = this.getContent();
		anchor.innerHTML = `<span class="${HeadingAnchors.classes.srOnly}">${this.getAccessibleTextPrefix()}: ${heading.textContent}</span>${content ? `<span aria-hidden="true">${content}</span>` : ""}`;

		anchor.addEventListener("focus", e => {
			let anchor = e.target.closest(`.${HeadingAnchors.classes.anchor}`);
			if(anchor) {
				this.positionAnchor(anchor);
			}
		});

		anchor.addEventListener("mouseover", (e) => {
			// when CSS anchor positioning is supported, this is only used to set the font
			let anchor = e.target.closest(`.${HeadingAnchors.classes.anchor}`);
			this.positionAnchor(anchor);
		});

		return anchor;
	}

	get headings() {
		return this.querySelectorAll(this.selector.split(",").map(entry => `${entry.trim()}[id]`));
	}

	get selector() {
		return this.getAttribute("selector") || HeadingAnchors.defaultSelector;
	}
}

HeadingAnchors.register();

export { HeadingAnchors }
/*! medium-zoom 1.1.0 | MIT License | https://github.com/francoischalifour/medium-zoom */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e=e||self).mediumZoom=t()}(this,(function(){"use strict";var e=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var o=arguments[t];for(var n in o)Object.prototype.hasOwnProperty.call(o,n)&&(e[n]=o[n])}return e},t=function(e){return"IMG"===e.tagName},o=function(e){return e&&1===e.nodeType},n=function(e){return".svg"===(e.currentSrc||e.src).substr(-4).toLowerCase()},i=function(e){try{return Array.isArray(e)?e.filter(t):function(e){return NodeList.prototype.isPrototypeOf(e)}(e)?[].slice.call(e).filter(t):o(e)?[e].filter(t):"string"==typeof e?[].slice.call(document.querySelectorAll(e)).filter(t):[]}catch(e){throw new TypeError("The provided selector is invalid.\nExpects a CSS selector, a Node element, a NodeList or an array.\nSee: https://github.com/francoischalifour/medium-zoom")}},r=function(e){var t=document.createElement("div");return t.classList.add("medium-zoom-overlay"),t.style.background=e,t},d=function(e){var t=e.getBoundingClientRect(),o=t.top,n=t.left,i=t.width,r=t.height,d=e.cloneNode(),a=window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0,m=window.pageXOffset||document.documentElement.scrollLeft||document.body.scrollLeft||0;return d.removeAttribute("id"),d.style.position="absolute",d.style.top=o+a+"px",d.style.left=n+m+"px",d.style.width=i+"px",d.style.height=r+"px",d.style.transform="",d},a=function(t,o){var n=e({bubbles:!1,cancelable:!1,detail:void 0},o);if("function"==typeof window.CustomEvent)return new CustomEvent(t,n);var i=document.createEvent("CustomEvent");return i.initCustomEvent(t,n.bubbles,n.cancelable,n.detail),i};return function(e,t){void 0===t&&(t={});var o=t.insertAt;if(e&&"undefined"!=typeof document){var n=document.head||document.getElementsByTagName("head")[0],i=document.createElement("style");i.type="text/css","top"===o&&n.firstChild?n.insertBefore(i,n.firstChild):n.appendChild(i),i.styleSheet?i.styleSheet.cssText=e:i.appendChild(document.createTextNode(e))}}(".medium-zoom-overlay{position:fixed;top:0;right:0;bottom:0;left:0;opacity:0;transition:opacity .3s;will-change:opacity}.medium-zoom--opened .medium-zoom-overlay{cursor:pointer;cursor:zoom-out;opacity:1}.medium-zoom-image{cursor:pointer;cursor:zoom-in;transition:transform .3s cubic-bezier(.2,0,.2,1)!important}.medium-zoom-image--hidden{visibility:hidden}.medium-zoom-image--opened{position:relative;cursor:pointer;cursor:zoom-out;will-change:transform}"),function t(m){var l=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},c=window.Promise||function(e){function t(){}e(t,t)},u=function(e){var t=e.target;t!==N?-1!==x.indexOf(t)&&w({target:t}):E()},s=function(){if(!A&&k.original){var e=window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0;Math.abs(S-e)>T.scrollOffset&&setTimeout(E,150)}},f=function(e){var t=e.key||e.keyCode;"Escape"!==t&&"Esc"!==t&&27!==t||E()},p=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},n=t;if(t.background&&(N.style.background=t.background),t.container&&t.container instanceof Object&&(n.container=e({},T.container,t.container)),t.template){var i=o(t.template)?t.template:document.querySelector(t.template);n.template=i}return T=e({},T,n),x.forEach((function(e){e.dispatchEvent(a("medium-zoom:update",{detail:{zoom:j}}))})),j},g=function(){var o=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};return t(e({},T,o))},v=function(){for(var e=arguments.length,t=Array(e),o=0;o<e;o++)t[o]=arguments[o];var n=t.reduce((function(e,t){return[].concat(e,i(t))}),[]);return n.filter((function(e){return-1===x.indexOf(e)})).forEach((function(e){x.push(e),e.classList.add("medium-zoom-image")})),O.forEach((function(e){var t=e.type,o=e.listener,i=e.options;n.forEach((function(e){e.addEventListener(t,o,i)}))})),j},h=function(){for(var e=arguments.length,t=Array(e),o=0;o<e;o++)t[o]=arguments[o];k.zoomed&&E();var n=t.length>0?t.reduce((function(e,t){return[].concat(e,i(t))}),[]):x;return n.forEach((function(e){e.classList.remove("medium-zoom-image"),e.dispatchEvent(a("medium-zoom:detach",{detail:{zoom:j}}))})),x=x.filter((function(e){return-1===n.indexOf(e)})),j},z=function(e,t){var o=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};return x.forEach((function(n){n.addEventListener("medium-zoom:"+e,t,o)})),O.push({type:"medium-zoom:"+e,listener:t,options:o}),j},y=function(e,t){var o=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};return x.forEach((function(n){n.removeEventListener("medium-zoom:"+e,t,o)})),O=O.filter((function(o){return!(o.type==="medium-zoom:"+e&&o.listener.toString()===t.toString())})),j},b=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},i=t.target,r=function(){var t={width:document.documentElement.clientWidth,height:document.documentElement.clientHeight,left:0,top:0,right:0,bottom:0},i=void 0,r=void 0;if(T.container)if(T.container instanceof Object)i=(t=e({},t,T.container)).width-t.left-t.right-2*T.margin,r=t.height-t.top-t.bottom-2*T.margin;else{var d=(o(T.container)?T.container:document.querySelector(T.container)).getBoundingClientRect(),a=d.width,m=d.height,l=d.left,c=d.top;t=e({},t,{width:a,height:m,left:l,top:c})}i=i||t.width-2*T.margin,r=r||t.height-2*T.margin;var u=k.zoomedHd||k.original,s=n(u)?i:u.naturalWidth||i,f=n(u)?r:u.naturalHeight||r,p=u.getBoundingClientRect(),g=p.top,v=p.left,h=p.width,z=p.height,y=Math.min(Math.max(h,s),i)/h,b=Math.min(Math.max(z,f),r)/z,E=Math.min(y,b),w="scale("+E+") translate3d("+((i-h)/2-v+T.margin+t.left)/E+"px, "+((r-z)/2-g+T.margin+t.top)/E+"px, 0)";k.zoomed.style.transform=w,k.zoomedHd&&(k.zoomedHd.style.transform=w)};return new c((function(e){if(i&&-1===x.indexOf(i))e(j);else{if(k.zoomed)e(j);else{if(i)k.original=i;else{if(!(x.length>0))return void e(j);var t=x;k.original=t[0]}if(k.original.dispatchEvent(a("medium-zoom:open",{detail:{zoom:j}})),S=window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0,A=!0,k.zoomed=d(k.original),document.body.appendChild(N),T.template){var n=o(T.template)?T.template:document.querySelector(T.template);k.template=document.createElement("div"),k.template.appendChild(n.content.cloneNode(!0)),document.body.appendChild(k.template)}if(k.original.parentElement&&"PICTURE"===k.original.parentElement.tagName&&k.original.currentSrc&&(k.zoomed.src=k.original.currentSrc),document.body.appendChild(k.zoomed),window.requestAnimationFrame((function(){document.body.classList.add("medium-zoom--opened")})),k.original.classList.add("medium-zoom-image--hidden"),k.zoomed.classList.add("medium-zoom-image--opened"),k.zoomed.addEventListener("click",E),k.zoomed.addEventListener("transitionend",(function t(){A=!1,k.zoomed.removeEventListener("transitionend",t),k.original.dispatchEvent(a("medium-zoom:opened",{detail:{zoom:j}})),e(j)})),k.original.getAttribute("data-zoom-src")){k.zoomedHd=k.zoomed.cloneNode(),k.zoomedHd.removeAttribute("srcset"),k.zoomedHd.removeAttribute("sizes"),k.zoomedHd.removeAttribute("loading"),k.zoomedHd.src=k.zoomed.getAttribute("data-zoom-src"),k.zoomedHd.onerror=function(){clearInterval(m),console.warn("Unable to reach the zoom image target "+k.zoomedHd.src),k.zoomedHd=null,r()};var m=setInterval((function(){k.zoomedHd.complete&&(clearInterval(m),k.zoomedHd.classList.add("medium-zoom-image--opened"),k.zoomedHd.addEventListener("click",E),document.body.appendChild(k.zoomedHd),r())}),10)}else if(k.original.hasAttribute("srcset")){k.zoomedHd=k.zoomed.cloneNode(),k.zoomedHd.removeAttribute("sizes"),k.zoomedHd.removeAttribute("loading");var l=k.zoomedHd.addEventListener("load",(function(){k.zoomedHd.removeEventListener("load",l),k.zoomedHd.classList.add("medium-zoom-image--opened"),k.zoomedHd.addEventListener("click",E),document.body.appendChild(k.zoomedHd),r()}))}else r()}}}))},E=function(){return new c((function(e){if(!A&&k.original){A=!0,document.body.classList.remove("medium-zoom--opened"),k.zoomed.style.transform="",k.zoomedHd&&(k.zoomedHd.style.transform=""),k.template&&(k.template.style.transition="opacity 150ms",k.template.style.opacity=0),k.original.dispatchEvent(a("medium-zoom:close",{detail:{zoom:j}})),k.zoomed.addEventListener("transitionend",(function t(){k.original.classList.remove("medium-zoom-image--hidden"),document.body.removeChild(k.zoomed),k.zoomedHd&&document.body.removeChild(k.zoomedHd),document.body.removeChild(N),k.zoomed.classList.remove("medium-zoom-image--opened"),k.template&&document.body.removeChild(k.template),A=!1,k.zoomed.removeEventListener("transitionend",t),k.original.dispatchEvent(a("medium-zoom:closed",{detail:{zoom:j}})),k.original=null,k.zoomed=null,k.zoomedHd=null,k.template=null,e(j)}))}else e(j)}))},w=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=e.target;return k.original?E():b({target:t})},L=function(){return T},H=function(){return x},C=function(){return k.original},x=[],O=[],A=!1,S=0,T=l,k={original:null,zoomed:null,zoomedHd:null,template:null};"[object Object]"===Object.prototype.toString.call(m)?T=m:(m||"string"==typeof m)&&v(m),T=e({margin:0,background:"#fff",scrollOffset:40,container:null,template:null},T);var N=r(T.background);document.addEventListener("click",u),document.addEventListener("keyup",f),document.addEventListener("scroll",s),window.addEventListener("resize",E);var j={open:b,close:E,toggle:w,update:p,clone:g,attach:v,detach:h,on:z,off:y,getOptions:L,getImages:H,getZoomedImage:C};return j}}));
mediumZoom('img', {
				background: 'rgba(0, 0, 0, 0.8)',
			})