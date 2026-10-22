document.addEventListener("DOMContentLoaded", () => {
  const navigation = document.querySelector("#mainNavigation");

  if (!navigation || typeof bootstrap === "undefined") {
    return;
  }

  const collapse = bootstrap.Collapse.getOrCreateInstance(navigation, {
    toggle: false,
  });

  navigation.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 991.98px)").matches) {
        collapse.hide();
      }
    });
  });
});