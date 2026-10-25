const addPinButton = document.querySelector(".add-pin");
const pinList = document.querySelector("#pin-list");
const savedPins = localStorage.getItem("pins");
const pins = savedPins === null ? [] : JSON.parse(savedPins);

function savePins() {
    localStorage.setItem("pins", JSON.stringify(pins));
}

function renderPin(pin) {
    let isOpening = false;
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

    function handleTabActivated(activeInfo) {
        updateHighlight(activeInfo.tabId);
    }

    browser.tabs.onActivated.addListener(handleTabActivated);

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

pins.forEach(renderPin);

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
