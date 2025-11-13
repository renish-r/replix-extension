console.log("Replix Extension Loaded ✅");

// 🌍 Base URL Configuration
// Use the deployed Render backend by default
// Switch to localhost for local development if needed
const BASE_URL = "https://replix-server.onrender.com";
// const BASE_URL = "http://localhost:8080"; // uncomment for local testing

// 🔹 Create a Gmail-styled button
function createButton(label, className) {
  const button = document.createElement("div");
  button.className = className;
  button.textContent = label;
  button.setAttribute("role", "button");
  return button;
}

// 🔹 Extract email content
function getEmailContent() {
  const selectors = [".h7", ".a3s.aiL", ".gmail_quote", "[role='presentation']"];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el.innerText.trim();
  }
  return "";
}

// 🔹 Locate Gmail's compose toolbar
function findComposeToolbar() {
  const selectors = [".btC", ".aDh", "[role='toolbar']", ".gU.Up"];
  for (const selector of selectors) {
    const toolbar = document.querySelector(selector);
    if (toolbar) return toolbar;
  }
  return null;
}

// 🔹 Generate AI Reply
async function generateReply(emailContent, tone, maiButton, editButton) {
  try {
    maiButton.textContent = "Generating...";
    maiButton.disabled = true;

    const res = await fetch(`${BASE_URL}/api/email/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailContent,
        tone: tone === "none" ? "" : tone,
      }),
    });

    if (!res.ok) throw new Error("API Request Failed");
    let generatedReply = await res.text();
    generatedReply = generatedReply.replace(/\n/g, "<br>");

    const composeBox = document.querySelector("[role='textbox'][g_editable='true']");
    if (composeBox) {
      composeBox.focus();
      composeBox.innerHTML = generatedReply;
    }

    // Show Edit button
    if (editButton) {
      editButton.style.display = "inline-flex";

      if (!document.getElementById("editContainer")) {
        const editContainer = document.createElement("div");
        editContainer.id = "editContainer";
        editContainer.style.display = "none";

        const editBox = document.createElement("textarea");
        editBox.id = "editBox";
        editBox.placeholder = "Make edits here...";

        const applyBtn = document.createElement("button");
        applyBtn.id = "applyButton";
        applyBtn.textContent = "Apply";

        editContainer.appendChild(editBox);
        editContainer.appendChild(applyBtn);

        const toolbarParent = editButton.closest(".btC, .aDh, [role='toolbar']");
        (toolbarParent || editButton.parentNode).insertAdjacentElement("afterend", editContainer);

        setupEditFeature();
      }
    }
  } catch (err) {
    console.error(err);
    alert("Failed to generate reply");
  } finally {
    maiButton.textContent = "May I";
    maiButton.disabled = false;
  }
}

// 🔹 Edit Feature
function setupEditFeature() {
  const editButton = document.getElementById("editButton");
  const editContainer = document.getElementById("editContainer");
  const editBox = document.getElementById("editBox");
  const applyButton = document.getElementById("applyButton");

  editButton.addEventListener("click", () => {
    const isHidden = editContainer.style.display === "none";
    editContainer.style.display = isHidden ? "block" : "none";

    if (isHidden) {
      editBox.style.display = "block";
      applyButton.style.display = "inline-block";
      editBox.focus();

      setTimeout(() => {
        editContainer.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    } else {
      editBox.style.display = "none";
      applyButton.style.display = "none";
    }
  });

  applyButton.addEventListener("click", async () => {
    const editPrompt = editBox.value.trim();
    if (!editPrompt) return;

    const generatedMailEl = document.querySelector("[role='textbox'][g_editable='true']");
    const originalMail = generatedMailEl ? generatedMailEl.innerText : "";

    try {
      const res = await fetch(`${BASE_URL}/api/email/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalMail, editPrompt }),
      });

      let updatedMail = await res.text();

      if (updatedMail && generatedMailEl) {
        updatedMail = updatedMail.replace(/\n/g, "<br>");
        generatedMailEl.innerHTML = updatedMail;
      } else {
        console.error("No updated mail received");
      }
    } catch (err) {
      console.error("Error applying edit:", err);
    }
  });
}

// 🔹 Inject Custom Buttons
function injectButtons() {
  document.querySelectorAll(".ai-reply-button, .edit-button").forEach((btn) => btn.remove());

  const toolbar = findComposeToolbar();
  if (!toolbar) {
    console.log("Compose toolbar not found");
    return;
  }

  const maiButton = createButton("May I", "T-I J-J5-Ji aoO v7 T-I-atl L3 ai-reply-button");
  const editButton = createButton("Edit", "T-I J-J5-Ji aoO v7 T-I-atl L3 edit-button");
  editButton.id = "editButton";
  editButton.style.display = "none";

  maiButton.addEventListener("click", () => {
    const oldSelector = document.querySelector(".tone-selector");
    if (oldSelector) oldSelector.remove();

    const toneSelector = document.createElement("div");
    toneSelector.className = "tone-selector";
    const tones = ["None", "Professional", "Casual", "Friendly"];

    tones.forEach((tone) => {
      const option = document.createElement("button");
      option.className = "tone-option";
      option.textContent = tone;
      option.addEventListener("click", async () => {
        toneSelector.remove();
        const emailContent = getEmailContent();
        await generateReply(emailContent, tone.toLowerCase(), maiButton, editButton);
      });
      toneSelector.appendChild(option);
    });

    maiButton.parentNode.insertBefore(toneSelector, maiButton.nextSibling);

    const closeOnClickOutside = (e) => {
      if (!toneSelector.contains(e.target) && e.target !== maiButton) {
        toneSelector.remove();
        document.removeEventListener("click", closeOnClickOutside);
      }
    };
    document.addEventListener("click", closeOnClickOutside);
  });

  toolbar.insertBefore(maiButton, toolbar.firstChild);
  toolbar.insertBefore(editButton, maiButton.nextSibling);
}

// 🔹 Watch for new compose windows
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    const added = Array.from(mutation.addedNodes);
    const hasCompose = added.some(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches(".aDh, .btC, [role='dialog']") ||
          node.querySelector?.(".aDh, .btC, [role='dialog']"))
    );
    if (hasCompose) {
      console.log("Compose Window Detected 📨");
      setTimeout(injectButtons, 500);
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });
