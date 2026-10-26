const addPinButton = document.querySelector(".add-pin");
const pinList = document.querySelector("#pin-list");

function isWebUrl(value) {
    try {
        const url = new URL(value);

        return (
            url.protocol === "https:" ||
            url.protocol === "http:"
        );
    } catch {
        return false;
    }
}

function isValidPin(pin) {
    return (
        pin !== null &&
        typeof pin === "object" &&
        typeof pin.name === "string" &&
        typeof pin.url === "string" &&
        pin.name.trim() !== "" &&
        pin.url.trim() !== "" &&
        isWebUrl(pin.url)
    );
}

function loadPins() {
    const savedText = localStorage.getItem("pins");

    if (savedText === null) {
        return [];
    }

    try {
        const parsedPins = JSON.parse(savedText);

        if (!Array.isArray(parsedPins)) {
            throw new Error("Saved pins must be an array.");
        }
        if (!parsedPins.every(isValidPin)) {
            throw new Error("Saved data contains an invalid pin.");
        }
        return parsedPins;
    } catch (error) {
        console.error("Could not load saved pins:", error);
        alert("Could not load your pins. Your saved data has been preserved.");

        throw error;
    }
}
const pins = loadPins();
let sidebarWindowId = null;

async function initializeSidebar() {
    try {
        const currentWindow = await browser.windows.getCurrent();
        sidebarWindowId = currentWindow.id;

        pins.forEach(renderPin);
    } catch (error) {
        console.error("Failed to initialize sidebar:", error);
    }
}

function savePins() {
    localStorage.setItem("pins", JSON.stringify(pins));
}

function renderPin(pin) {
    let isOpening = false;
    let connectionVersion = 0;
    let openedTabId = null;
    const pinLink = document.createElement("a");
    pinLink.textContent = pin.name;
    pinLink.title = pin.name;
    pinLink.href = pin.url;
    pinLink.className = "pin";

    pinLink.addEventListener("click", async (event) => {
        event.preventDefault();

        if (isOpening) {
            return;
        }

        isOpening = true;
        connectionVersion += 1;

        try {
            const tabs = await browser.tabs.query({
                currentWindow: true
            });

            let existingTab = tabs.find((tab) => {
                return tab.id === openedTabId;
            });

            if (existingTab === undefined) {
                existingTab = tabs.find((tab) => {
                    return tab.url === pin.url;
                });
            }

            if (existingTab !== undefined) {
                openedTabId = existingTab.id;

                await browser.tabs.update(existingTab.id, {
                    active: true
                });
                updateHighlight(existingTab.id);
            } else {
                const createdTab = await browser.tabs.create({
                    url: pin.url
                });

                openedTabId = createdTab.id;
                updateHighlight(createdTab.id);
            }
        } catch (error) {
            console.error("Failed to open pin:", error);
            alert("Could not open this pin. Please try again.");
        } finally {
            isOpening = false;
        }
    });

    function updateHighlight(activeTabId) {
        pinLink.classList.toggle(
            "active",
            activeTabId === openedTabId
        );
    }

    async function restoreTabConnection() {
        const versionAtStart = connectionVersion;
        try {
            const tabs = await browser.tabs.query({
                currentWindow: true
            });

            if (versionAtStart !== connectionVersion) {
                return;
            }

            const matchingTab = tabs.find((tab) => {
                return tab.url === pin.url;
            });

            if (matchingTab !== undefined) {
                openedTabId = matchingTab.id;
                updateHighlight(matchingTab.active ? matchingTab.id : null);
            }
        } catch (error) {
            console.error("Failed to restore pin connection:", error);
        }
    }
    restoreTabConnection();

    function handleTabActivated(activeInfo) {
    if (activeInfo.windowId !== sidebarWindowId) {
        return;
    }

    connectionVersion += 1;
    updateHighlight(activeInfo.tabId);
    }

    browser.tabs.onActivated.addListener(handleTabActivated);

    function handleTabRemoved(tabId) {
        if (tabId !== openedTabId) {
            return;
        }

        openedTabId = null;
        pinLink.classList.remove("active");
    }

    browser.tabs.onRemoved.addListener(handleTabRemoved);

    const pinItem = document.createElement("li");
    pinItem.className = "pin-row";
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.type = "button";
    removeButton.className = "pin-action remove-pin";

    removeButton.addEventListener("click", () => {
        const index = pins.findIndex((savedPin) => {
            return savedPin.id === pin.id;
        });

        if (index === -1) {
            return;
        }

        pins.splice(index, 1);
        savePins();

        browser.tabs.onActivated.removeListener(handleTabActivated);
        browser.tabs.onRemoved.removeListener(handleTabRemoved);

        pinItem.remove();
    });
    const renameButton = document.createElement("button");
    renameButton.textContent = "Rename";
    renameButton.type = "button";
    renameButton.className = "pin-action";

    renameButton.addEventListener("click", () => {
        const newName = prompt("Enter a new pin name:", pin.name);

        if (newName === null) {
            return;
        }

        const trimmedName = newName.trim();

        if (trimmedName === "") {
            alert("Please enter a pin name.");
            return;
        }

        pin.name = trimmedName;
        pinLink.textContent = pin.name;
        pinLink.title = pin.name;
        savePins();
    });
    pinItem.append(pinLink, removeButton, renameButton);
    pinList.append(pinItem);
}

pins.forEach((pin) => {
    if (pin.id === undefined) {
        pin.id = crypto.randomUUID();
    }
});

savePins();

initializeSidebar();

addPinButton.addEventListener("click", () => {
    const pinName = prompt("Enter a name for your pin:");

    if (pinName === null) {
        return;
    }

    const trimmedName = pinName.trim();

    if (trimmedName === "") {
        alert("Please enter a pin name.");
        return;
    }

    const pinUrl = prompt("Enter the website URL:");

    if (pinUrl === null) {
        return;
    }

    const trimmedUrl = pinUrl.trim();

    if (trimmedUrl === "") {
        alert("Please enter a URL.");
        return;
    }

    const hasWebPrefix =
        trimmedUrl.startsWith("https://") ||
        trimmedUrl.startsWith("http://");

    let finalUrl = trimmedUrl;

    if (!hasWebPrefix) {
        finalUrl = "https://" + trimmedUrl;
    }

    try {
        if (!isWebUrl(finalUrl)) {
            alert("Please enter a valid HTTP or HTTPS URL.");
            return;
        }

        const parsedUrl = new URL(finalUrl);
        finalUrl = parsedUrl.href;
    } catch {
        alert("Please enter a valid website URL.");
        return;
    }

    const pin = {
        id: crypto.randomUUID(),
        name: trimmedName,
        url: finalUrl
    };

    pins.push(pin);
    savePins();
    renderPin(pin);
});
