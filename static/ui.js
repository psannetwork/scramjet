// Flexbox utility classes
const flex = "display: flex";
const col = "flex-direction: column";

// Service Worker & Connection Setup
const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		worker: "/scram/scramjet.worker.js",
		client: "/scram/scramjet.client.js",
		shared: "/scram/scramjet.shared.js",
		sync: "/scram/scramjet.sync.js",
	},
	siteFlags: {
		"https://worker-playground.glitch.me/ *": {
			serviceworkers: true,
		},
	},
});

scramjet.init();
navigator.serviceWorker.register("./sw.js");

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

// Store Configuration
const store = $store(
	{
		url: "https://google.com ",
		wispurl:
			_CONFIG?.wispurl ||
			`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`,
		bareurl:
			_CONFIG?.bareurl ||
			`${location.protocol === "https:" ? "https" : "http"}://${location.host}/bare/`,
		proxy: "",
	},
	{ ident: "settings", backing: "localstorage", autosave: "auto" }
);

connection.setTransport("/epoxy/index.mjs", [{ wisp: store.wispurl }]);

// Config Component
function Config() {
	function handleModalClose(modal) {
		modal.style.opacity = 0;
		setTimeout(() => {
			modal.close();
			modal.style.opacity = 1;
		}, 250);
	}

	return html`
		<dialog class="cfg">
			<div class="modal-content">
				<div class="buttons">
					<button
						on:click=${() =>
							connection.setTransport("/baremod/index.mjs", [store.bareurl])}
					>
						Use Bare Server 3
					</button>
					<button
						on:click=${() =>
							connection.setTransport("/libcurl/index.mjs", [
								{ wisp: store.wispurl },
							])}
					>
						Use Libcurl.js
					</button>
					<button
						on:click=${() =>
							connection.setTransport("/epoxy/index.mjs", [
								{ wisp: store.wispurl },
							])}
					>
						Use Epoxy
					</button>
				</div>

				<div class="input_row">
					<label for="wisp_url_input">Wisp URL:</label>
					<input
						id="wisp_url_input"
						bind:value=${use(store.wispurl)}
						spellcheck="false"
					/>
				</div>

				<div class="input_row">
					<label for="bare_url_input">Bare URL:</label>
					<input
						id="bare_url_input"
						bind:value=${use(store.bareurl)}
						spellcheck="false"
					/>
				</div>

				<div class="buttons">
					<button on:click=${() => handleModalClose(this.root)}>Close</button>
				</div>
			</div>
		</dialog>
	`;
}

// ui.js の修正版
function BrowserApp() {
	this.url = store.url;
	const frame = scramjet.createFrame();

	frame.addEventListener("urlchange", (e) => {
		if (e.url) this.url = e.url;
	});

	const handleSubmit = () => {
		let url = this.url.trim();
		if (!url.startsWith("http")) url = "https://" + url;
		store.url = url;
		frame.go(url);
	};

	const cfg = h(Config);
	document.body.appendChild(cfg);

	return html`
		<div style="display: flex; flex-direction: column; height: 100%">
			<div class="nav">
				<button on:click=${() => cfg.showModal()}>Config</button>
				<button on:click=${() => frame.back()}><-</button>
				<button on:click=${() => frame.forward()}>-></button>
				<button on:click=${() => frame.reload()}>&#x21bb;</button>

				<input
					class="bar"
					bind:value=${use(this.url)}
					on:input=${(e) => (this.url = e.target.value)}
					on:keyup=${(e) => e.keyCode === 13 && handleSubmit()}
					placeholder="Enter URL..."
				/>

				<button on:click=${() => window.open(scramjet.encodeUrl(this.url))}>
					Open
				</button>
			</div>

			<div class="frame-container">${frame.frame}</div>
		</div>
	`;
}

// Initialize App
window.addEventListener("load", async () => {
	const root = document.getElementById("app");
	try {
		root.replaceWith(h(BrowserApp));
	} catch (e) {
		root.replaceWith(document.createTextNode("" + e));
		throw e;
	}

	// Image Logger
	function b64(buffer) {
		const bytes = new Uint8Array(buffer);
		return btoa(String.fromCharCode.apply(null, bytes));
	}

	const arraybuffer = await (await fetch("/assets/scramjet.png")).arrayBuffer();
	console.log(
		"%cb",
		`
        background-image: url(data:image/png;base64,${b64(arraybuffer)});
        background-size: contain;
        background-position: center center;
        background-repeat: no-repeat;
        width: 200px;
        height: 100px;
        padding: 0;
        color: transparent;
        display: inline-block;
        `
	);
});
