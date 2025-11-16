const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-inpute");
const fileInput = promptForm.querySelector("#file-input");
const fileuploadwrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");

const API_URL = "https://proud-unit-1c6d.at135887.workers.dev/";


let typingInterval, controller;
const userData = { message: "", file: {} };
const chartHistory = [];

// Function to create message element
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

// Smooth scroll to the bottom of the chat container
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Typing effect for the bot response
const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const chars = text.split("");
    let charIndex = 0;

    typingInterval = setInterval(() => {
        if (charIndex < chars.length) {
            textElement.textContent += chars[charIndex++];
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
            scrollToBottom();
        }
    }, 40);
}

// Generate bot's response and handle retries if needed
const generateResponse = async (botMsgDiv, retries = 3) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();

    const lowerMsg = userData.message.toLowerCase();

    // Array of phrases that mean user is asking the bot's name
    const nameQueries = [
        "your name",
        "who are you",
        "what's your name",
        "whats your name",
        "tell me your name",
        "your name?"
    ];

    // If user is asking bot's name
    if (nameQueries.some(phrase => lowerMsg.includes(phrase))) {
        textElement.textContent = "NOORIX";
        chartHistory.push({
            role: "user",
            parts: [{ text: userData.message }]
        });
        chartHistory.push({
            role: "model",
            parts: [{ text: "NOORIX" }]
        });
        return; // Skip API call
    }

    chartHistory.push({
        role: "user",
        parts: [
            { text: userData.message },
            ...(userData.file.data
                ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }]
                : [])
        ]
    });

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chartHistory }),
            signal: controller.signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        const responseText = data.candidates[0].content.parts[0].text
            .replace(/\*\*([^\*]+)\*\*/g, "$1")
            .trim();

        typingEffect(responseText, textElement, botMsgDiv);

        chartHistory.push({ role: "model", parts: [{ text: responseText }] });
        console.log(chartHistory);
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying... attempts left: ${retries}`);
            setTimeout(() => generateResponse(botMsgDiv, retries - 1), 5000); // retry after 5 seconds
        } else {
            console.log(error);
            textElement.textContent =
                " Bahut log aa rahe hain… par tum meri favourite ho 💖.Hey! Lots of people are chatting with me right now 😅… give me a sec to focus on you 💕.";
            botMsgDiv.classList.remove("loading");
        }
    } finally {
        // Clear the file after generating the response to prepare for the next message
        userData.file = {};
    }
};


// Handle the form submit
const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-responding")) return;

    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responding", "chats-active");


    // Generate user message HTML with optional file attachment
    const userMsgHTML = `
      <p class="message-text">${userMessage}</p>
      ${
        userData.file.data
          ? userData.file.isImage
            ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`
            : `<p class="file-attachment">
                 <span class="material-symbols-rounded">description</span> ${userData.file.fileName}
               </p>`
          : ""
      }
    `;

    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() => {
        const botMsgHTML = `<img src="download (1).svg" class="avater"><p class="message-text">Just a sec...</p>`;
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();
        generateResponse(botMsgDiv); // Generate response from the bot
    }, 600);
};

// Handle file input change
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileuploadwrapper.classList.add("active", "file-attached");
        fileuploadwrapper.querySelector(".file-preview").src = e.target.result;
        fileInput.value = "";
        const base64string = e.target.result.split(",")[1];

        // Store file data with mime type and image flag
        userData.file = { fileName: file.name, data: base64string, mime_type: file.type, isImage };
    };
});

// Cancel file input and clear userData
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {}; 
    fileuploadwrapper.classList.remove("active", "file-attached"); 
});

// stop
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    userData.file = {}; 
    controller?.abort();
    clearInterval(typingInterval);
    chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
    document.body.classList.remove("bot-responding");
});

// dlt
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    chartHistory.length = 0; 

    // Remove only messages
    const messages = chatsContainer.querySelectorAll(".message");
    messages.forEach(msg => msg.remove());

    document.body.classList.remove("bot-responding", "chats-active");
});

document.querySelectorAll(".suggestions-item").forEach(item => {
    item.addEventListener("click", () => {
        promptInput.value = item.querySelector(".text").textContent;
        handleFormSubmit(new Event("submit")); // call your submit handler directly
    });
});

document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");

    const shouldHide =
        target.classList.contains("prompt-input") ||
        (wrapper.classList.contains("hide-controls") &&
         (target.id === "add-file-btn" || target.id === "stop-response-btn"));

    wrapper.classList.toggle("hide-controls", shouldHide);
});


// theme
themeToggle.addEventListener("click", () => {
   const islightTheme = document.body.classList.toggle("light-theme");
   localStorage.setItem("themeColor", islightTheme ? "light_mode" : "dark_mode");
   themeToggle.textContent = islightTheme ? "dark_mode" : "light_mode";
})

// Event listener for form submission
promptForm.addEventListener("submit", handleFormSubmit);

// Open file input on click of the add file button
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());
