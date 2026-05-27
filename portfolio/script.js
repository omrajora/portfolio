const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const savedTheme = localStorage.getItem("theme");

if (savedTheme) {
  root.dataset.theme = savedTheme;
}

themeToggle.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = nextTheme;
  localStorage.setItem("theme", nextTheme);
});

document.querySelector("#year").textContent =
  new Date().getFullYear();

// smooth reveal animation
const cards = document.querySelectorAll(".project-card, .skill-list div");

window.addEventListener("scroll", () => {
  cards.forEach((card) => {
    const cardTop = card.getBoundingClientRect().top;

    if (cardTop < window.innerHeight - 100) {
      card.style.opacity = "1";
      card.style.transform = "translateY(0px)";
    }
  });
});

cards.forEach((card) => {
  card.style.opacity = "0";
  card.style.transform = "translateY(30px)";
  card.style.transition = "all 0.6s ease";
});
// Typing Animation

const typingElement = document.querySelector(".typing-text");

const texts = [
  "Full-Stack Developer",
  "C++ Programmer",
];

let textIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeEffect() {
  const currentText = texts[textIndex];

  if (!isDeleting) {
    typingElement.textContent = currentText.substring(0, charIndex++);
  } else {
    typingElement.textContent = currentText.substring(0, charIndex--);
  }

  let speed = isDeleting ? 50 : 100;

  if (!isDeleting && charIndex === currentText.length + 1) {
    speed = 1500;
    isDeleting = true;
  }

  if (isDeleting && charIndex === 0) {
    isDeleting = false;
    textIndex = (textIndex + 1) % texts.length;
  }

  setTimeout(typeEffect, speed);
}

typeEffect();
